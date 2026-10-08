import {test,expect} from "@playwright/test";
test("insights demo totals, charts, top filter and incomplete range",async({page})=>{
 await page.goto("/insights");await expect(page.getByRole("status")).toContainText("조회 7/7일");
 await expect(page.getByText("3,850,000,000원",{exact:true})).toBeVisible();
 await expect(page.getByText("385,000명",{exact:true})).toBeVisible();
 await expect(page.getByText("10,000원/명",{exact:true})).toBeVisible();
 await expect(page.locator(".recharts-surface")).toHaveCount(2);
 await page.getByLabel("매출 순위").selectOption("10");await expect(page.getByRole("heading",{name:"기간 관측 매출 Top 10 (원)"})).toBeVisible();
 await page.getByLabel("최근 기간").selectOption("14");await expect(page.getByRole("status")).toContainText("조회 14/14일");await expect(page.getByRole("status")).toContainText("빈 날짜 7일");await expect(page.getByRole("heading",{name:"관측 매출 합계"})).toHaveCount(0);
});
test("failed dates retry and mobile keyboard",async({page})=>{
 let failed=true;
 await page.route("**/api/box-office?**",async route=>{if(failed&&route.request().url().includes("2026-09-10"))await route.fulfill({status:503,body:"{}"});else await route.continue();});
 await page.setViewportSize({width:390,height:844});await page.goto("/insights");await expect(page.getByRole("status")).toContainText("실패 1일");
 failed=false;await page.getByRole("button",{name:"실패 날짜 재시도"}).focus();await page.keyboard.press("Enter");await expect(page.getByRole("heading",{name:"관측 매출 합계"})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:"test-results/insights-mobile.png",fullPage:true});
});
test("rapid period changes ignore older responses",async({page})=>{
 await page.route("**/api/box-office?**",async route=>{await new Promise(r=>setTimeout(r,60));await route.continue().catch(()=>{});});
 await page.goto("/insights");await page.getByLabel("최근 기간").selectOption("30");await page.getByLabel("최근 기간").selectOption("7");await expect(page.getByRole("status")).toContainText("조회 7/7일");await expect(page.getByRole("heading",{name:"관측 매출 합계"})).toBeVisible();
 await page.screenshot({path:"test-results/insights-desktop.png",fullPage:true});
});
