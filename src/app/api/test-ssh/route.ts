import { NextRequest, NextResponse } from "next/server";
import { NodeSSH } from "node-ssh";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { host, port, username, password } = body;

    if (!host || !username) {
      return NextResponse.json(
        { success: false, error: "Host and username are required" },
        { status: 400 }
      );
    }

    const ssh = new NodeSSH();

    try {
      await ssh.connect({
        host,
        port: parseInt(port || "22"),
        username,
        password: password || "",
        readyTimeout: 10000,
        hostVerifier: () => true, // Skipping host key verification for convenience in this internal tool
      });

      // If we reach here, connection was successful
      // We can also try a simple command to be sure
      await ssh.execCommand("ls -l /tmp");

      return NextResponse.json({ success: true });
    } catch (err: any) {
      console.error("SSH Test Error:", err);
      return NextResponse.json({ 
        success: false, 
        error: err.message || "Connection failed. Please check credentials and network connectivity." 
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
