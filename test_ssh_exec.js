const { NodeSSH } = require('node-ssh');
const path = require('path');
const iconv = require('iconv-lite');

async function test() {
  const ssh = new NodeSSH();
  const host = "10.47.213.184";
  const username = "bossbm1";
  const password = "fmbs3_adm!";
  const scriptPath = "/bossapp1/bossbm1/testftp.sh";
  
  const scriptDir = "/bossapp1/bossbm1";
  const scriptName = "testftp.sh";

  try {
    console.log(`Connecting to ${host}...`);
    await ssh.connect({
      host,
      port: 22,
      username,
      password,
      readyTimeout: 20000,
      hostVerifier: () => true,
    });

    const cmd = `(echo "all_linux_23" && sleep 2 && echo "1" && sleep 5 && echo "q" && sleep 1 && echo "q") | (cd ${scriptDir} && export TERM=xterm && ./${scriptName})`;
    const finalCmd = `bash -l -c "${cmd.replace(/"/g, '\\"')}"`;

    console.log(`Executing with Dual-Timeout termination...`);
    
    let fullStdout = "";
    let isEarlyExit = false;

    await new Promise((resolve) => {
      // 60s fallback timer
      const fallbackTimer = setTimeout(() => {
        if (!isEarlyExit) {
          isEarlyExit = true;
          console.log("\n[TIMEOUT] 60s exceeded without completion marker! Closing with error.");
          ssh.dispose();
          resolve();
        }
      }, 60000);

      ssh.exec(finalCmd, [], {
        onStdout: (chunk) => {
          const text = iconv.decode(chunk, 'gbk');
          process.stdout.write(text);
          fullStdout += text;
          
          if (!isEarlyExit && fullStdout.includes("请按任意键继续......")) {
            isEarlyExit = true;
            clearTimeout(fallbackTimer);
            console.log("\n[MATCH] Pattern detected. Waiting 2s before close...");
            setTimeout(() => {
              ssh.dispose();
              resolve();
            }, 2000);
          }
        },
        onStderr: (chunk) => {
          process.stderr.write(iconv.decode(chunk, 'gbk'));
        }
      }).then(channel => {
        channel.on('close', () => {
          if (!isEarlyExit) {
            clearTimeout(fallbackTimer);
            resolve();
          }
        });
        channel.on('error', (err) => {
          if (!isEarlyExit) {
            clearTimeout(fallbackTimer);
            console.error("Channel Error:", err.message);
          }
          resolve();
        });
      }).catch(err => {
        if (!isEarlyExit) {
          clearTimeout(fallbackTimer);
          console.error("Exec Error:", err.message);
        }
        resolve();
      });
    });

    console.log("\n--- TEST COMPLETED ---");

  } catch (err) {
    if (!err.message.includes('disposed')) {
      console.error("ERROR:", err.message);
    }
  } finally {
    ssh.dispose();
  }
}

test();
