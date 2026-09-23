import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const target = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  if (!target.startsWith(`${root}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }
  try {
    const body = await readFile(target);
    response.writeHead(200, { "Content-Type": mime[path.extname(target)] || "application/octet-stream" }).end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;

try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.READING_LAMP_BROWSER || chromium.executablePath(),
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  const page = await context.newPage();
  await page.goto(origin);
  await page.locator("#onboardingModal:not([hidden])").waitFor();
  assert.equal(await page.locator('input[name="onboardingLevelSample"]:checked').inputValue(), "1");
  assert.equal(await page.locator("#onboardingGoalSelect").inputValue(), "100");
  await page.locator("#onboardingNextBtn").click();
  await page.locator("#onboardingNextBtn").click();
  await page.locator("#onboardingFinishBtn").click();
  await page.locator("#storyCandidateList .story-candidate").first().waitFor();
  assert.equal(await page.locator("#statLevel").textContent(), "1");
  assert.equal(await page.locator("#storyCandidateList .story-candidate").count(), 1);
  assert.match(await page.locator("#storyCandidatesTitle").textContent(), /1篇目/);
  assert.match(await page.locator("#storyCandidateList").textContent(), /A Cup for Two/);
  assert.equal(await page.locator("#view-home #modeNote, #view-home #offlineStatus").count(), 0);
  await page.locator("#settingsBtn").click();
  await page.locator("#settingsModal:not([hidden])").waitFor();
  assert.match(await page.locator("#settingsModal #modeNote").textContent(), /オフライン文章バンク/);
  assert.equal(await page.locator("#settingsModal #offlineStatus").isVisible(), true);
  await page.locator("#closeSettingsIconBtn").click();

  await page.locator("#storyCandidateList .story-candidate").click();
  await page.locator("#view-reading:not([hidden])").waitFor();
  await page.locator("#finishReadingBtn").click();
  await page.locator('.calibrate-btn[data-fb="just"]').click();
  await page.locator("#view-summary:not([hidden])").waitFor();
  assert.match(await page.locator("#summaryHeadline").textContent(), /英語だけで1篇読めました/);
  assert.equal(await page.locator("#summaryWpmCell").isHidden(), true);

  await page.locator("#homeBtn").click();
  await page.locator("#storyCandidateList .story-candidate").first().waitFor();
  assert.equal(await page.locator("#storyCandidateList .story-candidate").count(), 1);
  assert.match(await page.locator("#storyCandidatesTitle").textContent(), /2篇目/);
  await page.locator("#storyCandidateList .story-candidate").click();
  const difficultTitle = await page.locator("#readingTitle").textContent();
  await page.locator("#abandonBtn").click();
  await page.locator('[data-abandon-reason="too-hard"]').click();
  await page.locator("#view-reading:not([hidden])").waitFor();
  assert.notEqual(await page.locator("#readingTitle").textContent(), difficultTitle);
  assert.equal(await page.locator("#statLevel").textContent(), "1");
  assert.match(await page.locator("#errorToast").textContent(), /短い文章/);

  const returning = await browser.newContext({ serviceWorkers: "block" });
  await returning.addInitScript(() => {
    localStorage.setItem("rl_onboarding_done_v1", "1");
    localStorage.setItem("rl_level", "5");
    localStorage.setItem("rl_daily_goal", "1500");
  });
  const oldPage = await returning.newPage();
  await oldPage.goto(origin);
  await oldPage.locator("#storyCandidateList .story-candidate").first().waitFor();
  assert.equal(await oldPage.locator("#statLevel").textContent(), "5");
  assert.match(await oldPage.locator("#milestoneCaption").textContent(), /1,500/);
  assert.equal(await oldPage.locator("#storyCandidateList .story-candidate").count(), 3);
  assert.equal(await oldPage.locator("#onboardingModal").isHidden(), true);

  const graduated = await browser.newContext({ serviceWorkers: "block" });
  await graduated.addInitScript(() => {
    localStorage.setItem("rl_onboarding_done_v1", "1");
    localStorage.setItem("rl_level", "1");
    localStorage.setItem("rl_seen_story_ids", JSON.stringify(Array.from({ length: 10 }, (_, index) => `s${2001 + index}`)));
    localStorage.setItem("rl_history", JSON.stringify(Array.from({ length: 10 }, (_, index) => ({
      date: new Date(Date.now() - index * 86400000).toISOString(),
      topic: "Everyday life",
      title: `Read ${index + 1}`,
      words: 40,
      wpm: 80,
      level: 1,
      abandoned: false,
    }))));
  });
  const graduatedPage = await graduated.newPage();
  await graduatedPage.goto(origin);
  await graduatedPage.locator("#storyCandidateList .story-candidate").first().waitFor();
  assert.equal(await graduatedPage.locator("#storyCandidateList .story-candidate").count(), 3);
  assert.match(await graduatedPage.locator("#storyCandidatesTitle").textContent(), /この3篇/);
  assert.match(await graduatedPage.locator("#storyCandidateList").textContent(), /The Blue Umbrella/);

  const autumn = await browser.newContext({ serviceWorkers: "block" });
  await autumn.addInitScript(() => {
    const RealDate = Date;
    const fixedTime = new RealDate(2026, 8, 23, 12, 0, 0).getTime();
    class FixedDate extends RealDate {
      constructor(...args) { super(...(args.length ? args : [fixedTime])); }
      static now() { return fixedTime; }
    }
    window.Date = FixedDate;
    localStorage.setItem("rl_onboarding_done_v1", "1");
    localStorage.setItem("rl_level", "1");
  });
  const autumnPage = await autumn.newPage();
  await autumnPage.goto(origin);
  await autumnPage.locator("#autumnEvent:not([hidden])").waitFor();
  await autumnPage.locator("#storyCandidateList .story-candidate").first().waitFor();
  assert.match(await autumnPage.locator("#autumnEventMessage").textContent(), /1篇目/);
  assert.doesNotMatch(await autumnPage.locator("#storyCandidateList").textContent(), /The Red Leaf|A Squirrel in the Park/);
  await autumnPage.locator("#startAutumnEventBtn").click();
  await autumnPage.locator("#view-reading:not([hidden])").waitFor();
  assert.match(await autumnPage.locator("#readingTitle").textContent(), /The Red Leaf|A Squirrel in the Park/);
  await autumnPage.locator("#finishReadingBtn").click();
  await autumnPage.locator('.calibrate-btn[data-fb="just"]').click();
  await autumnPage.locator("#view-summary:not([hidden])").waitFor();
  for (let index = 0; index < 5 && !await autumnPage.locator("#rewardToast").isHidden(); index += 1) {
    await autumnPage.locator("#rewardToastNextBtn").click();
  }
  await autumnPage.locator("#homeBtn").click({ force: true });
  assert.equal(await autumnPage.locator("#autumnEventCount").textContent(), "1 / 10篇");
  assert.equal(await autumnPage.locator('[data-autumn-step="1"]').getAttribute("class"), "is-complete");
  await autumn.close();
  await graduated.close();
  await returning.close();
  await context.close();
  console.log("Reading UI: compact home, offline settings, beginner flow, tenth-story transition, autumn event — passed");
} finally {
  if (browser) await browser.close();
  server.close();
}
