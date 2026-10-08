"use client";
import { useEffect, useRef, useState } from "react";
import type { ApiError, BoxOfficeResponse } from "@/lib/types";
import { isBoxOfficeResponse } from "@/lib/response";
import { resolveQueryPeriod } from "@/lib/validation";

type Query = { date: string; period: string; attempt: number };
type State = { kind: "idle" | "loading" } | { kind: "success"; value: BoxOfficeResponse } | { kind: "error"; error: ApiError };
const number = new Intl.NumberFormat("ko-KR");

export default function BoxOffice({ demo, initialDate, maxDate }: { demo: boolean; initialDate: string; maxDate: string }) {
  const [date, setDate] = useState(initialDate);
  const [period, setPeriod] = useState("daily");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<Query | null>({ date: initialDate, period: "daily", attempt: 0 });
  const [state, setState] = useState<State>({ kind: "loading" });
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!query) return;
    const current = ++generation.current;
    const abort = new AbortController();
    controller.current = abort;
    let timedOut = false; let active = true;
    const timer = setTimeout(() => { timedOut = true; abort.abort(); }, 20000);
    async function load() {
      try {
        const response = await fetch("/api/box-office?" + new URLSearchParams({ date: query!.date, period: query!.period }), { signal: abort.signal, cache: "no-store" });
        const body = await response.json();
        if (!active || current !== generation.current) return;
        if (!response.ok) {
          setState({ kind: "error", error: body.error ?? { code: "REQUEST_FAILED", message: "조회하지 못했습니다. 다시 시도해 주세요.", retryable: true } });
        } else if (!isBoxOfficeResponse(body, resolveQueryPeriod(query!.date, query!.period))) {
          throw new Error("Invalid response");
        } else {
          setState({ kind: "success", value: body });
        }
      } catch {
        if (!active || current !== generation.current || (abort.signal.aborted && !timedOut)) return;
        setState({ kind: "error", error: { code: timedOut ? "REQUEST_TIMEOUT" : "NETWORK_ERROR", message: timedOut ? "응답이 지연되고 있습니다. 다시 시도해 주세요." : "데이터를 불러오지 못했습니다. 연결을 확인하고 다시 시도해 주세요.", retryable: true } });
      } finally { clearTimeout(timer); }
    }
    void load();
    return () => { active = false; abort.abort(); clearTimeout(timer); };
  }, [query]);

  function change() {
    ++generation.current;
    controller.current?.abort();
    setQuery(null);
    setState({ kind: "idle" });
  }
  function submit() {
    ++generation.current;
    controller.current?.abort();
    try { resolveQueryPeriod(date, period); }
    catch (error) {
      setQuery(null);
      setState({ kind: "error", error: { code: "INVALID_REQUEST", message: error instanceof Error ? error.message : "날짜를 확인해 주세요.", retryable: false, fieldErrors: { date: "완료된 유효 날짜를 선택해 주세요." } } });
      return;
    }
    setState({ kind: "loading" });
    setQuery({ date, period, attempt: (query?.attempt ?? 0) + 1 });
  }
  const result = state.kind === "success" ? state.value : null;
  const rows = result?.data.items.filter(item => item.movieNm.toLocaleLowerCase("ko-KR").includes(search.trim().toLocaleLowerCase("ko-KR"))) ?? [];
  const dateError = state.kind === "error" ? state.error.fieldErrors?.date : undefined;
  return <>
    {demo && <aside className="demo-notice"><strong>샘플 데이터</strong><span>실제 영화·흥행 실적이 아닙니다. 샘플 제공 기간: 2026-09-07~2026-09-13. 그 밖의 완료된 날짜는 빈 결과 시연용입니다.</span></aside>}
    <section className="panel" aria-labelledby="list-heading">
      <div className="panel-heading"><h2 id="list-heading">박스오피스 목록</h2><span className="badge">{demo ? "DEMO" : "LIVE"}</span></div>
      <form className="filters" onSubmit={event => { event.preventDefault(); submit(); }}>
        <div><label htmlFor="date">조회 날짜</label><input id="date" type="date" required value={date} max={maxDate} aria-invalid={!!dateError} aria-describedby={dateError ? "date-error" : undefined} onChange={event => { change(); setDate(event.target.value); }} />{dateError && <small id="date-error">{dateError}</small>}</div>
        <div><label htmlFor="period">조회 기간</label><select id="period" value={period} onChange={event => { change(); setPeriod(event.target.value); }}><option value="daily">일간</option><option value="weekly">주간 (월~일)</option><option value="weekend">주말 (금~일)</option></select></div>
        <button type="submit">조회하기</button>
      </form>
      <div className="search-box"><label htmlFor="search">영화명 검색</label><div className="search-row"><input id="search" aria-describedby="search-hint" type="search" value={search} placeholder="현재 조회된 최대 10개 영화 안에서 검색" onChange={event => setSearch(event.target.value)} /><button type="button" className="secondary" onClick={() => setSearch("")}>검색 초기화</button></div><p id="search-hint" className="note">현재 조회된 최대 10개 영화 안에서 검색합니다.</p></div>
      <div aria-live="polite" aria-atomic="true" className="status-line">
        {state.kind === "idle" && "조건이 변경되었습니다. 조회하기를 눌러 주세요."}
        {state.kind === "loading" && "박스오피스 데이터를 불러오는 중입니다…"}
        {result && (result.data.status === "empty" ? "해당 기간에 제공된 박스오피스 데이터가 없습니다. 날짜를 변경해 주세요." : rows.length ? rows.length + "개 영화를 표시합니다." : "검색 조건에 맞는 영화가 없습니다. 검색어를 변경하거나 초기화해 주세요.")}
      </div>
      {state.kind === "error" && <div className="error-state" role="alert"><p>{state.error.message}</p>{state.error.retryable && <button type="button" onClick={submit}>다시 시도</button>}</div>}
      {result && <>
        <div className="result-meta">
          <strong>조회 기간: {result.data.rangeStart} ~ {result.data.rangeEnd}</strong>
          <span>출처: {result.meta.source === "demo" ? "샘플 데이터" : result.meta.source === "cache" ? "저장 데이터" : "KOBIS"} · {result.meta.source === "demo" ? "샘플 기준 시각" : "수집 시각"}: {new Date(result.meta.fetchedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (KST)</span>
          {result.meta.stale && <p>오래된 저장 데이터입니다.</p>}
          {result.meta.warnings.map(warning => <p key={warning.code}>{warning.message}</p>)}
        </div>
        {rows.length > 0 && <div className="table-scroll" role="region" aria-label="박스오피스 표, 가로 스크롤 가능" tabIndex={0}><table>
          <caption>{demo ? "가상 영화" : "영화"} 순위 · 매출 단위 원, 관객 단위 명</caption>
          <thead><tr><th scope="col">순위</th><th scope="col">영화명</th><th scope="col">개봉일</th><th scope="col">매출 (원)</th><th scope="col">관객수 (명)</th><th scope="col">누적 관객수 (명)</th></tr></thead>
          <tbody>{rows.map(item => <tr key={item.movieCd}><td>{item.rank}</td><th scope="row">{item.movieNm}</th><td>{item.openDt ?? "—"}</td><td>{number.format(item.salesAmt)}</td><td>{number.format(item.audiCnt)}</td><td>{number.format(item.audiAcc)}</td></tr>)}</tbody>
        </table></div>}
      </>}
    </section>
  </>;
}
