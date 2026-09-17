import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LineChart, ScrollText } from "lucide-react";

import { PortfolioTab } from "@/components/portfolio-tab";
import { LogsTab } from "@/components/logs-tab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: App,
});

type TabId = "portfolio" | "logs";

function App() {
  const [tab, setTab] = useState<TabId>("portfolio");
  const [ver, setVer] = useState<2 | 3 | 4>(4);

  const cycleVer = () => setVer((v) => (v === 4 ? 2 : v === 2 ? 3 : 4));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header
        className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <img src="/app-icon.png" alt="" width={32} height={32} className="rounded" />
          <div>
            <div className="text-sm font-semibold leading-tight">
              Alpaca Trade Statistics
            </div>
            <div className="text-xs text-muted-foreground">
              Portafogli & log operativi
            </div>
          </div>
          <button
            onClick={cycleVer}
            className="ml-auto rounded-md border px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-accent"
            title="Cambia versione API"
          >
            v{ver}
          </button>
        </div>
      </header>

      <main
        className="mx-auto max-w-2xl px-4 py-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
      >
        {tab === "portfolio" ? <PortfolioTab ver={ver} /> : <LogsTab ver={ver} />}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-2xl">
          <TabButton
            active={tab === "portfolio"}
            onClick={() => setTab("portfolio")}
            label="Portafogli"
            icon={<LineChart className="h-5 w-5" />}
          />
          <TabButton
            active={tab === "logs"}
            onClick={() => setTab("logs")}
            label="Log"
            icon={<ScrollText className="h-5 w-5" />}
          />
        </div>
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span className={cn(active && "font-semibold")}>{label}</span>
    </button>
  );
}
