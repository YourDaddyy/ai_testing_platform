"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wand2, WrapText } from "lucide-react";
import { useState } from "react";

// Monaco Editor loaded dynamically — no SSR
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => <p className="text-xs text-muted-foreground p-2">Loading editor...</p> }
);

interface BodyEditorProps {
  language?: "xml" | "json";
}

/**
 * Pure string-based XML formatter — does NOT use DOMParser/XMLSerializer.
 * Safe for GBK content; won't inject namespace declarations.
 */
function prettifyXml(xml: string): string {
  try {
    // Collapse all whitespace between tags
    const str = xml.trim().replace(/>\s+</g, "><");

    const lines: string[] = [];
    let indentLevel = 0;
    const INDENT = "  ";

    // Tokenise: split on tag boundaries
    const tokens = str.match(/(<[^>]+>|[^<]+)/g) ?? [];

    for (const token of tokens) {
      const trimmed = token.trim();
      if (!trimmed) continue;

      // XML declaration / processing instruction — no indent change
      if (trimmed.startsWith("<?") || trimmed.startsWith("<!")) {
        lines.push(INDENT.repeat(indentLevel) + trimmed);
        continue;
      }

      // Closing tag: dedent first, then push
      if (trimmed.startsWith("</")) {
        indentLevel = Math.max(0, indentLevel - 1);
        lines.push(INDENT.repeat(indentLevel) + trimmed);
        continue;
      }

      // Self-closing tag
      if (trimmed.endsWith("/>")) {
        lines.push(INDENT.repeat(indentLevel) + trimmed);
        continue;
      }

      // Opening tag
      if (trimmed.startsWith("<")) {
        lines.push(INDENT.repeat(indentLevel) + trimmed);
        indentLevel += 1;
        continue;
      }

      // Text content
      lines.push(INDENT.repeat(indentLevel) + trimmed);
    }

    // Collapse <tag>\n  text\n</tag> → <tag>text</tag>
    const result: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      const curr = lines[i].trimStart();
      const next = lines[i + 1]?.trimStart() ?? "";
      const afterNext = lines[i + 2]?.trimStart() ?? "";

      if (
        curr.startsWith("<") && !curr.startsWith("</") && !curr.startsWith("<?") &&
        !curr.endsWith("/>") &&
        !next.startsWith("<") &&
        afterNext.startsWith("</")
      ) {
        const indent = lines[i].match(/^(\s*)/)?.[1] ?? "";
        result.push(`${indent}${curr}${next}${afterNext.trim()}`);
        i += 2;
      } else {
        result.push(lines[i]);
      }
    }

    return result.join("\n").trim();
  } catch {
    return xml;
  }
}

import { useHttpStore } from "@/store/useHttpStore";

interface BodyEditorProps {
  language?: "xml" | "json";
}

export function BodyEditor({ language = "xml" }: BodyEditorProps) {
  const [wordWrap, setWordWrap] = useState<"on" | "off">("on");
  const { theme } = useTheme();
  const { body, encoding, setBody, setEncoding } = useHttpStore();

  const editorTheme = (theme === "dark" || theme === "midnight") ? "vs-dark" : "light";

  const handleFormat = () => {
    if (language === "xml") {
      setBody(prettifyXml(body));
    } else {
      try {
        setBody(JSON.stringify(JSON.parse(body), null, 2));
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Request Body</span>
        <div className="flex items-center gap-1.5">
          {/* Encoding switcher */}
          <div className="flex border rounded-md overflow-hidden text-xs">
            {(["UTF-8", "GBK"] as const).map((enc) => (
              <button
                key={enc}
                onClick={() => setEncoding(enc)}
                className={`px-2 py-1 transition-colors ${
                  encoding === enc
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {enc}
              </button>
            ))}
          </div>

          {/* Word-wrap toggle */}
          <Button
            size="sm"
            variant={wordWrap === "on" ? "secondary" : "outline"}
            onClick={() => setWordWrap(wordWrap === "on" ? "off" : "on")}
            className="h-7 text-xs px-2"
            title={wordWrap === "on" ? "Disable word wrap" : "Enable word wrap"}
          >
            <WrapText className="w-3 h-3" />
          </Button>

          {/* Format / prettify */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleFormat}
            className="h-7 text-xs"
          >
            <Wand2 className="w-3 h-3 mr-1" /> Format
          </Button>

          <Badge variant="secondary" className="text-xs">
            {language.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="flex-1 border rounded-md overflow-hidden min-h-[200px]">
        <MonacoEditor
          height="100%"
          language={language}
          value={body}
          onChange={(v) => setBody(v ?? "")}
          theme={editorTheme}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: "JetBrains Mono, Fira Code, monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap,
            automaticLayout: true,
            padding: { top: 8, bottom: 8 },
            folding: true,
          }}
        />
      </div>
    </div>
  );
}
