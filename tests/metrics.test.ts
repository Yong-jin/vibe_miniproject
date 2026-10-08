import { describe,it,expect } from "vitest";
import { aggregateDays,recentDates } from "../lib/metrics";
import { getDemoResponse } from "../lib/demo";
import { resolveQueryPeriod } from "../lib/validation";
import { loadDays } from "../lib/load-days";
function day(date:string,sales:number[],audience:number[]){const response=getDemoResponse(resolveQueryPeriod(date,"daily"));response.data.items=response.data.items.slice(0,sales.length).map((m,i)=>({...m,salesAmt:sales[i],audiCnt:audience[i],salesAcc:999999999}));return {date,response};}
describe("AC10 metrics",()=>{
 it("matches independent hand calculation, not accumulated values",()=>{const r=aggregateDays([day("2026-09-07",[100000,60000],[10,6]),day("2026-09-08",[80000],[8])]);expect(r.totals).toEqual({sales:240000,audience:24,perAudience:10000});expect(r.daily.map(d=>d.sales)).toEqual([160000,80000]);expect(r.ranking.map(m=>m.sales)).toEqual([180000,60000]);});
 it.each([0,-1])("hides ratio for denominator %s",n=>expect(aggregateDays([day("2026-09-07",[10],[n])]).totals?.perAudience).toBeNull());
 it("leaves missing dates null and hides period metrics",()=>{const r=aggregateDays([day("2026-09-07",[10],[1]),{date:"2026-09-08",error:"failed"}]);expect(r.daily[1].sales).toBeNull();expect(r.totals).toBeNull();expect(r.ranking).toEqual([]);});
 it("empty date is not zero",()=>{const d=day("2026-09-07",[],[]);d.response.data.status="empty";expect(aggregateDays([d]).daily[0].sales).toBeNull();});
 it("rejects weekly data",()=>{const d=day("2026-09-07",[1],[1]);d.response.data.period="weekly";expect(()=>aggregateDays([d])).toThrow();});
 it("rejects duplicate dates",()=>{const d=day("2026-09-07",[1],[1]);expect(()=>aggregateDays([d,d])).toThrow();});
 it("detects overflow across days",()=>expect(()=>aggregateDays([day("2026-09-07",[Number.MAX_SAFE_INTEGER],[1]),day("2026-09-08",[1],[1])])).toThrow("안전"));
 it("ties sort by code and cache source does not change metrics",()=>{const d=day("2026-09-07",[10,10],[1,1]);const a=aggregateDays([d]);d.response.meta.source="cache";expect(aggregateDays([d])).toEqual(a);expect(a.ranking.map(m=>m.movieCd)).toEqual(["DEMO_01","DEMO_02"]);});
 it("generates inclusive dates across leap boundary",()=>{const dates=recentDates("2024-03-01",7);expect(dates[0]).toBe("2024-02-24");expect(dates[5]).toBe("2024-02-29");expect(recentDates("2026-09-13",30)).toHaveLength(30);});
 it("limits requests to two and publishes failures",async()=>{let active=0,max=0;const results:unknown[]=[];const request=(async()=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return new Response("error",{status:503});}) as typeof fetch;await loadDays(recentDates("2026-09-13",7),new AbortController().signal,d=>results.push(d),request);expect(max).toBe(2);expect(results).toHaveLength(7);});
 it("ignores late results after cancellation and stops queued work",async()=>{const controller=new AbortController();let calls=0,published=0;const request=(async()=>{calls++;controller.abort();return new Response("{}",{status:503});}) as typeof fetch;await loadDays(recentDates("2026-09-13",7),controller.signal,()=>published++,request);expect(published).toBe(0);expect(calls).toBe(1);});
});
