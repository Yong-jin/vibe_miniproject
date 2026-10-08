import { expect, test } from "@playwright/test";

test("목록·검색·순위 보존·초기화", async ({ page }) => {
  let requests = 0;
  page.on("request", request => { if (request.url().includes("/api/box-office")) requests++; });
  await page.goto("/");
  await expect(page.getByRole("row")).toHaveCount(11);
  await expect(page.getByText("실제 영화·흥행 실적이 아닙니다.", { exact: false })).toBeVisible();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  const before = requests;
  await page.getByLabel("영화명 검색").fill("  바다  ");
  await expect(page.getByRole("row")).toHaveCount(2);
  await expect(page.getByRole("row").last().getByRole("cell").first()).toHaveText("2");
  await page.getByLabel("영화명 검색").fill("존재하지않는영화");
  await expect(page.getByText("검색 조건에 맞는 영화가 없습니다.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "검색 초기화" }).click();
  await expect(page.getByRole("row")).toHaveCount(11);
  expect(requests).toBe(before);
});
test("주간·주말 실제 기간과 빈 결과", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("조회 기간", { exact: true }).selectOption("weekly");
  await page.getByRole("button", { name: "조회하기" }).click();
  await expect(page.getByText("조회 기간: 2026-09-07 ~ 2026-09-13")).toBeVisible();
  await expect(page.getByRole("cell", { name: "700,000,000", exact: true })).toBeVisible();
  await page.getByLabel("조회 기간", { exact: true }).selectOption("weekend");
  await page.getByRole("button", { name: "조회하기" }).click();
  await expect(page.getByText("조회 기간: 2026-09-11 ~ 2026-09-13")).toBeVisible();
  await page.getByLabel("조회 날짜").fill("2026-09-06");
  await page.getByRole("button", { name: "조회하기" }).click();
  await expect(page.getByText("해당 기간에 제공된 박스오피스 데이터가 없습니다.", { exact: false })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
});
test("오류·재시도", async ({ page }) => {
  let fail = true;
  await page.route("**/api/box-office?**", route => fail ? route.fulfill({ status: 503, json: { error: { code: "DATA_UNAVAILABLE", message: "테스트 연결 실패", retryable: true } } }) : route.continue());
  await page.goto("/");
  await expect(page.getByRole("alert").filter({ hasText: "테스트 연결 실패" })).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "다시 시도" }).click();
  await expect(page.getByRole("row")).toHaveCount(11);
});
test("지연 응답과 조건 변경: 이전 응답이 덮어쓰지 않는다", async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/box-office?**", async route => {
    if (route.request().url().includes("date=2026-09-13")) {
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response }).catch(() => {});
    } else await route.continue();
  });
  await page.goto("/");
  await expect(page.getByText("박스오피스 데이터를 불러오는 중입니다…")).toBeVisible();
  await page.getByLabel("조회 날짜").fill("2026-09-12");
  await page.getByRole("button", { name: "조회하기" }).click();
  await expect(page.getByText("조회 기간: 2026-09-12 ~ 2026-09-12")).toBeVisible();
  release();
  await expect(page.getByText("조회 기간: 2026-09-13 ~ 2026-09-13")).toHaveCount(0);
});
test("모바일 표 스크롤·키보드 조작", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("row")).toHaveCount(11);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const region = page.getByRole("region", { name: "박스오피스 표, 가로 스크롤 가능" });
  expect(await region.evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.getByLabel("영화명 검색").focus();
  await page.keyboard.type("바다");
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "검색 초기화" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("row")).toHaveCount(11);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
test("잘못된 API 요청은 400", async ({ request }) => {
  const response = await request.get("/api/box-office?date=2026-02-30&period=daily");
  expect(response.status()).toBe(400);
  expect((await response.json()).error.fieldErrors.date).toBeTruthy();
});

test("네트워크 실패·잘못된 JSON은 빈 성공으로 표시하지 않는다", async ({ page }) => {
  await page.route("**/api/box-office?**", route => route.fulfill({ status: 200, contentType: "application/json", body: "broken-json" }));
  await page.goto("/");
  await expect(page.getByText("데이터를 불러오지 못했습니다.", { exact: false })).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
});
test("미완료 주간은 입력 안내로 거부한다", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-18T00:00:00+09:00"));
  await page.goto("/");
  await expect(page.getByRole("row")).toHaveCount(11);
  await page.getByLabel("조회 날짜").fill("2026-09-17");
  await page.getByLabel("조회 기간", { exact: true }).selectOption("weekly");
  await page.getByRole("button", { name: "조회하기" }).click();
  await expect(page.getByText("아직 끝나지 않은 기간입니다.", { exact: false })).toBeVisible();
  await expect(page.getByLabel("조회 날짜")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("table")).toHaveCount(0);
});
