import type { QueryPeriod } from "./validation";
export type BoxOfficeItem = { movieCd: string; movieNm: string; openDt: string | null; rank: number; salesAmt: number; audiCnt: number; salesAcc: number; audiAcc: number };
export type BoxOfficeResponse = {
  data: QueryPeriod & { status: "success" | "empty"; items: BoxOfficeItem[] };
  meta: { source: "demo" | "cache" | "kobis"; fetchedAt: string; stale: boolean; persistence: "stored" | "failed" | "not-attempted"; verification: "passed" | "failed" | "pending"; warnings: { code: string; message: string }[] };
};
export type ApiError = { code: string; message: string; retryable: boolean; fieldErrors?: Partial<Record<"date" | "period" | "query", string>> };
