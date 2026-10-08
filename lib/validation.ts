export type Period = "daily" | "weekly" | "weekend";
export type QueryPeriod = { period: Period; targetDate: string; rangeStart: string; rangeEnd: string };

const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Parse only actual YYYY-MM-DD calendar dates; Date's rollover is not validation. */
export function parseCalendarDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) {
    throw new Error("날짜는 YYYY-MM-DD 형식의 실제 날짜여야 합니다.");
  }
  const parsed = new Date(value + "T00:00:00.000Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("달력에 존재하지 않는 날짜입니다.");
  }
  return parsed;
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function getKstYesterday(now: Date = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error("현재 시각이 올바르지 않습니다.");
  return formatDate(new Date(now.getTime() + KST_OFFSET_MS - DAY_MS));
}

/** Pure validation shared by the future UI and Route Handler; no external I/O. */
export function resolveQueryPeriod(date: string, period: string, now: Date = new Date()): QueryPeriod {
  const selected = parseCalendarDate(date);
  if (period !== "daily" && period !== "weekly" && period !== "weekend") {
    throw new Error("기간은 daily, weekly, weekend 중 하나여야 합니다.");
  }
  const yesterday = getKstYesterday(now);
  if (date > yesterday) throw new Error("한국 시간 기준 어제까지 선택할 수 있습니다.");
  if (period === "daily") return { period, targetDate: date, rangeStart: date, rangeEnd: date };

  const monday = new Date(selected.getTime() - ((selected.getUTCDay() + 6) % 7) * DAY_MS);
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const rangeEnd = formatDate(sunday);
  if (monday.getUTCFullYear() < 1) throw new Error("지원하는 연도 범위를 벗어난 기간입니다.");
  if (rangeEnd > yesterday) throw new Error("아직 끝나지 않은 기간입니다. 완료된 주간·주말을 선택해 주세요.");
  return {
    period,
    targetDate: formatDate(monday),
    rangeStart: period === "weekly" ? formatDate(monday) : formatDate(new Date(monday.getTime() + 4 * DAY_MS)),
    rangeEnd,
  };
}
