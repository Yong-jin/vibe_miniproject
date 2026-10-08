export class KobisError extends Error {
  constructor(public code: "DATA_UNAVAILABLE" | "CONFIGURATION_ERROR" | "UPSTREAM_ERROR" | "UPSTREAM_TIMEOUT", message: string, public status: number, public retryable: boolean) { super(message); this.name = "KobisError"; }
}
export function invalidResponse(): never {
  throw new KobisError("UPSTREAM_ERROR", "영화 데이터의 형식이나 조회 기간을 확인할 수 없습니다. 다시 시도해 주세요.", 502, true);
}
