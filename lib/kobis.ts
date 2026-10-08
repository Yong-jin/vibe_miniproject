import "server-only";
import type { BoxOfficeResponse } from "./types";
import type { QueryPeriod } from "./validation";
import { parseKobisResponse } from "./kobis-parser";
import { KobisError } from "./kobis-error";

export async function fetchKobis(query: QueryPeriod): Promise<BoxOfficeResponse> { return (await fetchKobisSnapshot(query)).response; }
export async function fetchKobisSnapshot(query: QueryPeriod): Promise<import("./cache-types").Snapshot> {
  const key = process.env.KOBIS_API_KEY?.trim();
  if (!key) throw new KobisError("CONFIGURATION_ERROR", "서버에 KOBIS_API_KEY를 설정해 주세요.", 503, false);
  const endpoint = query.period === "daily" ? "searchDailyBoxOfficeList" : "searchWeeklyBoxOfficeList";
  const url = new URL("https://www.kobis.or.kr/kobisopenapi/webservice/rest/boxoffice/" + endpoint + ".json");
  url.searchParams.set("key", key);
  url.searchParams.set("targetDt", query.targetDate.replaceAll("-", ""));
  url.searchParams.set("itemPerPage", "10");
  if (query.period !== "daily") url.searchParams.set("weekGb", query.period === "weekly" ? "0" : "1");
  const fetchedAt = new Date().toISOString();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new KobisError("UPSTREAM_TIMEOUT", "KOBIS 응답이 지연되고 있습니다. 다시 시도해 주세요.", 504, true));
      controller.abort();
    }, 5000);
  });
  try {
    return await Promise.race([timeout, (async () => {
      // Never log this URL, fetch exceptions, or raw upstream bodies: they may contain the key.
      const response = await fetch(url, { signal: controller.signal, cache: "no-store", redirect: "error" });
      if (!response.ok) throw new KobisError("UPSTREAM_ERROR", "KOBIS에서 데이터를 가져오지 못했습니다. 다시 시도해 주세요.", 502, response.status !== 401 && response.status !== 403);
      const rawResponse: unknown = await response.json();
      const items = parseKobisResponse(rawResponse, query);
      return { rawResponse, response: {
        data: { ...query, status: items.length ? "success" as const : "empty" as const, items },
        meta: { source: "kobis" as const, fetchedAt, stale: false, persistence: "not-attempted" as const, verification: "pending" as const,
          warnings: [] },
      } };
    })()]);
  } catch (error) {
    if (error instanceof KobisError) throw error;
    throw new KobisError("UPSTREAM_ERROR", "KOBIS 응답을 처리하지 못했습니다. 다시 시도해 주세요.", 502, true);
  } finally { clearTimeout(timer); }
}
