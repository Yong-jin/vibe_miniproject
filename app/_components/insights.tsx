"use client";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { aggregateDays, recentDates, type DayResult } from "@/lib/metrics";
import { loadDays } from "@/lib/load-days";
const number=(n:number|null)=>n===null?"—":n.toLocaleString("ko-KR",{maximumFractionDigits:2});
export default function Insights({demo,end}:{demo:boolean;end:string}){
 const [count,setCount]=useState(7),[top,setTop]=useState(5),[retry,setRetry]=useState(0);
 const dates=useMemo(()=>recentDates(end,count),[end,count]);
 const [batch,setBatch]=useState<{key:string;days:DayResult[]}>({key:"",days:[]});
 const key=dates.join(",");
 const days=dates.map(date=>batch.key===key?batch.days.find(d=>d.date===date)??{date}:{date});
 useEffect(()=>{
   const controller=new AbortController();
   // On retry retain successes, re-request only failed dates.
   const existing=batch.key===key?batch.days:[];
   const requested=retry && existing.length?dates.filter(date=>!existing.find(d=>d.date===date)?.response):dates;
   void loadDays(requested,controller.signal,day=>setBatch(previous=>({key,days:[...(previous.key===key?previous.days:[]).filter(d=>d.date!==day.date),day]})));
   return ()=>controller.abort();
   // batch updates are results, not a request trigger.
   // eslint-disable-next-line react-hooks/exhaustive-deps
 },[key,retry]);
 let metrics:ReturnType<typeof aggregateDays>|undefined,error="";
 try{metrics=aggregateDays(days);}catch(e){error=e instanceof Error?e.message:"집계 실패";}
 const done=days.filter(d=>d.response||d.error).length,failed=days.filter(d=>d.error).length,empty=days.filter(d=>d.response?.data.status==="empty").length;
 const ranking=metrics?.ranking.slice(0,top)??[];
 return <>
 {demo&&<div className="demo-notice"><strong>샘플 데이터</strong><span>가상 영화 · 2026-09-07~13. 14/30일 선택 시 빈 날짜 처리를 확인할 수 있습니다.</span></div>}
 <section className="panel insights-panel">
 <div className="filters"><div><label htmlFor="days">최근 기간</label><select id="days" value={count} onChange={e=>{setCount(Number(e.target.value));setRetry(0);}}>{[7,14,30].map(n=><option key={n} value={n}>{n}일</option>)}</select></div><div><label htmlFor="top">매출 순위</label><select id="top" value={top} onChange={e=>setTop(Number(e.target.value))}><option value={5}>Top 5</option><option value={10}>Top 10</option></select></div><p>{dates[0]} ~ {end}</p></div>
 <div className="status-line" role="status">조회 {done}/{count}일 · 정상 {done-failed-empty}일 · 빈 날짜 {empty}일 · 실패 {failed}일</div>
 <progress aria-label="날짜별 조회 진행률" max={count} value={done}/>
 {failed>0&&<button className="retry-days" disabled={done<count} onClick={()=>setRetry(n=>n+1)}>실패 날짜 재시도</button>}
 {error?<p role="alert" className="error-state">{error}</p>:<>
 {!metrics?.complete&&<p className="status-line">기간이 불완전하여 기간 합계와 순위를 표시하지 않습니다. 빈 날짜와 실패 날짜는 0으로 추정하지 않습니다.</p>}
 {metrics?.totals&&<div className="metric-cards"><article><h2>관측 매출 합계</h2><strong>{number(metrics.totals.sales)}원</strong></article><article><h2>관측 관객 합계</h2><strong>{number(metrics.totals.audience)}명</strong></article><article><h2>관객당 매출</h2><strong>{number(metrics.totals.perAudience)}{metrics.totals.perAudience===null?"":"원/명"}</strong></article></div>}
 <div className="chart-block"><h2>일별 Top 10 관측 매출 추이 (원)</h2><div className="chart"><ResponsiveContainer width="100%" height="100%" initialDimension={{width:600,height:300}}><LineChart data={metrics?.daily} accessibilityLayer><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date" tickFormatter={v=>v.slice(5)}/><YAxis width={65} tickFormatter={v=>`${v/100000000}억`}/><Tooltip formatter={v=>[`${number(Number(v))}원`,"관측 매출"]}/><Line dataKey="sales" name="관측 매출" stroke="#006c63" strokeWidth={3} connectNulls={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></div></div>
 {metrics?.complete&&<div className="chart-block"><h2>기간 관측 매출 Top {top} (원)</h2><div className="chart"><ResponsiveContainer width="100%" height="100%" initialDimension={{width:600,height:300}}><BarChart data={ranking} accessibilityLayer><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="movieNm" tick={false}/><YAxis width={65} tickFormatter={v=>`${v/100000000}억`}/><Tooltip formatter={v=>[`${number(Number(v))}원`,"관측 매출"]}/><Bar dataKey="sales" fill="#006c63" isAnimationActive={false}/></BarChart></ResponsiveContainer></div><div className="table-scroll" tabIndex={0} aria-label="기간 순위 표"><table><caption>차트와 동일한 기간 관측 매출 · 전체 흥행 실적이 아닙니다</caption><thead><tr><th>순위</th><th>영화</th><th>관측 매출 (원)</th></tr></thead><tbody>{ranking.map((m,i)=><tr key={m.movieCd}><td>{i+1}</td><th scope="row">{m.movieNm}</th><td>{number(m.sales)}</td></tr>)}</tbody></table></div></div>}
 <div className="table-scroll" tabIndex={0} aria-label="일별 데이터 표"><table><caption>일별 관측값과 수집 상태 · 누적 매출은 합산하지 않습니다</caption><thead><tr><th>날짜</th><th>상태 / 출처</th><th>매출 (원)</th><th>관객 (명)</th><th>수집 시각 / 경고</th></tr></thead><tbody>{days.map((d,i)=><tr key={d.date}><th scope="row">{d.date}</th><td>{d.error?"실패":d.response?`${d.response.data.status==="empty"?"빈 결과":"정상"} / ${d.response.meta.source}`:"조회 중"}</td><td>{number(metrics?.daily[i].sales??null)}</td><td>{number(metrics?.daily[i].audience??null)}</td><td>{d.response?`${d.response.meta.fetchedAt}${d.response.meta.stale?" · 오래된 캐시":""} ${d.response.meta.warnings.map(w=>w.message).join(" ")}`:d.error??"—"}</td></tr>)}</tbody></table></div>
 </>}
 <p className="status-line note">전체 시장 통계가 아닌 일별 Top 10 관측치입니다. 순위 밖 영화의 매출을 0으로 추정하지 않습니다. 관객 합계가 0 이하면 관객당 매출을 표시하지 않습니다.</p>
 </section></>;
}
