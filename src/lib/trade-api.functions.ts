import { createServerFn } from "@tanstack/react-start";

const PORTFOLIO_URL =
  "https://professionalpc.it/api_app.php?json_tradeapp_portafoglio";
const LOG_URL =
  "https://professionalpc.it/api_app.php?json_tradeapp_log";
const PASSWORD = "tradeApp";

export type ApiResponse<T> = {
  risposta: T;
  error: string[];
};

export type PortfolioRow = [string, string, number]; // [date, market, value]
export type LogRow = [string, string, string]; // [datetime, level, message]

type Filters = {
  data_inizio?: string;
  data_fine?: string;
  cerca?: string;
  ver?: number;
};

async function callApi<T>(url: string, filters: Filters): Promise<ApiResponse<T>> {
  const fullUrl = `${url}&ver=${filters.ver ?? 4}`;
  const body: Record<string, string> = { password: PASSWORD };
  if (filters.data_inizio) body.data_inizio = filters.data_inizio;
  if (filters.data_fine) body.data_fine = filters.data_fine;
  if (filters.cerca) body.cerca = filters.cerca;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    try {
      return JSON.parse(text) as ApiResponse<T>;
    } catch {
      return {
        risposta: [] as unknown as T,
        error: [`Risposta non valida dal server (${res.status})`],
      };
    }
  } catch (e) {
    return {
      risposta: [] as unknown as T,
      error: [`Errore di rete: ${(e as Error).message}`],
    };
  }
}

export const fetchPortfolio = createServerFn({ method: "POST" })
  .inputValidator((data: Filters) => data ?? {})
  .handler(async ({ data }) => {
    return callApi<PortfolioRow[]>(PORTFOLIO_URL, data);
  });

export const fetchLogs = createServerFn({ method: "POST" })
  .inputValidator((data: Filters) => data ?? {})
  .handler(async ({ data }) => {
    return callApi<LogRow[]>(LOG_URL, data);
  });
