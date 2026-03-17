import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, model, baseUrl, requestBody, responseBody, logs, userQuestion } = await req.json();

    // Priority: Request Param > Environment Variable > Default
    const finalUrl = baseUrl || process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1/messages";
    const finalKey = apiKey || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_API_KEY;
    const finalModel = model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";

    if (!finalKey && !finalUrl.includes("localhost") && finalKey !== "no-key") {
      return Response.json({ error: "Missing API key. Please configure it in Settings or set ANTHROPIC_AUTH_TOKEN." }, { status: 400 });
    }

    // Build context string from logs
    const logContext = Object.entries(logs as Record<string, Array<{ level: string; message: string; raw: string }>>)
      .map(([src, entries]) => {
        if (!entries?.length) return null;
        const lines = entries.map(e => `[${e.level}] ${e.raw.slice(0, 600)}`).join("\n");
        return `\n=== ${src.toUpperCase()} 日志 ===\n${lines}`;
      })
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `你是一个高级的CRM系统后端日志分析专家，专门负责分析 BOP/BSSP/SAC/TE 电信系统的业务日志，排查接口调用链中的问题。
你擅长：
- 从请求/响应报文和日志中定位接口调用失败的根本原因
- 识别数据库错误(如ORA-xxxxx)、SAP接口错误、超时等
- 分析事务流水(txId/accept_id)的完整调用链路
- 以简洁专业的中文输出分析结论，用Markdown格式排版

请系统地分析提供的上下文，格式化输出以下内容：
1. **问题总结** (1-2句)
2. **调用链路追踪** (分析 BOP → BSSP → SAC → TE 的流转，标记每个节点状态)
3. **根本原因** (重点)
4. **关键日志证据** (用\`代码块\`引用关键日志行)
5. **建议处理方式**`;

    const userContent = `
## 请求报文
\`\`\`xml
${(requestBody || "（无）").slice(0, 3000)}
\`\`\`

## 响应报文
\`\`\`xml
${(responseBody || "（无）").slice(0, 2000)}
\`\`\`

## 系统日志
${logContext || "（未获取到日志）"}

---
${userQuestion ? `## 用户追加问题\n${userQuestion}` : "请根据以上信息分析这次接口调用的情况，找出问题所在。"}
`;

    const isAnthropic = finalUrl.toLowerCase().includes("anthropic.com");

    const fetchHeaders: Record<string, string> = {
      "content-type": "application/json",
    };

    let fetchBody: any = {};

    if (isAnthropic) {
      fetchHeaders["x-api-key"] = finalKey;
      fetchHeaders["anthropic-version"] = "2023-06-01";
      fetchBody = {
        model: finalModel,
        max_tokens: 2048,
        stream: true,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      };
    } else {
      // OpenAI-compatible format (GLM-5, local LLMs, etc.)
      if (finalKey && finalKey !== "no-key") {
        fetchHeaders["Authorization"] = `Bearer ${finalKey}`;
      }
      fetchBody = {
        model: finalModel,
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
      };
    }

    const aiRes = await fetch(finalUrl, {
      method: "POST",
      headers: fetchHeaders,
      body: JSON.stringify(fetchBody),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return Response.json({ error: `AI API error: ${aiRes.status} — ${err}` }, { status: 502 });
    }

    // Forward the SSE stream directly
    return new Response(aiRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
