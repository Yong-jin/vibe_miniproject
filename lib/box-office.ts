import "server-only";
import { fetchKobisSnapshot } from "./kobis";
import { readCache, saveCache } from "./supabase";
import { compareRaw } from "./verification";
import { KobisError } from "./kobis-error";
import type { QueryPeriod } from "./validation";
import type { BoxOfficeResponse } from "./types";
import type { CacheRecord, Snapshot } from "./cache-types";
type Dependencies = { read: (query: QueryPeriod) => Promise<CacheRecord | null>; save: (value: Snapshot) => Promise<void>; fetch: (query: QueryPeriod) => Promise<Snapshot>; now: () => number };
const defaults: Dependencies = { read: readCache, save: saveCache, fetch: fetchKobisSnapshot, now: Date.now };
const warning = (code: string, message: string) => ({ code, message });
function valid(record: CacheRecord, query: QueryPeriod) {
  return record.schemaVersion === 1 && record.rowCount === record.response.data.items.length &&
    compareRaw(record.rawResponse, query, record.response.data.items).passed;
}
function cached(record: CacheRecord, stale: boolean, warnings: BoxOfficeResponse["meta"]["warnings"]): BoxOfficeResponse {
  return { data: record.response.data, meta: { ...record.response.meta, source: "cache", stale, persistence: "stored", verification: "passed", warnings } };
}
export async function getBoxOffice(query: QueryPeriod, dependencies: Dependencies = defaults): Promise<BoxOfficeResponse> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = dependencies.now() + 20000;
  const checkDeadline = () => { if (dependencies.now() >= deadline) throw new KobisError("DATA_UNAVAILABLE", "처리 시간이 초과됐습니다. 다시 시도해 주세요.", 503, true); };
  async function run() {
    let previous: CacheRecord | null = null;
    let databaseFailed = false;
    const warnings: BoxOfficeResponse["meta"]["warnings"] = [];
    try {
      previous = await dependencies.read(query);
      if (previous && !valid(previous, query)) {
        previous = null;
        warnings.push(warning("CACHE_INVALID", "저장 데이터 대조에 실패하여 원본을 다시 조회했습니다."));
      }
    } catch {
      databaseFailed = true;
      warnings.push(warning("DB_READ_FAILED", "저장 데이터 조회에 실패하여 KOBIS에서 직접 조회했습니다."));
    }
    checkDeadline();
    if (previous && Date.parse(previous.expiresAt) > dependencies.now()) return cached(previous, false, warnings);
    let fresh: Snapshot;
    try { fresh = await dependencies.fetch(query); }
    catch (error) {
      if (previous) return cached(previous, true, [...warnings, warning("STALE_CACHE", "원본 갱신에 실패했습니다. 이전 수집 데이터를 표시합니다.")]);
      if (databaseFailed && !(error instanceof KobisError && error.code === "CONFIGURATION_ERROR")) throw new KobisError("DATA_UNAVAILABLE", "저장 데이터와 KOBIS를 모두 사용할 수 없습니다. 다시 시도해 주세요.", 503, true);
      throw error;
    }
    checkDeadline();
    const response: BoxOfficeResponse = { data: fresh.response.data, meta: { ...fresh.response.meta, warnings, persistence: "stored", verification: "pending" } };
    try { await dependencies.save(fresh); }
    catch {
      response.meta.persistence = "failed";
      response.meta.warnings.push(warning("DB_SAVE_FAILED", "원본은 조회했지만 DB 저장을 확인하지 못했습니다."));
      return response;
    }
    checkDeadline();
    let saved: CacheRecord | null;
    try { saved = await dependencies.read(query); }
    catch {
      response.meta.warnings.push(warning("DB_VERIFY_PENDING", "저장 후 재조회에 실패하여 대조가 완료되지 않았습니다."));
      return response;
    }
    if (!saved || !valid(saved, query)) {
      response.meta.verification = "failed";
      response.meta.warnings.push(warning("DB_VERIFY_FAILED", "저장본 대조에 실패하여 검증된 원본을 표시합니다."));
      return response;
    }
    if (Date.parse(saved.response.meta.fetchedAt) < Date.parse(fresh.response.meta.fetchedAt)) {
      response.meta.verification = "failed";
      response.meta.warnings.push(warning("DB_VERSION_BEHIND", "저장본 시각이 이전 버전이므로 원본을 표시합니다."));
      return response;
    }
    if (saved.response.meta.fetchedAt !== fresh.response.meta.fetchedAt) return cached(saved, false, [...warnings, warning("NEWER_COLLECTION", "더 최신 수집 결과가 저장되어 해당 버전을 표시합니다.")]);
    response.meta.verification = "passed";
    response.data = saved.response.data;
    return response;
  }
  try {
    return await Promise.race([run(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new KobisError("DATA_UNAVAILABLE", "요청 처리 시간이 초과됐습니다. 다시 시도해 주세요.", 503, true)), 20000); })]);
  } finally { clearTimeout(timer); }
}
