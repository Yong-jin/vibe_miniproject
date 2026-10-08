import type { BoxOfficeItem } from "./types";
import type { QueryPeriod } from "./validation";
import { parseCalendarDate } from "./validation";
import { invalidResponse, KobisError } from "./kobis-error";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return invalidResponse();
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return invalidResponse();
  return value;
}
function integer(value: unknown): number {
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return invalidResponse();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) return invalidResponse();
  return parsed;
}
export function parseKobisResponse(raw: unknown, query: QueryPeriod): BoxOfficeItem[] {
  const root = object(raw);
  if ("faultInfo" in root) throw new KobisError("UPSTREAM_ERROR", "KOBIS가 요청을 거부했습니다. 서버의 키와 API 이용 한도를 확인해 주세요.", 502, false);
  const result = object(root.boxOfficeResult);
  const expected = query.rangeStart.replaceAll("-", "") + "~" + query.rangeEnd.replaceAll("-", "");
  if (result.showRange !== expected) return invalidResponse();
  const list = result[query.period === "daily" ? "dailyBoxOfficeList" : "weeklyBoxOfficeList"];
  if (!Array.isArray(list) || list.length > 10) return invalidResponse();
  const codes = new Set<string>();
  const ranks = new Set<number>();
  return list.map(value => {
    const item = object(value);
    const movieCd = text(item.movieCd);
    if (!/^\d+$/.test(movieCd) || codes.has(movieCd)) return invalidResponse();
    codes.add(movieCd);
    const rank = integer(item.rank);
    if (rank < 1 || rank > 10 || ranks.has(rank)) return invalidResponse();
    ranks.add(rank);
    let openDt: string | null = null;
    if (typeof item.openDt !== "string") return invalidResponse();
    if (item.openDt.trim()) {
      try { parseCalendarDate(item.openDt); openDt = item.openDt; } catch { return invalidResponse(); }
    }
    return { movieCd, movieNm: text(item.movieNm), openDt, rank,
      salesAmt: integer(item.salesAmt), audiCnt: integer(item.audiCnt),
      salesAcc: integer(item.salesAcc), audiAcc: integer(item.audiAcc) };
  }).sort((a, b) => a.rank - b.rank);
}
