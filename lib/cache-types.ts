import type { BoxOfficeResponse } from "./types";
export type Snapshot = { response: BoxOfficeResponse; rawResponse: unknown };
export type CacheRecord = Snapshot & { expiresAt: string; rowCount: number; schemaVersion: number };
