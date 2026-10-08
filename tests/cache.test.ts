import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getBoxOffice } from "../lib/box-office";
import { compareRaw } from "../lib/verification";
import { parseKobisResponse } from "../lib/kobis-parser";
import { rawKobis } from "./fixtures/kobis";
import { resolveQueryPeriod } from "../lib/validation";
import { KobisError } from "../lib/kobis-error";
import type { CacheRecord } from "../lib/cache-types";
const query = resolveQueryPeriod("2026-09-13","daily",new Date("2026-09-20"));
const time = Date.parse("2026-09-20T00:00:00Z");
function record(empty = false): CacheRecord {
  const raw = rawKobis();
  if(empty) raw.boxOfficeResult.dailyBoxOfficeList=[];
  const items = parseKobisResponse(raw,query);
  return { rawResponse:raw,rowCount:items.length,schemaVersion:1,expiresAt:new Date(time+(empty?3600000:86400000)).toISOString(),
    response:{data:{...query,status:empty?"empty":"success",items},meta:{source:"kobis",fetchedAt:new Date(time).toISOString(),stale:false,persistence:"not-attempted",verification:"pending",warnings:[]}}};
}
function deps() {
  return {read:vi.fn<() => Promise<CacheRecord|null>>().mockResolvedValue(record()),save:vi.fn().mockResolvedValue(undefined),fetch:vi.fn().mockResolvedValue(record()),now:()=>time+1000};
}
afterEach(()=>vi.useRealTimers());
describe("cache/persistence AC06~09",()=>{
  it.each([false,true])("유효 캐시 empty=%s 외부 호출0",async empty=>{
    const d=deps();d.read.mockResolvedValue(record(empty));
    expect((await getBoxOffice(query,d)).meta).toMatchObject({source:"cache",stale:false,verification:"passed"});
    expect(d.fetch).not.toHaveBeenCalled();expect(d.save).not.toHaveBeenCalled();
  });
  it("만료 정각은 원본 갱신",async()=>{
    const d=deps(), old=record();old.expiresAt=new Date(time+1000).toISOString();
    d.read.mockResolvedValueOnce(old);
    expect((await getBoxOffice(query,d)).meta.verification).toBe("passed");
    expect(d.fetch).toHaveBeenCalledTimes(1);expect(d.save).toHaveBeenCalledTimes(1);
  });
  it("DB 조회 실패는 원본 후 저장",async()=>{
    const d=deps();d.read.mockRejectedValueOnce(new Error("db"));
    const result=await getBoxOffice(query,d);
    expect(result.meta.source).toBe("kobis");expect(result.meta.warnings[0].code).toBe("DB_READ_FAILED");
  });
  it("저장 실패에도 원본 표시",async()=>{
    const d=deps();d.read.mockResolvedValue(null);d.save.mockRejectedValue(new Error());
    expect((await getBoxOffice(query,d)).meta).toMatchObject({source:"kobis",persistence:"failed",verification:"pending"});
  });
  it("저장 후 재조회 실패는 pending",async()=>{
    const d=deps();d.read.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error());
    expect((await getBoxOffice(query,d)).meta).toMatchObject({persistence:"stored",verification:"pending"});
  });
  it("저장 후 수치 불일치는 원본+failed",async()=>{
    const d=deps(), damaged=record();damaged.response.data.items[0].salesAmt++;
    d.read.mockResolvedValueOnce(null).mockResolvedValueOnce(damaged);
    const result=await getBoxOffice(query,d);
    expect(result.meta.verification).toBe("failed");expect(result.data.items[0].salesAmt).toBe(123400);
  });
  it.each([false,true])("만료 캐시 폴백 empty=%s",async empty=>{
    const d=deps(), old=record(empty);old.expiresAt=new Date(time-1).toISOString();
    d.read.mockResolvedValue(old);d.fetch.mockRejectedValue(new Error());
    expect((await getBoxOffice(query,d)).meta).toMatchObject({source:"cache",stale:true,verification:"passed"});
  });
  it("양쪽 실패는503",async()=>{
    const d=deps();d.read.mockRejectedValue(new Error());d.fetch.mockRejectedValue(new Error());
    await expect(getBoxOffice(query,d)).rejects.toMatchObject({code:"DATA_UNAVAILABLE",status:503});
  });
  it("DB 정상·원본 실패는 원래 외부 오류",async()=>{
    const d=deps();d.read.mockResolvedValue(null);d.fetch.mockRejectedValue(new KobisError("UPSTREAM_TIMEOUT","timeout",504,true));
    await expect(getBoxOffice(query,d)).rejects.toMatchObject({status:504});
  });
  it("손상 캐시는 stale로도 사용하지 않는다",async()=>{
    const d=deps(), bad=record();bad.response.data.items=[];
    d.read.mockResolvedValue(bad);d.fetch.mockRejectedValue(new KobisError("UPSTREAM_ERROR","error",502,true));
    await expect(getBoxOffice(query,d)).rejects.toMatchObject({status:502});
  });
  it("더 최신 저장본은 그 원본과 비교",async()=>{
    const d=deps(), newer=record();newer.response.meta.fetchedAt=new Date(time+500).toISOString();
    d.read.mockResolvedValueOnce(null).mockResolvedValueOnce(newer);
    expect((await getBoxOffice(query,d)).meta.warnings.some(w=>w.code==="NEWER_COLLECTION")).toBe(true);
  });
  it("전체 제한 이후 추가 저장 안 함",async()=>{
    vi.useFakeTimers();const d=deps();d.now=Date.now;
    d.read.mockImplementation(()=>new Promise(resolve=>setTimeout(()=>resolve(null),21000)));
    const assertion=expect(getBoxOffice(query,d)).rejects.toMatchObject({status:503});
    await vi.advanceTimersByTimeAsync(21000);await assertion;
    expect(d.fetch).not.toHaveBeenCalled();expect(d.save).not.toHaveBeenCalled();
  });
});
describe("독립 원본 대조",()=>{
  it("동일 수치와 합계 일치",()=>{const r=record();expect(compareRaw(r.rawResponse,query,r.response.data.items).passed).toBe(true);});
  it("이름 변경은 정보",()=>{const r=record();r.response.data.items[0].movieNm="최신 이름";const c=compareRaw(r.rawResponse,query,r.response.data.items);expect(c.passed).toBe(true);expect(c.metadataDifferences).toEqual(["99000001"]);});
  it("행 누락 검출",()=>expect(compareRaw(record().rawResponse,query,[]).passed).toBe(false));
  it("수치 변조와 합계 검출",()=>{const r=record();r.response.data.items[0].audiCnt=13;expect(compareRaw(r.rawResponse,query,r.response.data.items).differences).toContain("합계 불일치: audiCnt");});
  it("원본 정정 검출",()=>{const r=record();const changed=rawKobis();changed.boxOfficeResult.dailyBoxOfficeList[0].salesAmt="123401";expect(compareRaw(changed,query,r.response.data.items).passed).toBe(false);});
});
