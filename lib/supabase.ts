import "server-only";
import type { CacheRecord, Snapshot } from "./cache-types";
import type { QueryPeriod } from "./validation";
import type { BoxOfficeItem } from "./types";
export class DatabaseError extends Error {
  constructor() { super("저장 데이터에 접근하지 못했습니다."); }
}
async function rpc(name: string, body: unknown): Promise<unknown> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  try {
    const address = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY;
    if (!address || !key) throw new DatabaseError();
    const url = new URL(address);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))) throw new DatabaseError();
    const headers: Record<string, string> = { apikey: key, "Content-Type": "application/json" };
    if (!key.startsWith("sb_secret_")) headers.Authorization = "Bearer " + key;
    const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => { reject(new DatabaseError()); controller.abort(); }, 3000); });
    return await Promise.race([timeout, (async () => {
      const response = await fetch(url.origin + "/rest/v1/rpc/" + name, { method: "POST", headers, body: JSON.stringify(body), signal: controller.signal, cache: "no-store", redirect: "error" });
      if (!response.ok) throw new DatabaseError();
      return response.json();
    })()]);
  } catch { throw new DatabaseError(); } finally { clearTimeout(timer); }
}
export async function readCache(query: QueryPeriod): Promise<CacheRecord | null> {
  const raw = await rpc("read_box_office_period", { p_period: query.period, p_target: query.targetDate });
  if (raw === null) return null;
  try {
    const row = raw as Record<string, unknown>;
    if (row.period !== query.period || row.targetDate !== query.targetDate || row.rangeStart !== query.rangeStart || row.rangeEnd !== query.rangeEnd || row.schemaVersion !== 1 || !Array.isArray(row.items) || row.items.length > 10 || row.rowCount !== row.items.length) throw new DatabaseError();
    const timestamp = (value: unknown) => {
      if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) throw new DatabaseError();
      return new Date(value).toISOString();
    };
    const fetchedAt = timestamp(row.fetchedAt), expiresAt = timestamp(row.expiresAt);
    if (Date.parse(expiresAt) - Date.parse(fetchedAt) !== (row.items.length === 0 ? 3600000 : 86400000)) throw new DatabaseError();
    const items = row.items.map(value => {
      const item = value as Record<string, unknown>;
      if (typeof item.movieCd !== "string" || typeof item.movieNm !== "string" || (item.openDt !== null && typeof item.openDt !== "string")) throw new DatabaseError();
      const numbers = {} as Pick<BoxOfficeItem, "rank" | "salesAmt" | "audiCnt" | "salesAcc" | "audiAcc">;
      for (const field of ["rank", "salesAmt", "audiCnt", "salesAcc", "audiAcc"] as const) {
        const n = item[field];
        if ((typeof n !== "string" && typeof n !== "number") || !/^-?\d+$/.test(String(n)) || !Number.isSafeInteger(Number(n))) throw new DatabaseError();
        numbers[field] = Number(n);
      }
      if (numbers.rank < 1 || numbers.rank > 10) throw new DatabaseError();
      return { movieCd: item.movieCd, movieNm: item.movieNm, openDt: item.openDt, ...numbers } as BoxOfficeItem;
    });
    if (new Set(items.map(i => i.rank)).size !== items.length) throw new DatabaseError();
    return {
      rawResponse: row.rawResponse, expiresAt, rowCount: items.length, schemaVersion: 1,
      response: { data: { ...query, status: items.length ? "success" : "empty", items }, meta: {
        source: "cache", fetchedAt, stale: false, persistence: "stored", verification: "pending", warnings: [],
      } },
    };
  } catch { throw new DatabaseError(); }
}
export async function saveCache(snapshot: Snapshot): Promise<void> {
  await rpc("save_box_office_period", { p_payload: { data: snapshot.response.data, fetchedAt: snapshot.response.meta.fetchedAt, rawResponse: snapshot.rawResponse } });
}
