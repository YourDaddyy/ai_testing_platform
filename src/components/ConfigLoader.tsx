"use client";
import { useEffect } from "react";
import { useConfigStore } from "@/store/useConfigStore";

export function ConfigLoader() {
  const loadConfig = useConfigStore((s) => s.loadConfig);
  useEffect(() => {
    loadConfig();
  }, []);
  return null;
}
