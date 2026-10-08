import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { readCache, saveCache } from "../lib/supabase";
import { resolveQueryPeriod } from "../lib/validation";
const query=resolveQueryPeriod("2026-09-13","daily",new Date("2026-09-20"));
beforeEach(()=>{vi.stubEnv("SUPABASE_URL","https://project.supabase.co");vi.stubEnv("SUPABASE_SECRET_KEY","sb_secret_TEST_ONLY");});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.useRealTimers();});
const row=()=>({period:"daily",targetDate:"2026-09-13",rangeStart:"2026-09-13",rangeEnd:"2026-09-13",schemaVersion:1,rowCount:1,fetchedAt:"2026-09-20T00:00:00Z",expiresAt:"2026-09-21T00:00:00Z",rawResponse:{},items:[{movieCd:"99000001",movieNm:"test",openDt:null,rank:1,salesAmt:"123400",audiCnt:"12",salesAcc:"567800",audiAcc:"56"}]});
it("API secret 키는 apikey만 사용",async()=>{
  const stub=vi.fn().mockResolvedValue(Response.json(null));vi.stubGlobal("fetch",stub);
  expect(await readCache(query)).toBeNull();
  expect(stub.mock.calls[0][1].headers).toEqual({apikey:"sb_secret_TEST_ONLY","Content-Type":"application/json"});
  expect(stub.mock.calls[0][1].cache).toBe("no-store");
});
it("legacy JWT는 Authorization에도 전달",async()=>{
  vi.stubEnv("SUPABASE_SECRET_KEY","legacy-test");
  const stub=vi.fn().mockResolvedValue(Response.json(null));vi.stubGlobal("fetch",stub);await readCache(query);
  expect(stub.mock.calls[0][1].headers.Authorization).toBe("Bearer legacy-test");
});
it("저장 숫자 문자열 정밀 변환",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json(row())));
  expect((await readCache(query))?.response.data.items[0].salesAmt).toBe(123400);
});
it.each(["9007199254740992","1.5","",null])("비정상 DB 숫자 거부 %s",async value=>{
  const valueRow=row();valueRow.items[0].salesAmt=value as string;
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue(Response.json(valueRow)));
  await expect(readCache(query)).rejects.toThrow("저장 데이터");
});
it("3초 본문 timeout",async()=>{
  vi.useFakeTimers();const stub=vi.fn().mockResolvedValue({ok:true,json:()=>new Promise(()=>{})});vi.stubGlobal("fetch",stub);
  const assertion=expect(readCache(query)).rejects.toThrow("저장 데이터");
  await vi.advanceTimersByTimeAsync(3000);await assertion;
  expect(stub.mock.calls[0][1].signal.aborted).toBe(true);
});
it("단일 저장 RPC",async()=>{
  const stub=vi.fn().mockResolvedValue(Response.json({saved:true}));vi.stubGlobal("fetch",stub);
  await saveCache({rawResponse:{},response:{data:{...query,status:"empty",items:[]},meta:{source:"kobis",fetchedAt:"2026-09-20T00:00:00Z",stale:false,persistence:"not-attempted",verification:"pending",warnings:[]}}});
  expect(stub).toHaveBeenCalledTimes(1);expect(stub.mock.calls[0][0]).toContain("/rpc/save_box_office_period");
});
it("DB URL/키를 오류에 출력하지 않는다",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockRejectedValue(new Error("sb_secret_TEST_ONLY")));
  await expect(readCache(query)).rejects.not.toThrow("sb_secret_TEST_ONLY");
});
