import type { DayResult } from "./metrics";
import { isBoxOfficeResponse } from "./response";
// Two workers bound concurrent requests; aborted generations never publish results.
export async function loadDays(dates:string[], signal:AbortSignal, onDay:(day:DayResult)=>void, request:typeof fetch=fetch) {
  let cursor=0;
  async function worker(){
    while(!signal.aborted && cursor<dates.length){
      const date=dates[cursor++];
      let day:DayResult;
      const abort = new AbortController();
      const cancel = () => abort.abort();
      signal.addEventListener("abort", cancel, { once: true });
      const timer = setTimeout(cancel, 20000);
      try {
        const result=await request(`/api/box-office?date=${date}&period=daily`,{signal:abort.signal,cache:"no-store"});
        if(!result.ok) throw new Error("조회 실패. 다시 시도해 주세요.");
        const response:unknown=await result.json();
        if(!isBoxOfficeResponse(response,{period:"daily",targetDate:date,rangeStart:date,rangeEnd:date})) throw new Error("응답 날짜가 일치하지 않습니다.");
        day={date,response};
      } catch {day={date,error:"조회 실패 또는 응답 지연. 다시 시도해 주세요."};}
      finally { clearTimeout(timer); signal.removeEventListener("abort", cancel); }
      if(!signal.aborted) onDay(day);
    }
  }
  await Promise.all([worker(),worker()]);
}
