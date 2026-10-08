// Fictional raw KOBIS-shaped response, not a captured live response.
type RawItem = Record<"movieCd" | "movieNm" | "openDt" | "rank" | "salesAmt" | "audiCnt" | "salesAcc" | "audiAcc", string>;
export function rawKobis<K extends "dailyBoxOfficeList" | "weeklyBoxOfficeList" = "dailyBoxOfficeList">(listKey: K = "dailyBoxOfficeList" as K, range = "20260913~20260913") {
  return { boxOfficeResult: { showRange: range, [listKey]: [
    { movieCd: "99000001", movieNm: "가상 테스트 영화", openDt: "2026-09-01", rank: "1", salesAmt: "123400", audiCnt: "12", salesAcc: "567800", audiAcc: "56" },
  ] } as { showRange: string } & Record<K, RawItem[]> };
}
