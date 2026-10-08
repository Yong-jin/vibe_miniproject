import {it,expect,vi} from "vitest";
import {loadDays} from "../lib/load-days";
import type {DayResult} from "../lib/metrics";
it("malformed success is a retryable failed day",async()=>{
 const days:DayResult[]=[];
 const request=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:{period:"daily",targetDate:"2026-09-13",items:[]}})));
 await loadDays(["2026-09-13"],new AbortController().signal,d=>days.push(d),request);
 expect(days[0].error).toBeTruthy();expect(days[0].response).toBeUndefined();
});

it("times out a stalled browser request after 20 seconds",async()=>{
 vi.useFakeTimers();
 try {
  const days:DayResult[]=[];
  const request=vi.fn((_url,options)=>new Promise<Response>((_resolve,reject)=>options?.signal?.addEventListener("abort",()=>reject(new Error("aborted")))));
  const loading=loadDays(["2026-09-13"],new AbortController().signal,d=>days.push(d),request);
  await vi.advanceTimersByTimeAsync(20000);await loading;
  expect(days[0].error).toContain("응답 지연");expect(vi.getTimerCount()).toBe(0);
 } finally {vi.useRealTimers();}
});
