import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fetchKobis } from "../lib/kobis";
import { parseKobisResponse } from "../lib/kobis-parser";
import { resolveQueryPeriod } from "../lib/validation";
import { rawKobis } from "./fixtures/kobis";
const now = new Date("2026-09-18T00:00:00+09:00");
const daily = resolveQueryPeriod("2026-09-13", "daily", now);
const fakeKey = "TEST_ONLY_SECRET_SENTINEL";
beforeEach(() => { vi.stubEnv("KOBIS_API_KEY", fakeKey); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("독립 기대값으로 원본 파싱", () => {
  it("문자열 숫자를 정확히 파싱한다", () => expect(parseKobisResponse(rawKobis(), daily)).toEqual([
    { movieCd: "99000001", movieNm: "가상 테스트 영화", openDt: "2026-09-01", rank: 1, salesAmt: 123400, audiCnt: 12, salesAcc: 567800, audiAcc: 56 },
  ]));
  it("정상 빈 리스트", () => expect(parseKobisResponse({ boxOfficeResult: { showRange: "20260913~20260913", dailyBoxOfficeList: [] } }, daily)).toEqual([]));
  it.each([null, {}, [], { faultInfo: { message: fakeKey } }, { boxOfficeResult: { showRange: "wrong", dailyBoxOfficeList: [] } }, { boxOfficeResult: { showRange: "20260913~20260913" } }])("잘못된 구조나 API 오류 거부", raw => expect(() => parseKobisResponse(raw, daily)).toThrow());
  it.each(["1.5", "NaN", "1,000", "9007199254740992", "", "1e3"])("잘못된 정수 %s 거부", value => {
    const raw = rawKobis(); raw.boxOfficeResult.dailyBoxOfficeList[0].salesAmt = value;
    expect(() => parseKobisResponse(raw, daily)).toThrow();
  });
  it("음수 관측값을 반올림하거나 0으로 바꾸지 않는다", () => {
    const raw = rawKobis(); raw.boxOfficeResult.dailyBoxOfficeList[0].salesAmt = "-100";
    expect(parseKobisResponse(raw, daily)[0].salesAmt).toBe(-100);
  });
  it("미상 개봉일은 null", () => {
    const raw = rawKobis(); raw.boxOfficeResult.dailyBoxOfficeList[0].openDt = "";
    expect(parseKobisResponse(raw, daily)[0].openDt).toBeNull();
  });
  it("잘못된 개봉일 거부", () => {
    const raw = rawKobis(); raw.boxOfficeResult.dailyBoxOfficeList[0].openDt = "2026-02-30";
    expect(() => parseKobisResponse(raw, daily)).toThrow();
  });
  it("중복 영화 거부", () => {
    const raw = rawKobis(); raw.boxOfficeResult.dailyBoxOfficeList.push({ ...raw.boxOfficeResult.dailyBoxOfficeList[0], rank: "2" });
    expect(() => parseKobisResponse(raw, daily)).toThrow();
  });
  it("중복 순위 거부", () => {
    const raw = rawKobis(); raw.boxOfficeResult.dailyBoxOfficeList.push({ ...raw.boxOfficeResult.dailyBoxOfficeList[0], movieCd: "99000002" });
    expect(() => parseKobisResponse(raw, daily)).toThrow();
  });
});
describe("KOBIS transport mock", () => {
  it.each(["daily", "weekly", "weekend"])("%s HTTPS/파라미터/metadata", async period => {
    const query = resolveQueryPeriod("2026-09-13", period, now);
    const stub = vi.fn().mockResolvedValue(Response.json(rawKobis(period === "daily" ? "dailyBoxOfficeList" : "weeklyBoxOfficeList", query.rangeStart.replaceAll("-", "") + "~" + query.rangeEnd.replaceAll("-", ""))));
    vi.stubGlobal("fetch", stub);
    const result = await fetchKobis(query);
    const [url, options] = stub.mock.calls[0];
    expect(url.protocol).toBe("https:");
    expect(url.searchParams.get("targetDt")).toBe(period === "daily" ? "20260913" : "20260907");
    expect(url.searchParams.get("weekGb")).toBe(period === "daily" ? null : period === "weekly" ? "0" : "1");
    expect(url.searchParams.get("itemPerPage")).toBe("10");
    expect(options).toMatchObject({ cache: "no-store", redirect: "error" });
    expect(result.meta).toMatchObject({ source: "kobis", persistence: "not-attempted", verification: "pending" });
    expect(JSON.stringify(result)).not.toContain(fakeKey);
    expect(stub).toHaveBeenCalledTimes(1);
  });
  it("키 누락은 외부 호출 전 거부", async () => {
    vi.stubEnv("KOBIS_API_KEY", ""); const stub = vi.fn(); vi.stubGlobal("fetch", stub);
    await expect(fetchKobis(daily)).rejects.toMatchObject({ status: 503, code: "CONFIGURATION_ERROR" }); expect(stub).not.toHaveBeenCalled();
  });
  it.each([401, 403, 429, 500])("HTTP %i 실패", async status => {
    const stub = vi.fn().mockResolvedValue(new Response(fakeKey, { status })); vi.stubGlobal("fetch", stub);
    await expect(fetchKobis(daily)).rejects.toMatchObject({ status: 502, retryable: status !== 401 && status !== 403 });
    expect(stub).toHaveBeenCalledTimes(1);
  });
  it("잘못된 JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("broken" + fakeKey)));
    await expect(fetchKobis(daily)).rejects.toMatchObject({ code: "UPSTREAM_ERROR", status: 502 });
  });
  it("네트워크 예외에서 키가 유출되지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("https://example.invalid?key=" + fakeKey)));
    await expect(fetchKobis(daily)).rejects.not.toThrow(fakeKey);
  });
  it("본문 읽기까지 5초 제한하고 자동 재시도하지 않는다", async () => {
    vi.useFakeTimers();
    const stub = vi.fn().mockResolvedValue({ ok: true, json: () => new Promise(() => {}) });
    vi.stubGlobal("fetch", stub);
    const promise = expect(fetchKobis(daily)).rejects.toMatchObject({ code: "UPSTREAM_TIMEOUT", status: 504 });
    await vi.advanceTimersByTimeAsync(5000); await promise;
    expect(stub).toHaveBeenCalledTimes(1);
    expect(stub.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
