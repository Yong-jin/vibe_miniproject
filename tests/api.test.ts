import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../lib/supabase", () => ({ readCache: vi.fn(async () => null), saveCache: vi.fn(async () => {}) }));
import { GET } from "../app/api/box-office/route";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-18T00:00:00+09:00")); vi.stubEnv("DATA_MODE", "demo"); vi.stubEnv("KOBIS_API_KEY", ""); vi.stubGlobal("fetch", vi.fn(() => { throw new Error("External I/O forbidden"); })); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const request = (query: string) => GET(new Request("http://localhost/api/box-office?" + query));
describe("demo Route Handler AC01~04", () => {
  it.each([["daily", "2026-09-13", "2026-09-13", 100000000], ["weekly", "2026-09-07", "2026-09-13", 700000000], ["weekend", "2026-09-11", "2026-09-13", 300000000]])("%s의 기간·단위·순위", async (period, start, end, sales) => {
    const response = await request("date=2026-09-13&period=" + period);
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(body.data.rangeStart).toBe(start); expect(body.data.rangeEnd).toBe(end);
    expect(body.data.items).toHaveLength(10); expect(body.data.items[0].salesAmt).toBe(sales);
    expect(body.data.items.map((item: {rank:number}) => item.rank)).toEqual([1,2,3,4,5,6,7,8,9,10]);
    expect(body.meta).toMatchObject({ source: "demo", persistence: "not-attempted", verification: "pending" });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("빈 샘플 기간은 정상 빈 응답이다", async () => {
    const response = await request("date=2026-09-06&period=daily");
    expect(response.status).toBe(200);
    expect((await response.json()).data).toMatchObject({ status: "empty", items: [] });
  });
  it.each(["", "date=2026-09-13", "period=daily", "date=2026-09-13&date=2026-09-12&period=daily", "date=2026-09-13&period=daily&period=weekly", "date=2026-09-13&period=month", "date=2026-02-30&period=daily", "date=2026-09-18&period=daily", "date=2026-09-17&period=weekly", "date=2026-09-13&period=daily&fail=1"])("잘못된 입력 거부 %s", async query => {
    const response = await request(query);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({ code: "INVALID_REQUEST", retryable: false });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["live", "", "typo"])("모드 %s에서 demo로 전환하지 않는다", async mode => {
    vi.stubEnv("DATA_MODE", mode);
    const response = await request("date=2026-09-13&period=daily");
    expect(response.status).toBe(503); expect((await response.json()).error.code).toBe("CONFIGURATION_ERROR");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("미설정은 demo가 아니다", async () => {
    delete process.env.DATA_MODE;
    expect((await request("date=2026-09-13&period=daily")).status).toBe(503);
  });
});

describe("live Route Handler 오류 매핑", () => {
  it("외부 HTTP 실패를 502로 반환하고 키를 숨긴다", async () => {
    vi.stubEnv("DATA_MODE", "live"); vi.stubEnv("KOBIS_API_KEY", "ONLY_TEST_KEY");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ONLY_TEST_KEY", { status: 500 })));
    const response = await request("date=2026-09-13&period=daily");
    expect(response.status).toBe(502);
    const body = await response.text();
    expect(body).toContain("UPSTREAM_ERROR"); expect(body).not.toContain("ONLY_TEST_KEY");
  });
  it("외부 지연은 504이며 demo로 전환하지 않는다", async () => {
    vi.stubEnv("DATA_MODE", "live"); vi.stubEnv("KOBIS_API_KEY", "ONLY_TEST_KEY");
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const pending = request("date=2026-09-13&period=daily");
    await vi.advanceTimersByTimeAsync(5000);
    const response = await pending;
    expect(response.status).toBe(504);
    expect((await response.json()).error.code).toBe("UPSTREAM_TIMEOUT");
  });
});
