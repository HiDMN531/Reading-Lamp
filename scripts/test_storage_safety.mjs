import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mime = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png'};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (!url.pathname.startsWith('/Reading-Lamp/')) throw Error('subpath');
    const file = decodeURIComponent(url.pathname.slice('/Reading-Lamp/'.length)) || 'index.html';
    const target = path.resolve(root, file);
    if (!target.startsWith(root + path.sep)) throw Error('path');
    const bytes = await fs.readFile(target);
    res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'}).end(bytes);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/Reading-Lamp/`;
const errors = [];
const passed = [];
let browser;

async function open(seed = {}) {
  const context = await browser.newContext({serviceWorkers:'block', viewport:{width:390,height:844}, timezoneId:'Asia/Tokyo'});
  await context.addInitScript(values => {
    if (!location.href.startsWith('http://127.0.0.1:') || localStorage.getItem('test-seeded')) return;
    localStorage.setItem('test-seeded', '1');
    localStorage.setItem('rl_onboarding_done_v1', '1');
    localStorage.setItem('rl_level', '1');
    Object.entries(values).forEach(([key,value]) => localStorage.setItem(key,value));
  }, seed);
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector('#storyCandidateList .story-candidate'));
  await page.evaluate(() => rewardEvaluationChain);
  return {context, page};
}

async function failHistoryWrites(page, enabled) {
  await page.evaluate(block => {
    if (!window.auditSetItem) window.auditSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = block ? function(key, value) {
      if (key === 'rl_history') throw new DOMException('Audit quota fault', 'QuotaExceededError');
      return window.auditSetItem.call(this, key, value);
    } : window.auditSetItem;
  }, enabled);
}

async function begin(page) {
  await page.locator('#storyCandidateList .story-candidate').first().click();
  await page.locator('#view-reading:not([hidden])').waitFor();
}

