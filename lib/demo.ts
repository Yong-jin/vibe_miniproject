import type { BoxOfficeResponse, BoxOfficeItem } from "./types";
import type { QueryPeriod } from "./validation";

export const DEMO_START = "2026-09-07";
export const DEMO_END = "2026-09-13";
const names = ["달빛 정거장", "바다의 편지", "별을 걷는 사람들", "작은 숲의 약속", "여름의 마지막 장면", "구름 너머 도시", "오후 네 시", "푸른 궤도", "우리의 계절", "밤의 도서관"];

// Deliberately fictional observations, not KOBIS records or reconstructed market totals.
export function getDemoResponse(query: QueryPeriod): BoxOfficeResponse {
  const available = query.rangeStart >= DEMO_START && query.rangeEnd <= DEMO_END;
  const days = query.period === "weekly" ? 7 : query.period === "weekend" ? 3 : 1;
  const items: BoxOfficeItem[] = available ? names.map((movieNm, index) => ({
    movieCd: "DEMO_" + String(index + 1).padStart(2, "0"),
    movieNm, openDt: index === 9 ? null : "2026-09-01",
    rank: index + 1, salesAmt: (10 - index) * 10000000 * days,
    audiCnt: (10 - index) * 1000 * days,
    salesAcc: (10 - index) * 100000000,
    audiAcc: (10 - index) * 10000,
  })) : [];
  return {
    data: { ...query, status: items.length ? "success" : "empty", items },
    meta: { source: "demo", fetchedAt: "2026-09-14T00:00:00.000Z", stale: false, persistence: "not-attempted", verification: "pending", warnings: [] },
  };
}
