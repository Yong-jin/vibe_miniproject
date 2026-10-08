import type { BoxOfficeResponse } from "./types";
import { parseCalendarDate } from "./validation";
export type DayResult = { date: string; response?: BoxOfficeResponse; error?: string };
export function recentDates(end: string, count: number): string[] {
  if (![7,14,30].includes(count)) throw new Error("지원하지 않는 기간입니다.");
  const last = parseCalendarDate(end).getTime();
  return Array.from({length:count},(_,i)=>new Date(last-(count-1-i)*86400000).toISOString().slice(0,10));
}
function add(a:number,b:number) {
  if (!Number.isSafeInteger(b) || !Number.isSafeInteger(a+b)) throw new Error("합계가 안전한 정수 범위를 벗어났습니다.");
  return a+b;
}
export function aggregateDays(days: DayResult[]) {
  if(new Set(days.map(d=>d.date)).size!==days.length) throw new Error("중복 날짜입니다.");
  const movies = new Map<string,{movieCd:string;movieNm:string;sales:number}>();
  let sales=0, audience=0;
  const daily=days.map(day=>{
    const r=day.response;
    if(!r) return {date:day.date,sales:null,audience:null};
    if(r.data.period!=="daily" || r.data.targetDate!==day.date || r.data.rangeStart!==day.date || r.data.rangeEnd!==day.date) throw new Error("일간 데이터만 집계할 수 있습니다.");
    if(r.data.status==="empty" || !r.data.items.length) return {date:day.date,sales:null,audience:null};
    let daySales=0,dayAudience=0;
    const codes=new Set<string>();
    for(const item of r.data.items){
      if(codes.has(item.movieCd)) throw new Error("중복 영화입니다.");codes.add(item.movieCd);
      daySales=add(daySales,item.salesAmt);dayAudience=add(dayAudience,item.audiCnt);
      const movie=movies.get(item.movieCd) ?? {movieCd:item.movieCd,movieNm:item.movieNm,sales:0};
      movie.sales=add(movie.sales,item.salesAmt);movie.movieNm=item.movieNm;movies.set(item.movieCd,movie);
    }
    sales=add(sales,daySales);audience=add(audience,dayAudience);
    return {date:day.date,sales:daySales,audience:dayAudience};
  });
  const complete=days.length>0 && daily.every(d=>d.sales!==null);
  return {daily,complete,totals:complete?{sales,audience,perAudience:audience>0?sales/audience:null}:null,
    ranking:complete?[...movies.values()].sort((a,b)=>b.sales-a.sales || a.movieCd.localeCompare(b.movieCd)):[]};
}
