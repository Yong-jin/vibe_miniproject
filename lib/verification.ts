import type { BoxOfficeItem } from "./types";
import type { QueryPeriod } from "./validation";
export type Comparison = { passed: boolean; differences: string[]; metadataDifferences: string[] };
// Independent extraction; never calls the production KOBIS parser.
export function compareRaw(raw: unknown, query: QueryPeriod, items: BoxOfficeItem[]): Comparison {
  const differences: string[] = [], metadataDifferences: string[] = [];
  try {
    if (!raw || typeof raw !== "object" || "faultInfo" in raw) throw new Error();
    const result = (raw as Record<string, unknown>).boxOfficeResult as Record<string, unknown>;
    if (result.showRange !== query.rangeStart.replaceAll("-", "") + "~" + query.rangeEnd.replaceAll("-", "")) differences.push("기간 불일치");
    const rows = result[query.period === "daily" ? "dailyBoxOfficeList" : "weeklyBoxOfficeList"];
    if (!Array.isArray(rows) || rows.length > 10) throw new Error();
    if (rows.length !== items.length) differences.push("행 수 불일치");
    const seen = new Set<string>(), stored = new Map(items.map(item => [item.movieCd, item]));
    if (stored.size !== items.length) differences.push("저장 코드 중복");
    const fields = ["rank", "salesAmt", "audiCnt", "salesAcc", "audiAcc"] as const;
    const rawTotals = fields.map(() => BigInt(0)), savedTotals = fields.map(() => BigInt(0));
    for (const row of rows) {
      if (!row || typeof row !== "object" || typeof row.movieCd !== "string" || !row.movieCd || seen.has(row.movieCd)) throw new Error();
      seen.add(row.movieCd);
      const saved = stored.get(row.movieCd);
      if (!saved) differences.push("원본 영화 누락: " + row.movieCd);
      fields.forEach((field, i) => {
        const value = row[field];
        if (typeof value !== "string" || !/^-?\d+$/.test(value)) throw new Error();
        const integer = BigInt(value);
        if (integer < BigInt(-Number.MAX_SAFE_INTEGER) || integer > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error();
        rawTotals[i] += integer;
        if (saved && (!Number.isSafeInteger(saved[field]) || BigInt(saved[field]) !== integer)) differences.push(row.movieCd + ": " + field);
      });
      if (saved && (row.movieNm !== saved.movieNm || (row.openDt?.trim() || null) !== saved.openDt)) metadataDifferences.push(row.movieCd);
    }
    for (const saved of items) {
      if (!seen.has(saved.movieCd)) differences.push("저장 영화 추가: " + saved.movieCd);
      fields.forEach((field, i) => { if (!Number.isSafeInteger(saved[field])) throw new Error(); savedTotals[i] += BigInt(saved[field]); });
    }
    fields.forEach((field, i) => { if (rawTotals[i] !== savedTotals[i]) differences.push("합계 불일치: " + field); });
  } catch { differences.push("원본 또는 저장 데이터 형식 오류"); }
  return { passed: differences.length === 0, differences, metadataDifferences };
}