try {
  browser = await chromium.launch({headless:true, ...(process.env.READING_LAMP_BROWSER_PATH ? {executablePath:process.env.READING_LAMP_BROWSER_PATH} : {})});

  // Use the browser's actual storage quota, then run the real startup repair.
  {
    const {context,page} = await open();
    const raw = JSON.stringify([{date:'2026-10-05T00:00:00.000Z', title:'Valid', words:100, level:1}, {date:'invalid', text:'z'.repeat(100000)}]);
    await page.evaluate(original => {
      localStorage.setItem('rl_history', original);
      for (let i = 0; i < 10000; i++) {
        try { localStorage.setItem(`audit-fill-${i}`, 'x'.repeat(10000)); }
        catch { break; }
      }
    }, raw);
    await page.reload();
    await page.waitForFunction(() => typeof startupHistoryRepair !== 'undefined');
    const state = await page.evaluate(() => ({repair:startupHistoryRepair, raw:localStorage.getItem(LS.history), recovery:localStorage.getItem(LS.historyRecovery), valid:getHistory().length}));
    assert.equal(state.repair.backupSaved, false);
    assert.equal(state.repair.historySaved, false);
    assert.equal(state.raw, raw);
    assert.equal(state.recovery, null);
    assert.equal(state.valid, 1);
    // Later normal writes must not bypass the recovery guard.
    assert.equal(await page.evaluate(() => pushHistory({date:'2026-10-06T00:00:00.000Z', title:'New', words:50, level:1})), false);
    assert.equal(await page.evaluate(() => localStorage.getItem(LS.history)), raw);
    await page.locator('#settingsBtn').click();
    await page.locator('#dismissHistoryRecoveryBtn').click();
    assert.equal(await page.evaluate(() => Boolean(pendingHistoryRecovery)), true);
    assert.equal(await page.evaluate(() => localStorage.getItem(LS.history)), raw);
    // Capacity restored: retire the guard only after durable recovery exists.
    const recovered = await page.evaluate(() => {
      Object.keys(localStorage).filter(k => k.startsWith('audit-fill-')).forEach(k => localStorage.removeItem(k));
      const saved = writeHistory(getHistory());
      return {saved, history:JSON.parse(localStorage.getItem(LS.history)).length, original:JSON.parse(localStorage.getItem(LS.historyRecovery)).originalHistory};
    });
    assert.equal(recovered.saved, true);
    assert.equal(recovered.history, 2);
    assert.equal(recovered.original, raw);
    await context.close();
    passed.push('real quota: original preserved; subsequent writes guarded; recovery retried');
  }

  // Failure must retain the durable calibrate draft across a reload.
  {
    const {context,page} = await open();
    await begin(page);
    await page.locator('#finishReadingBtn').click();
    const draft = await page.evaluate(() => localStorage.getItem(LS.activeReading));
    await failHistoryWrites(page, true);
    await page.locator('.calibrate-btn[data-fb="just"]').click();
    assert.equal(await page.evaluate(() => localStorage.getItem(LS.activeReading)), draft);
    assert.equal(await page.locator('#view-calibrate').isVisible(), true);
    await page.reload();
    await page.locator('#resumeReadingBtn').click();
    await page.locator('#view-calibrate:not([hidden])').waitFor();
    await page.locator('.calibrate-btn[data-fb="just"]').click();
    await page.locator('#view-summary:not([hidden])').waitFor();
    assert.equal(await page.evaluate(() => getHistory().length), 1);
    assert.equal(await page.evaluate(() => localStorage.getItem(LS.activeReading)), null);
    await context.close();
    passed.push('failed completion: draft survives reload and completion can resume');
  }

  // Same-session retries must neither duplicate records nor advance the easy streak.
  {
    const {context,page} = await open();
    await begin(page);
    await page.locator('#finishReadingBtn').click();
    await failHistoryWrites(page, true);
    for (let i=0; i<3; i++) await page.locator('.calibrate-btn[data-fb="easy"]').click();
    assert.deepEqual(await page.evaluate(() => ({count:getHistory().length, level:getLevel(), streak:getLevelSignals().easyStreak})), {count:1, level:1, streak:0});
    await failHistoryWrites(page, false);
    await page.locator('.calibrate-btn[data-fb="easy"]').click();
    await page.locator('#view-summary:not([hidden])').waitFor();
    await page.evaluate(() => finishSession('easy'));
    assert.deepEqual(await page.evaluate(() => ({count:getHistory().length, stored:JSON.parse(localStorage.getItem(LS.history)).length, streak:getLevelSignals().easyStreak})), {count:1, stored:1, streak:1});
    await context.close();
    passed.push('completion retry: one record and one feedback adjustment');
  }

  {
    const {context,page} = await open();
    await begin(page);
    const id = await page.evaluate(() => session._bankId);
    await failHistoryWrites(page, true);
    await page.locator('#abandonBtn').click();
    for (let i=0; i<2; i++) await page.locator('[data-abandon-reason="too-hard"]').click();
    assert.equal(await page.locator('#abandonModal').isVisible(), true);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem(LS.activeReading)).story._bankId), id);
    await failHistoryWrites(page, false);
    await page.locator('[data-abandon-reason="too-hard"]').click();
    await page.locator('#abandonModal').waitFor({state:'hidden'});
    assert.deepEqual(await page.evaluate(() => ({count:getHistory().length, abandoned:getHistory()[0].abandoned, id:getHistory()[0].storyId})), {count:1, abandoned:true, id});
    await context.close();
    passed.push('abandonment failure: retain draft; retry once before next story');
  }

  for (const feedback of ['hard','just','easy','abandon']) {
    const {context,page} = await open();
    await begin(page);
    await page.locator('#settingsBtn').click();
    await page.locator('#levelInput').fill('5');
    await page.locator('#saveSettingsBtn').click();
    if (feedback === 'abandon') {
      await page.locator('#abandonBtn').click();
      await page.locator('[data-abandon-reason="too-hard"]').click();
      await page.locator('#abandonModal').waitFor({state:'hidden'});
    } else {
      await page.locator('#finishReadingBtn').click();
      await page.locator(`.calibrate-btn[data-fb="${feedback}"]`).click();
    }
    assert.deepEqual(await page.evaluate(() => ({recorded:getHistory()[0].level, next:getLevel(), levelAfter:getHistory()[0].levelAfter})), {recorded:1, next:5, levelAfter:5});
    await context.close();
    passed.push(`manual level + ${feedback}: record actual text level; retain next preference`);
  }

  {
    const {context,page} = await open();
    const levels = await page.evaluate(async () => {
      const result=[];
      for(const feedback of ['easy','easy','easy','hard']) {
        beginOfflineStory(STORY_BANK.find(s => s.level === getLevel()));
        session._elapsedSec=60;
        finishSession(feedback);
        await rewardEvaluationChain;
        result.push(getLevel());
      }
      return result;
    });
    assert.deepEqual(levels, [1,1,2,1]);
    await context.close();
    passed.push('normal feedback progression: three easy readings raise; hard lowers');
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({browser:browser.version(), passed, runtimeErrors:0}, null, 2));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
