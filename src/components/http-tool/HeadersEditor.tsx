"use client";

import { useState } from "react";
import { HttpHeader } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useHttpStore } from "@/store/useHttpStore";

export function HeadersEditor() {
  const { headers, setHeaders } = useHttpStore();

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "", enabled: true }]);
  };

  const updateHeader = (
    index: number,
    field: keyof HttpHeader,
    value: string | boolean
  ) => {
    const updated = headers.map((h, i) =>
      i === index ? { ...h, [field]: value } : h
    );
    setHeaders(updated);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">
          Headers{" "}
          {headers.filter((h) => h.enabled && h.key).length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {headers.filter((h) => h.enabled && h.key).length}
            </Badge>
          )}
        </span>
        <Button size="sm" variant="outline" onClick={addHeader}>
          <Plus className="w-3 h-3 mr-1" /> Add Header
        </Button>
      </div>

      {headers.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No headers. Click "Add Header" to add one.
        </p>
      )}

      {headers.map((header, index) => (
        <div key={index} className="flex gap-2 items-center">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border accent-primary shrink-0"
            checked={header.enabled}
            onChange={(e) => updateHeader(index, "enabled", e.target.checked)}
          />
          <Input
            placeholder="Key"
            value={header.key}
            className="flex-1 h-8 text-sm font-mono"
            onChange={(e) => updateHeader(index, "key", e.target.value)}
          />
          <Input
            placeholder="Value"
            value={header.value}
            className="flex-1 h-8 text-sm font-mono"
            onChange={(e) => updateHeader(index, "value", e.target.value)}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
            onClick={() => removeHeader(index)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
