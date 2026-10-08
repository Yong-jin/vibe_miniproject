import type { BoxOfficeResponse } from "./types";
import type { QueryPeriod } from "./validation";
const object = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
/** Validate the browser boundary before rendering or aggregating JSON. */
export function isBoxOfficeResponse(value: unknown, query: QueryPeriod): value is BoxOfficeResponse {
  if (!object(value) || !object(value.data) || !object(value.meta)) return false;
  const { data, meta } = value;
  if (data.period !== query.period || data.targetDate !== query.targetDate || data.rangeStart !== query.rangeStart || data.rangeEnd !== query.rangeEnd) return false;
  if (!Array.isArray(data.items) || data.items.length > 10 || data.status !== (data.items.length ? "success" : "empty")) return false;
  const codes = new Set(), ranks = new Set();
  for (const item of data.items) {
    if (!object(item) || typeof item.movieCd !== "string" || !item.movieCd || typeof item.movieNm !== "string" || (item.openDt !== null && typeof item.openDt !== "string")) return false;
    if (!["rank", "salesAmt", "audiCnt", "salesAcc", "audiAcc"].every(key => Number.isSafeInteger(item[key]))) return false;
    if (Number(item.rank) < 1 || Number(item.rank) > 10 || codes.has(item.movieCd) || ranks.has(item.rank)) return false;
    codes.add(item.movieCd); ranks.add(item.rank);
  }
  return ["demo", "cache", "kobis"].includes(String(meta.source)) && typeof meta.stale === "boolean" &&
    typeof meta.fetchedAt === "string" && Number.isFinite(Date.parse(meta.fetchedAt)) &&
    ["stored", "failed", "not-attempted"].includes(String(meta.persistence)) && ["passed", "failed", "pending"].includes(String(meta.verification)) &&
    Array.isArray(meta.warnings) && meta.warnings.every(w => object(w) && typeof w.code === "string" && typeof w.message === "string");
}
