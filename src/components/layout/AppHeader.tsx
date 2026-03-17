"use client";

import { useState, useEffect } from "react";

import { useLang } from "@/lib/i18n";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages, Sun, Moon, Sunset } from "lucide-react";
import { useConfigStore } from "@/store/useConfigStore";

const THEMES = [
  { value: "light", label: "浅色", labelEn: "Light", icon: Sun },
  { value: "dark", label: "暗色", labelEn: "Dark", icon: Moon },
  { value: "midnight", label: "午夜", labelEn: "Midnight", icon: Sunset },
] as const;

export function AppHeader() {
  const { lang, setLang, t } = useLang();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // M5 config state
  const { environments, activeEnvId, setActiveEnvId } = useConfigStore();
  const activeEnv = environments.find(e => e.id === activeEnvId) || environments[0];

  const toggleLang = () => setLang(lang === "zh" ? "en" : "zh");

  // Prevent hydration mismatch by not rendering theme-dependent parts until mounted
  if (!mounted) {
    return (
      <header className="flex h-14 items-center gap-4 border-b w-full bg-muted/20 px-4 lg:h-[60px] lg:px-6 shrink-0 z-10 sticky top-0">
        <div className="flex flex-1 items-center justify-between gap-4">
          <h1 className="text-sm font-semibold tracking-tight text-muted-foreground">
            CRM AI Platform
          </h1>
        </div>
      </header>
    );
  }

  const currentTheme = THEMES.find((t) => t.value === theme) ?? THEMES[1];
  const ThemeIcon = currentTheme.icon;

  return (
    <header className="flex h-14 items-center gap-4 border-b w-full bg-muted/20 px-4 lg:h-[60px] lg:px-6 shrink-0 z-10 sticky top-0">
      <div className="flex flex-1 items-center justify-between gap-4">
        <h1 className="text-sm font-semibold tracking-tight text-muted-foreground">
          CRM AI Platform
        </h1>

        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLang}
            className="gap-1.5 h-8 text-xs font-semibold"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "zh" ? "EN" : "中文"}
          </Button>

          {/* Theme switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-semibold hover:bg-accent hover:text-accent-foreground transition-colors">
              <ThemeIcon className="h-3.5 w-3.5" />
              {lang === "zh" ? currentTheme.label : currentTheme.labelEn}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {THEMES.map(({ value, label, labelEn, icon: Icon }) => (
                <DropdownMenuItem
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`gap-2 ${theme === value ? "font-bold" : ""}`}
                >
                  <Icon className="h-4 w-4" />
                  {lang === "zh" ? label : labelEn}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Environment Switcher */}
          <DropdownMenu>
            {/* @ts-expect-error Radix UI asChild type incompatibility with React 19 / newer TS */}
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 cursor-pointer hover:bg-muted px-3 h-8 rounded-md transition-colors border text-sm bg-background select-none outline-none">
                <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <span className="font-semibold">{activeEnv?.name || "未知环境"}</span>
                <span className="text-xs text-muted-foreground ml-1">▼</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              {environments.map((env) => (
                <DropdownMenuItem
                  key={env.id}
                  onClick={() => setActiveEnvId(env.id)}
                  className={`gap-2 cursor-pointer ${activeEnvId === env.id ? "font-bold" : ""}`}
                >
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      activeEnvId === env.id ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                  {env.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
