import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, ArrowDownUp, Search } from "lucide-react";

import { fetchLogs } from "@/lib/trade-api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
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

export function LogsTab() {
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

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["logs", filters],
    queryFn: () => fetchFn({ data: filters }),
  });

  const rows = data?.risposta ?? [];
  const apiErrors = data?.error ?? [];

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => a[0].localeCompare(b[0]));
    if (desc) copy.reverse();
    return copy;
  }, [rows, desc]);

  const apply = () =>
    setFilters({
      data_inizio: dataInizio || undefined,
      data_fine: dataFine || undefined,
      cerca: cerca || undefined,
    });
  const reset = () => {
    setDataInizio("");
    setDataFine("");
    setCerca("");
    setFilters({});
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Log</h1>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDesc((v) => !v)}
            title="Inverti ordine"
          >
            <ArrowDownUp className="h-4 w-4" />
            <span className="ml-2">{desc ? "Recenti" : "Vecchi"}</span>
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

      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2">
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
        <div className="mt-2">
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
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={apply} className="flex-1">
            Applica
          </Button>
          <Button size="sm" variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </Card>

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
        {sorted.map(([when, level, msg], i) => (
          <Card key={i} className="p-2">
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
        ))}
      </div>
    </div>
  );
}
