import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  Brush,
} from "recharts";
import { RefreshCw, Maximize2, X, SlidersHorizontal } from "lucide-react";

import { fetchPortfolio, type PortfolioRow } from "@/lib/trade-api.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

type ChartPoint = { date: string } & Record<string, number | string>;

function buildChart(rows: PortfolioRow[]) {
  const markets = Array.from(new Set(rows.map((r) => r[1]))).sort();
  const byDate = new Map<string, ChartPoint>();
  for (const [date, market, rawValue] of rows) {
    const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
    if (!Number.isFinite(value)) continue;
    let p = byDate.get(date);
    if (!p) {
      p = { date };
      byDate.set(date, p);
    }
    p[market] = value;
  }
  const points = Array.from(byDate.values()).sort((a, b) =>
    (a.date as string).localeCompare(b.date as string),
  );
  const baselines: Record<string, number> = {};
  const lastValues: Record<string, number> = {};
  for (const m of markets) {
    const first = points.find((p) => typeof p[m] === "number");
    const last = [...points].reverse().find((p) => typeof p[m] === "number");
    if (first) baselines[m] = first[m] as number;
    if (last) lastValues[m] = last[m] as number;
  }
  return { markets, points, baselines, lastValues };
}

function ChartView({
  points,
  markets,
  baselines,
  visible,
  colors,
  withBrush,
  minWidthPx,
}: {
  points: ChartPoint[];
  markets: string[];
  baselines: Record<string, number>;
  visible: Record<string, boolean>;
  colors: Record<string, string>;
  withBrush?: boolean;
  minWidthPx?: number;
}) {
  const content = (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={20} />
        <YAxis tick={{ fontSize: 10 }} domain={[0, "auto"]} width={55} />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(v: unknown, name: string) => {
            const n = typeof v === "number" ? v : Number(v);
            return [Number.isFinite(n) ? `${n.toFixed(2)} $` : "—", name];
          }}
          labelFormatter={(l) => `Data: ${l}`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {markets.map(
          (m) =>
            visible[m] && (
              <ReferenceLine
                key={`base-${m}`}
                y={baselines[m]}
                stroke={colors[m]}
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
            ),
        )}
        {markets.map(
          (m) =>
            visible[m] && (
              <Line
                key={m}
                type="monotone"
                dataKey={m}
                stroke={colors[m]}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
                activeDot={{ r: 5 }}
              />
            ),
        )}
        {withBrush && (
          <Brush dataKey="date" height={28} stroke="#3b82f6" travellerWidth={12} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );

  if (minWidthPx) {
    return (
      <div className="h-full w-full overflow-x-auto">
        <div style={{ width: minWidthPx, height: "100%" }}>{content}</div>
      </div>
    );
  }
  return <div className="h-full w-full">{content}</div>;
}

export function PortfolioTab({ ver }: { ver: number }) {
  const fetchFn = useServerFn(fetchPortfolio);
  const [dataInizio, setDataInizio] = useState("");
  const [dataFine, setDataFine] = useState("");
  const [filters, setFilters] = useState<{ data_inizio?: string; data_fine?: string }>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["portfolio", ver, filters],
    queryFn: () => fetchFn({ data: { ...filters, ver } }),
  });

  const rows = data?.risposta ?? [];
  const apiErrors = data?.error ?? [];
  const { markets, points, baselines, lastValues } = useMemo(
    () => buildChart(rows),
    [rows],
  );

  useEffect(() => {
    if (markets.length === 0) return;
    setVisible((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const m of markets) {
        if (!(m in next)) {
          next[m] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [markets]);

  const colors = useMemo(() => {
    const map: Record<string, string> = {};
    markets.forEach((m, i) => (map[m] = COLORS[i % COLORS.length]));
    return map;
  }, [markets]);

  const applyFilter = () => {
    setFilters({
      data_inizio: dataInizio || undefined,
      data_fine: dataFine || undefined,
    });
    setFilterOpen(false);
  };
  const resetFilter = () => {
    setDataInizio("");
    setDataFine("");
    setFilters({});
  };

  const activeFilterCount =
    (filters.data_inizio ? 1 : 0) + (filters.data_fine ? 1 : 0);

  const openFullscreen = useCallback(async () => {
    setFullscreen(true);
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen();
      const anyOrient = screen.orientation as unknown as {
        lock?: (o: string) => Promise<void>;
      };
      if (anyOrient?.lock) await anyOrient.lock("landscape");
    } catch {
      /* not supported */
    }
  }, []);

  const closeFullscreen = useCallback(async () => {
    try {
      const anyOrient = screen.orientation as unknown as { unlock?: () => void };
      if (anyOrient?.unlock) anyOrient.unlock();
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* ignore */
    }
    setFullscreen(false);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Portafogli</h1>
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
                  <Label htmlFor="pi" className="text-xs">
                    Data inizio
                  </Label>
                  <Input
                    id="pi"
                    type="date"
                    value={dataInizio}
                    onChange={(e) => setDataInizio(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pf" className="text-xs">
                    Data fine
                  </Label>
                  <Input
                    id="pf"
                    type="date"
                    value={dataFine}
                    onChange={(e) => setDataFine(e.target.value)}
                  />
                </div>
              </div>
              <SheetFooter className="mt-4 flex-row gap-2">
                <Button size="sm" onClick={applyFilter} className="flex-1">
                  Applica
                </Button>
                <Button size="sm" variant="outline" onClick={resetFilter}>
                  Reset
                </Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
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

      <Card
        className="p-2 cursor-pointer"
        onClick={openFullscreen}
        title="Tocca per aprire in orizzontale"
      >
        <div className="relative h-64 w-full">
          <ChartView
            points={points}
            markets={markets}
            baselines={baselines}
            visible={visible}
            colors={colors}
          />
          <div className="pointer-events-none absolute right-2 top-2 rounded bg-background/70 p-1">
            <Maximize2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </Card>

      <Card className="p-3">
        <div className="mb-2 text-sm font-medium">Mercati</div>
        <div className="flex flex-col gap-2">
          {markets.length === 0 && !isFetching && (
            <div className="text-sm text-muted-foreground">Nessun dato.</div>
          )}
          {markets.map((m) => {
            const base = baselines[m];
            const last = lastValues[m];
            const pct = base ? ((last - base) / base) * 100 : 0;
            const delta = last - base;
            const positive = pct >= 0;
            return (
              <div
                key={m}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: colors[m] }}
                  />
                  <span className="font-medium">{m}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "text-sm tabular-nums",
                      positive ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {positive ? "+" : ""}
                    {pct.toFixed(2)}% ({positive ? "+" : ""}
                    {delta.toFixed(2)})
                  </span>
                  <Switch
                    checked={visible[m] ?? true}
                    onCheckedChange={(v) =>
                      setVisible((prev) => ({ ...prev, [m]: v }))
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between border-b p-2">
              <div className="text-sm font-medium">
                Grafico — scorri e usa la barra sotto per zoom
              </div>
              <Button size="sm" variant="ghost" onClick={closeFullscreen}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 p-2">
              <ChartView
                points={points}
                markets={markets}
                baselines={baselines}
                visible={visible}
                colors={colors}
                withBrush
                minWidthPx={Math.max(points.length * 40, 800)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
