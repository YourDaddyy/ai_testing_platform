import { NextRequest, NextResponse } from "next/server";
import { NodeSSH } from "node-ssh";
import path from "path";
import iconv from 'iconv-lite';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      host, 
      port = 22, 
      username, 
      password = "", 
      scriptPath, 
      args = [],
      usePipedInputs = false
    } = body;

    if (!host || !username || !scriptPath) {
      return NextResponse.json(
        { success: false, error: "Host, username, and script path are required" },
        { status: 400 }
      );
    }

    const ssh = new NodeSSH();

    try {
      await ssh.connect({
        host,
        port: parseInt(port.toString()),
        username,
        password,
        readyTimeout: 20000,
        hostVerifier: () => true,
      });

      // Construct the command
      const scriptDir = path.dirname(scriptPath);
      const scriptName = path.basename(scriptPath);
      
      let fullCommand: string;
      
      if (usePipedInputs && args.length > 0) {
        // Build a robust subshell with delays to simulate human entry
        // This prevents the script from consuming EOLs too fast and looping
        const inputParts = args.map((arg: string, idx: number) => {
          const escaped = arg.replace(/"/g, '\\"');
          // Important: Delay after each input. 
          // Use a long delay (60s) after the 2nd argument (usually the restart action)
          const delay = (idx === 1) ? "sleep 60" : "sleep 2"; 
          return `echo "${escaped}"; ${delay}`;
        });
        
        // Final sequence includes extra enters and exit commands
        const subshell = `{ ${inputParts.join("; ")}; echo ""; sleep 1; echo "q"; sleep 1; echo "q"; }`;
        fullCommand = `${subshell} | (cd "${scriptDir}" && export TERM=xterm && ./"${scriptName}")`;
      } else {
        // Standard argument passing
        const escapedArgs = args.map((arg: string) => `"${arg.replace(/"/g, '\\"')}"`).join(" ");
        fullCommand = `cd "${scriptDir}" && export TERM=xterm && ./"${scriptName}" ${escapedArgs}`;
      }
      
      // Execute in a login shell to ensure .bash_profile / PATH are loaded
      const timedCommand = `timeout 180s bash -l -c '${fullCommand.replace(/'/g, "'\\''")}'`;
      
      console.log(`Executing remote command: ${timedCommand} on ${host}`);

      let fullStdout = "";
      let fullStderr = "";
      let isEarlyExit = false;

      // Use a lower-level exec to have more control over the stream and closing early
      const result = await new Promise<{stdout: string, stderr: string, code: number | null, timedOut?: boolean}>((resolve) => {
        // Fallback timer: if pattern not found in 90s, stop and report error
        const fallbackTimer = setTimeout(() => {
          if (!isEarlyExit) {
            isEarlyExit = true;
            ssh.dispose();
            resolve({ 
              stdout: fullStdout + "\n[ERROR] Wait Pattern Timeout (90s exceeded without completion marker)", 
              stderr: fullStderr, 
              code: 1,
              timedOut: true
            });
          }
        }, 90000);

        ssh.exec(timedCommand, [], {
          onStdout: (chunk) => {
            const text = Buffer.isBuffer(chunk) ? iconv.decode(chunk, 'gbk') : (chunk as any).toString();
            fullStdout += text;
            
            // Detect completion pattern to exit early and improve UX
            // Only search for "请按任意键继续" as requested
            if (!isEarlyExit && fullStdout.includes("请按任意键继续")) {
              isEarlyExit = true;
              clearTimeout(fallbackTimer);
              // Wait for 2 seconds before closing
              setTimeout(() => {
                ssh.dispose();
                resolve({ stdout: fullStdout, stderr: fullStderr, code: 0 });
              }, 2000);
            }
          },
          onStderr: (chunk) => {
            const text = Buffer.isBuffer(chunk) ? iconv.decode(chunk, 'gbk') : (chunk as any).toString();
            fullStderr += text;
          }
        }).then((channel: any) => {
          channel.on('close', (code: number) => {
            if (!isEarlyExit) {
              clearTimeout(fallbackTimer);
              resolve({ stdout: fullStdout, stderr: fullStderr, code });
            }
          });
          channel.on('error', (err: any) => {
            if (!isEarlyExit) {
              clearTimeout(fallbackTimer);
              console.error("SSH Channel Error:", err);
              resolve({ stdout: fullStdout, stderr: fullStderr, code: 1 });
            }
          });
        }).catch(err => {
          if (!isEarlyExit) {
            clearTimeout(fallbackTimer);
            console.error("SSH Exec Error:", err);
            resolve({ stdout: fullStdout, stderr: fullStderr, code: 1 });
          }
        });
      });

      return NextResponse.json({
        success: result.code === 0 && !result.timedOut,
        output: result.stdout,
        errorOutput: result.stderr,
        exitCode: result.code,
        command: fullCommand
      });

    } catch (err: any) {
      console.error("SSH Execution Error:", err);
      return NextResponse.json({ 
        success: false, 
        error: err.message || "Execution failed. Please check host connectivity and script permissions." 
      });
    } finally {
      ssh.dispose();
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
