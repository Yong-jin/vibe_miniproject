import { describe, expect, it } from "vitest";
import { getKstYesterday, parseCalendarDate, resolveQueryPeriod } from "../lib/validation";

const now = new Date("2026-09-18T00:00:00+09:00");

describe("실제 달력 날짜 (AC04)", () => {
  it.each(["2024-02-29", "2000-02-29", "2026-01-31", "0099-01-01"])("%s는 유효하다", (date) => {
    expect(parseCalendarDate(date).toISOString().slice(0, 10)).toBe(date);
  });
  it.each(["2025-02-29", "1900-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-01", "2026-01-00", "2026-9-01", " 2026-09-01", "2026-09-01T00:00:00Z", "", "0000-01-01"])("%s를 거부한다", (date) => {
    expect(() => parseCalendarDate(date)).toThrow();
  });
});

describe("서버 시간대와 독립적인 KST 어제 (AC04)", () => {
  it.each([
    ["2026-09-17T14:59:59.999Z", "2026-09-16"],
    ["2026-09-17T15:00:00.000Z", "2026-09-17"],
    ["2025-12-31T15:00:00.000Z", "2025-12-31"],
    ["2024-02-29T15:00:00.000Z", "2024-02-29"],
  ])("%s → %s", (instant, expected) => expect(getKstYesterday(new Date(instant))).toBe(expected));
  it("잘못된 현재 시각을 거부한다", () => expect(() => getKstYesterday(new Date("invalid"))).toThrow());
});

describe("완료된 기간과 정규화 (AC04)", () => {
  it("어제 일간은 허용한다", () => expect(resolveQueryPeriod("2026-09-17", "daily", now)).toEqual({
    period: "daily", targetDate: "2026-09-17", rangeStart: "2026-09-17", rangeEnd: "2026-09-17",
  }));
  it.each(["2026-09-18", "2026-09-19"])("오늘·미래 %s를 거부한다", (date) => expect(() => resolveQueryPeriod(date, "daily", now)).toThrow());
  it.each(["2026-09-07", "2026-09-08", "2026-09-13"])("같은 주 %s는 같은 키다", (date) => expect(resolveQueryPeriod(date, "weekly", now)).toEqual({
    period: "weekly", targetDate: "2026-09-07", rangeStart: "2026-09-07", rangeEnd: "2026-09-13",
  }));
  it("주말은 금요일부터 일요일이다", () => expect(resolveQueryPeriod("2026-09-08", "weekend", now)).toEqual({
    period: "weekend", targetDate: "2026-09-07", rangeStart: "2026-09-11", rangeEnd: "2026-09-13",
  }));
  it.each(["weekly", "weekend"])("미완료 %s를 거부한다", (period) => expect(() => resolveQueryPeriod("2026-09-17", period, now)).toThrow(/끝나지/));
  it("일요일 당일의 주간은 미완료다", () => expect(() => resolveQueryPeriod("2026-09-11", "weekly", new Date("2026-09-13T23:59:59+09:00"))).toThrow());
  it("월요일 0시부터 직전 주간을 허용한다", () => expect(resolveQueryPeriod("2026-09-11", "weekly", new Date("2026-09-14T00:00:00+09:00")).rangeEnd).toBe("2026-09-13"));
  it("연도 경계의 주간을 계산한다", () => expect(resolveQueryPeriod("2025-12-31", "weekly", now)).toEqual({
    period: "weekly", targetDate: "2025-12-29", rangeStart: "2025-12-29", rangeEnd: "2026-01-04",
  }));
  it.each(["", "month", "DAILY"])("허용하지 않은 기간 %s를 거부한다", (period) => expect(() => resolveQueryPeriod("2026-09-17", period, now)).toThrow());
});
