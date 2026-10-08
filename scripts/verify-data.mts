import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
// Run with --conditions=react-server so server-only modules can be loaded by this local script.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { resolveQueryPeriod } = require("../lib/validation.ts");
const { readCache } = require("../lib/supabase.ts");
const { fetchKobisSnapshot } = require("../lib/kobis.ts");
const { compareRaw } = require("../lib/verification.ts");
try {
  const args = new URLSearchParams(process.argv.slice(2).map(arg => {
    if (!arg.startsWith("--") || !arg.includes("=")) throw new Error();
    return arg.slice(2);
  }).join("&"));
  if ([...args.keys()].some(k => !["date","period"].includes(k)) || args.getAll("date").length!==1 || args.getAll("period").length!==1) throw new Error();
  const query = resolveQueryPeriod(args.get("date")!,args.get("period")!);
  const stored = await readCache(query);
  if (!stored) { console.log("미수집: 저장된 기간이 없습니다. DB 변경 없이 종료합니다."); process.exitCode=2; }
  else {
    const integrity = compareRaw(stored.rawResponse,query,stored.response.data.items);
    const fresh = await fetchKobisSnapshot(query);
    const comparison = compareRaw(fresh.rawResponse,query,stored.response.data.items);
    console.log(JSON.stringify({query,storedAt:stored.response.meta.fetchedAt,upstreamAt:fresh.response.meta.fetchedAt,integrity,comparison,note:"차이는 사후 정정일 수 있습니다. 자동 덮어쓰기 없음."},null,2));
    if(!integrity.passed || !comparison.passed) process.exitCode=1;
  }
} catch { console.error("대조 실패: 날짜·서버 설정·연결을 확인하세요. 비밀값은 출력하지 않습니다."); process.exitCode=1; }
