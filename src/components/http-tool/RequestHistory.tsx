"use client";

import { HttpRequest } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, Clock, ChevronRight } from "lucide-react";
import { deleteRequest } from "@/lib/requestHistory";
import { Badge } from "@/components/ui/badge";

interface RequestHistoryProps {
  history: HttpRequest[];
  onSelect: (req: HttpRequest) => void;
  onDelete: (id: string) => void;
  selectedId?: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "text-green-400",
  POST: "text-blue-400",
  PUT: "text-yellow-400",
  DELETE: "text-red-400",
  PATCH: "text-purple-400",
};

export function RequestHistory({
  history,
  onSelect,
  onDelete,
  selectedId,
}: RequestHistoryProps) {
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteRequest(id);
    onDelete(id);
  };

  if (history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-6">
        No saved requests yet.
      </p>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-1 p-1">
        {history.map((req) => (
          <div
            key={req.id}
            onClick={() => onSelect(req)}
            className={`group flex items-center gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors hover:bg-muted ${
              selectedId === req.id ? "bg-muted ring-1 ring-primary/40" : ""
            }`}
          >
            <span
              className={`text-xs font-bold font-mono w-12 shrink-0 ${
                METHOD_COLORS[req.method] ?? "text-muted-foreground"
              }`}
            >
              {req.method}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {req.name || req.url}
              </p>
              <p className="text-xs text-muted-foreground truncate">{req.url}</p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
              onClick={(e) => handleDelete(e, req.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
