import { NextRequest, NextResponse } from "next/server";
import iconv from "iconv-lite";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      url,
      method = "POST",
      headers: customHeaders = {},
      body: requestBody,
      encoding = "UTF-8",
    } = body;

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Prepare request headers
    const headers: Record<string, string> = {
      ...customHeaders,
    };

    // Encode body according to selected encoding
    let encodedBody: Buffer | string | undefined = undefined;
    if (requestBody) {
      if (encoding === "GBK") {
        encodedBody = iconv.encode(requestBody, "GBK");
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "text/xml; charset=GBK";
        }
      } else {
        encodedBody = requestBody;
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "text/xml; charset=UTF-8";
        }
      }
    }

    const startTime = Date.now();

    const response = await fetch(url, {
      method,
      headers,
      body: method !== "GET" && encodedBody
        ? (typeof encodedBody === "string" ? encodedBody : new Uint8Array(encodedBody))
        : undefined,
    });

    const duration = Date.now() - startTime;

    // Read response as buffer to handle different encodings
    const responseBuffer = Buffer.from(await response.arrayBuffer());

    // Detect encoding with a 3-tier strategy:
    // 1. Check XML declaration in the raw bytes (most reliable for BSSP/SAC responses)
    // 2. Check Content-Type header
    // 3. Fall back to the same encoding used for the request
    const rawSnippet = responseBuffer.slice(0, 200).toString("ascii");
    const xmlDeclMatch = rawSnippet.match(/encoding=["']([^"']+)["']/i);
    let responseEncoding = encoding; // default: mirror the request encoding

    if (xmlDeclMatch) {
      const declared = xmlDeclMatch[1].toUpperCase();
      if (declared.includes("GBK") || declared.includes("GB2312") || declared.includes("GB18030")) {
        responseEncoding = "GBK";
      } else if (declared.includes("UTF")) {
        responseEncoding = "UTF-8";
      }
    } else {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.toLowerCase().includes("gbk") || contentType.toLowerCase().includes("gb2312")) {
        responseEncoding = "GBK";
      } else if (contentType.toLowerCase().includes("utf-8") || contentType.toLowerCase().includes("utf8")) {
        responseEncoding = "UTF-8";
      }
    }

    // Decode response using detected encoding
    const responseText = iconv.decode(responseBuffer, responseEncoding);

    // Collect response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return NextResponse.json({
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseText,
      duration,
      size: responseBuffer.length,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      {
        error: err.message || "Unknown proxy error",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      { status: 500 }
    );
  }
}
