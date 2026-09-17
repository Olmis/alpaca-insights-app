import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, ArrowDownUp, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import { fetchLogs } from "@/lib/trade-api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function levelClass(level: string) {
  const l = level.toUpperCase();
  if (l === "ERROR" || l === "CRITICAL")
    return "bg-red-500/15 text-red-600 border-red-500/30";
  if (l === "WARNING" || l === "WARN")
    return "bg-amber-500/15 text-amber-600 border-amber-500/30";
  if (l === "INFO") return "bg-blue-500/15 text-blue-600 border-blue-500/30";
  return "bg-muted text-muted-foreground border-border";
}

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    toast.success("Log copiato negli appunti");
  } catch {
    toast.error("Impossibile copiare");
  }
}

export function LogsTab({ ver }: { ver: number }) {
  const fetchFn = useServerFn(fetchLogs);
  const [dataInizio, setDataInizio] = useState("");
  const [dataFine, setDataFine] = useState("");
  const [cerca, setCerca] = useState("");
  const [filters, setFilters] = useState<{
    data_inizio?: string;
    data_fine?: string;
    cerca?: string;
  }>({});
  const [desc, setDesc] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [hiddenLevels, setHiddenLevels] = useState<Record<string, boolean>>({});

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["logs", ver, filters],
    queryFn: () => fetchFn({ data: { ...filters, ver } }),
  });

  const rows = data?.risposta ?? [];
  const apiErrors = data?.error ?? [];

  const levels = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r[1]);
    return Array.from(set).sort();
  }, [rows]);

  const sorted = useMemo(() => {
    const copy = rows.filter((r) => !hiddenLevels[r[1]]);
    copy.sort((a, b) => a[0].localeCompare(b[0]));
    if (desc) copy.reverse();
    return copy;
  }, [rows, desc, hiddenLevels]);

  const apply = () => {
    setFilters({
      data_inizio: dataInizio || undefined,
      data_fine: dataFine || undefined,
      cerca: cerca || undefined,
    });
    setFilterOpen(false);
  };
  const reset = () => {
    setDataInizio("");
    setDataFine("");
    setCerca("");
    setFilters({});
  };

  const activeFilterCount =
    (filters.data_inizio ? 1 : 0) +
    (filters.data_fine ? 1 : 0) +
    (filters.cerca ? 1 : 0);

  // Long-press to copy
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressedRef = useRef(false);
  const startPress = (text: string) => {
    pressedRef.current = false;
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      pressedRef.current = true;
      copyText(text);
    }, 500);
  };
  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Log</h1>
        <div className="flex gap-2">
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="ml-2">
                  Filtri{activeFilterCount ? ` (${activeFilterCount})` : ""}
                </span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Filtri</SheetTitle>
              </SheetHeader>
              <div className="mt-4 grid grid-cols-2 gap-2 px-4">
                <div>
                  <Label htmlFor="li" className="text-xs">
                    Data inizio
                  </Label>
                  <Input
                    id="li"
                    type="date"
                    value={dataInizio}
                    onChange={(e) => setDataInizio(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="lf" className="text-xs">
                    Data fine
                  </Label>
                  <Input
                    id="lf"
                    type="date"
                    value={dataFine}
                    onChange={(e) => setDataFine(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-2 px-4">
                <Label htmlFor="lc" className="text-xs">
                  Cerca
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="lc"
                    className="pl-8"
                    placeholder="Testo da cercare…"
                    value={cerca}
                    onChange={(e) => setCerca(e.target.value)}
                  />
                </div>
              </div>
              <SheetFooter className="mt-4 flex-row gap-2">
                <Button size="sm" onClick={apply} className="flex-1">
                  Applica
                </Button>
                <Button size="sm" variant="outline" onClick={reset}>
                  Reset
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDesc((v) => !v)}
            title="Inverti ordine"
          >
            <ArrowDownUp className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Sticky level filter — always visible */}
      <div
        className="sticky z-30 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur"
        style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}
      >
        <div className="flex flex-wrap gap-1.5">
          {levels.length === 0 && (
            <span className="text-xs text-muted-foreground">
              Nessun tipo di evento.
            </span>
          )}
          {levels.map((lv) => {
            const active = !hiddenLevels[lv];
            return (
              <button
                key={lv}
                onClick={() =>
                  setHiddenLevels((prev) => ({ ...prev, [lv]: !prev[lv] }))
                }
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase transition-opacity",
                  levelClass(lv),
                  !active && "opacity-30",
                )}
                title={active ? `Nascondi ${lv}` : `Mostra ${lv}`}
              >
                {lv}
              </button>
            );
          })}
        </div>
      </div>

      {(apiErrors.length > 0 || error) && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="font-medium">Errore dal server:</div>
          <ul className="mt-1 list-disc pl-4">
            {error && <li>{(error as Error).message}</li>}
            {apiErrors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {sorted.length === 0 && !isFetching && (
          <div className="text-sm text-muted-foreground">Nessun log.</div>
        )}
        {sorted.map(([when, level, msg], i) => {
          const full = `${when}\t${level}\t${msg}`;
          return (
            <Card
              key={i}
              className="p-2 select-none"
              style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
              onTouchStart={() => startPress(full)}
              onTouchEnd={cancelPress}
              onTouchMove={cancelPress}
              onTouchCancel={cancelPress}
              onMouseDown={() => startPress(full)}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onContextMenu={(e) => {
                e.preventDefault();
                copyText(full);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {when}
                </span>
                <span
                  className={cn(
                    "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                    levelClass(level),
                  )}
                >
                  {level}
                </span>
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words text-sm">
                {msg}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
