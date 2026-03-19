import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { LangProvider } from "@/lib/i18n";
import { ConfigLoader } from "@/components/ConfigLoader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM AI Platform",
  description: "Automated testing and APM platform for Telecom CRM services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex w-full bg-background antialiased overflow-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          themes={["light", "dark", "midnight"]}
          disableTransitionOnChange
        >
          <LangProvider>
          <ConfigLoader />
          <AppSidebar />
          <div className="flex flex-col flex-1 h-screen overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-hidden bg-background relative">
              {children}
            </main>
          </div>
          <Toaster richColors />
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
