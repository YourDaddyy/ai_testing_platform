"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { HttpResponse } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, FileCode, Wand2, WrapText } from "lucide-react";

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <p className="p-2 text-xs text-muted-foreground">Loading...</p> }
);

interface ResponseViewerProps {
  response: HttpResponse | null;
  isLoading?: boolean;
}

function StatusBadge({ status }: { status: number }) {
  const color =
    status >= 200 && status < 300
      ? "text-green-400 border-green-600 bg-green-950"
      : status >= 400
      ? "text-red-400 border-red-600 bg-red-950"
      : "text-yellow-400 border-yellow-600 bg-yellow-950";
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-bold font-mono ${color}`}>
      {status}
    </span>
  );
}

function detectLanguage(body: string, headers: Record<string, string>): string {
  const ct = Object.entries(headers)
    .find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? "";
  if (ct.includes("json")) return "json";
  if (ct.includes("xml") || body.trimStart().startsWith("<")) return "xml";
  return "plaintext";
}

function formatXml(xml: string): string {
  try {
    let indent = 0;
    let formatted = "";
    const lines = xml.replace(/>\s*</g, ">\n<").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("</")) {
        indent = Math.max(0, indent - 1);
      }
      formatted += "  ".repeat(indent) + trimmed + "\n";
      if (
        !trimmed.startsWith("</") &&
        !trimmed.endsWith("/>") &&
        !trimmed.startsWith("<?") &&
        !trimmed.startsWith("<!--") &&
        !trimmed.includes("</")
      ) {
        indent++;
      }
    }
    return formatted.trim();
  } catch {
    return xml;
  }
}

function formatJson(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}

export function ResponseViewer({ response, isLoading }: ResponseViewerProps) {
  const { theme } = useTheme();
  const [wordWrap, setWordWrap] = useState<"on" | "off">("on");
  const [displayBody, setDisplayBody] = useState<string | null>(null);

  const handleFormat = useCallback(() => {
    if (!response) return;
    const lang = detectLanguage(response.body, response.headers);
    if (lang === "xml") {
      setDisplayBody(formatXml(response.body));
    } else if (lang === "json") {
      setDisplayBody(formatJson(response.body));
    }
  }, [response]);

  // Auto-format on new response
  useEffect(() => {
    if (response?.body) {
      handleFormat();
    } else {
      setDisplayBody(null);
    }
  }, [response?.body, handleFormat]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">Sending request...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground gap-2">
        <FileCode className="h-10 w-10 opacity-30" />
        <p className="text-sm">Send a request to see the response here</p>
      </div>
    );
  }

  const lang = detectLanguage(response.body, response.headers);
  const body = displayBody ?? response.body;

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-1 flex-wrap">
        <StatusBadge status={response.status} />
        <span className="text-xs text-muted-foreground">{response.statusText}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {response.duration}ms
        </span>
        <span className="text-xs text-muted-foreground">
          {(response.size / 1024).toFixed(1)} KB
        </span>
        <div className="flex items-center gap-1 ml-auto">
          {/* Format / pretty print */}
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px] gap-1 border-dashed"
            onClick={handleFormat}
            title="格式化/缩进"
          >
            <Wand2 className="h-3 w-3" />
            Format
          </Button>
          {/* Word-wrap toggle */}
          <Button
            variant={wordWrap === "on" ? "secondary" : "outline"}
            size="sm"
            className="h-6 px-2 text-[10px] gap-1 border-dashed"
            onClick={() => setWordWrap(w => w === "on" ? "off" : "on")}
            title="自动换行"
          >
            <WrapText className="h-3 w-3" />
            {wordWrap === "on" ? "Wrap On" : "Wrap Off"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="body" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-fit">
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="headers">
            Headers{" "}
            <Badge variant="secondary" className="ml-1 text-xs">
              {Object.keys(response.headers).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="body" className="flex-1 mt-2 overflow-hidden">
          <div className="h-full min-h-[200px] border rounded-md overflow-hidden">
            <MonacoEditor
              height="100%"
              language={lang}
              value={body}
              theme={(theme === "dark" || theme === "midnight") ? "vs-dark" : "light"}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "JetBrains Mono, Fira Code, monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap,
                automaticLayout: true,
                padding: { top: 8, bottom: 8 },
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="headers" className="mt-2">
          <ScrollArea className="h-[300px] border rounded-md p-3">
            <div className="space-y-1">
              {Object.entries(response.headers).map(([key, value]) => (
                <div key={key} className="flex gap-2 text-xs font-mono border-b pb-1">
                  <span className="text-primary font-semibold min-w-[200px]">{key}</span>
                  <span className="text-muted-foreground break-all">{value}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
