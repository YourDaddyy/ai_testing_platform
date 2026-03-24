"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { Activity, Code, Settings, Server, FileText, Terminal } from "lucide-react";

export function AppSidebar() {
  const { t } = useLang();

  const navItems = [
    { href: "/", icon: Code, label: t("nav_http") },
    { href: "/logs", icon: FileText, label: t("nav_logs") },
    { href: "/ai", icon: Activity, label: t("nav_ai") },
    { href: "/remote-control", icon: Terminal, label: t("nav_remote") },
    { href: "/config", icon: Settings, label: t("nav_config") },
  ];

  return (
    <aside className="w-60 border-r bg-muted/20 flex flex-col h-screen shrink-0 z-20 relative">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 font-semibold gap-2">
        <Server className="h-5 w-5 text-primary" />
        <span className="tracking-tight">CRM DevPlatform</span>
      </div>
      <nav className="flex flex-col px-2 py-4 gap-1">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:text-primary hover:bg-muted"
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
