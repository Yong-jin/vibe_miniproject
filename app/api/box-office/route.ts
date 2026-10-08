import { getBoxOffice } from "@/lib/box-office";
import { KobisError } from "@/lib/kobis-error";
import { getDemoResponse } from "@/lib/demo";
import { resolveQueryPeriod } from "@/lib/validation";
import type { ApiError } from "@/lib/types";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function fail(message: string, field: "date" | "period" | "query") {
  const error: ApiError = { code: "INVALID_REQUEST", message, retryable: false, fieldErrors: { [field]: message } };
  return Response.json({ error }, { status: 400, headers });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => key !== "date" && key !== "period")) return fail("지원하지 않는 요청 항목이 있습니다.", "query");
  if (params.getAll("date").length !== 1) return fail("날짜를 한 번만 지정해 주세요.", "date");
  if (params.getAll("period").length !== 1) return fail("기간을 한 번만 지정해 주세요.", "period");
  const date = params.get("date")!;
  const period = params.get("period")!;
  if (!["daily", "weekly", "weekend"].includes(period)) return fail("일간·주간·주말 중 선택해 주세요.", "period");
  let query;
  try { query = resolveQueryPeriod(date, period); }
  catch (error) { return fail(error instanceof Error ? error.message : "조회 날짜를 확인해 주세요.", "date"); }

  const mode = process.env.DATA_MODE ?? "live";
  if (mode === "demo") return Response.json(getDemoResponse(query), { headers });
  if (mode !== "live") return Response.json({ error: { code: "CONFIGURATION_ERROR", message: "DATA_MODE는 live 또는 demo여야 합니다.", retryable: false } }, { status: 503, headers });
  try {
    return Response.json(await getBoxOffice(query), { headers });
  } catch (error) {
    if (error instanceof KobisError) return Response.json({ error: { code: error.code, message: error.message, retryable: error.retryable } }, { status: error.status, headers });
    return Response.json({ error: { code: "INTERNAL_ERROR", message: "데이터 처리 중 오류가 발생했습니다.", retryable: false } }, { status: 500, headers });
  }
}