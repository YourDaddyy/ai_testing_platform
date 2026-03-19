import { NextRequest } from "next/server";
import { buildAILogContext } from "@/lib/logProcessor";
import { LogEntry } from "../logs/route";

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

    // Build context string from logs using the optimized Log Cleaning Engine
    // Flatten and sort by timestamp to match frontend timeline indexing
    const rawLogs = logs as Record<string, LogEntry[]>;
    const flattenedLogs = Object.values(rawLogs)
      .flat()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const logContext = buildAILogContext(flattenedLogs);

    const systemPrompt = `你是一个专业的 CRM 系统技术支持专家，擅长通过分析系统日志、请求报文和响应报文来定位复杂的业务故障。

当用户提供日志和报文时，请按以下结构输出分析报告：

1. **故障初步结论 (Problem Summary)**: 
   - 用一句话描述发生了什么问题（如：下单接口返回互斥错误）。
   - **可视化调用链**: 请使用 Mermaid 流程图描述涉及的系统调用关系，并用红色标出最后出现故障或报错的节点。
   - **Mermaid 规范 (必须严格遵守)**: 
     1. 节点标签必须使用双引号包裹，例如: BSSP["BSSP 核心"]。
     2. 避免在标签中使用括号、单引号或特殊符号。
     3. 失败点示例: style BSSP fill:#f96,stroke:#333。
     \`\`\`mermaid
     graph LR
       BOP["BOP 前端"] --> BSSP["BSSP 核心"]
       BSSP -- "失败" --> SAC["SAC 鉴权"]
       style BSSP fill:#f96,stroke:#333
     \`\`\`

2. **核心证据链 (Evidence & Analysis)**:
   - 详细说明定位过程。
   - **关键规则**: 提供的日志每行都有一个索引号(如 [#12])。**你必须**在引用任何日志证据时，使用 \`[Log #12]\` 的格式引用。点击该引用应能直接跳转到左侧对应日志。例如: "系统在 [#45] 行记录了数据库超时，这直接导致了 [#46] 行的业务回滚。"

3. **根本原因分析 (Root Cause)**:
   - 深入分析导致问题的代码逻辑、配置问题或第三方依赖问题。

4. **建议修复方案 (Recommendations)**:
   - 给出具体的修复步骤、参数调整建议或进一步排查方案。

请保持专业、简洁且以客观证据为准。`;

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
