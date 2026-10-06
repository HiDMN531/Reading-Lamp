import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline='f443f92886f58e4fe2520baf0f7c4092304fff31';
const bank=JSON.parse(await fs.readFile(path.join(root,'stories.json'),'utf8'));
const oldAssets=new Map();
// Update scenarios use the actual previous app and bank, not a simulated UI.
for(const file of execFileSync('git',['ls-tree','-r','--name-only',baseline],{cwd:root,encoding:'utf8'}).trim().split('\n'))
 oldAssets.set(file,execFileSync('git',['show',baseline+':'+file],{cwd:root,maxBuffer:16*1024*1024}));
let generation='current';
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1'),prefix='/Reading-Lamp/';
  if(!url.pathname.startsWith(prefix))throw Error('subpath');
  const file=decodeURIComponent(url.pathname.slice(prefix.length))||'index.html',target=path.resolve(root,file);
  if(!target.startsWith(root+path.sep))throw Error('path');
  const bytes=generation==='baseline'&&oldAssets.has(file)?oldAssets.get(file):await fs.readFile(target);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404).end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/Reading-Lamp/`;
const oldHistory=Array.from({length:10},(_,i)=>({date:new Date(Date.now()-i*86400000).toISOString(),topic:'History',title:'Earlier '+i,storyId:i%2?'s2070':'s001',words:100,wpm:100,activeSeconds:60,wpmValid:true,level:5,abandoned:false}));
const seed={rl_onboarding_done_v1:'1',rl_level:'10',rl_preferred_topic:'Mystery and adventure',rl_daily_goal:'200',rl_history:JSON.stringify(oldHistory),rl_favorite_story_ids:JSON.stringify(['s001','s2070']),rl_seen_story_ids:JSON.stringify(bank.filter(s=>s.level===10&&s.topic==='Mystery and adventure'&&s.id!=='s3000').map(s=>s.id))};
const errors=[];let browser;
async function context(viewport={width:390,height:844}){
 const c=await browser.newContext({viewport,acceptDownloads:true,timezoneId:'Asia/Tokyo'});
 await c.addInitScript(values=>{if(!location.href.startsWith('http://127.0.0.1:'))return;if(!localStorage.getItem('reading_lamp_test_seeded')){Object.entries(values).forEach(([k,v])=>localStorage.setItem(k,v));localStorage.setItem('reading_lamp_test_seeded','1');}},seed);
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);return {c,p};
}
async function ready(p){await p.waitForFunction(()=>typeof loadStoryBank==='function'&&document.querySelector('#storyCandidateList .story-candidate'));}
async function offlineReady(p){await p.waitForFunction(async()=>{try{return (await serviceWorkerMessage('OFFLINE_STATUS')).current===true}catch{return false}},{},{timeout:30000});}
async function chooseLast(p){
 await p.evaluate(()=>{localStorage.removeItem('rl_active_reading_v1');localStorage.setItem('rl_level','10');localStorage.setItem('rl_preferred_topic','Mystery and adventure');topicSelect.value='Mystery and adventure';lastBankStoryId=null;set(LS.seenStoryIds,JSON.stringify((STORY_BANK||[]).filter(s=>s.level===10&&s.topic==='Mystery and adventure'&&s.id!=='s3000').map(s=>s.id)));renderStoryCandidates();});
 await p.waitForFunction(()=>document.querySelector('#storyCandidateList .story-candidate-title')?.textContent==='The Unopened Letter inside a Glass Bottle');
 await p.locator('#storyCandidateList .story-candidate').first().click();
 await p.locator('#view-reading:not([hidden])').waitFor();
 assert.equal(await p.locator('#readingTitle').innerText(),bank.at(-1).title);
 assert.equal((await p.locator('#readingText').innerText()).replace(/\s+/g,' ').trim(),bank.at(-1).text.replace(/\s+/g,' ').trim());
}
try{
 browser=await chromium.launch({headless:true,...(process.env.READING_LAMP_BROWSER_PATH?{executablePath:process.env.READING_LAMP_BROWSER_PATH}:{}),args:JSON.parse(process.env.READING_LAMP_BROWSER_ARGS||'[]')});
 const {c,p}=await context();await p.goto(url);await ready(p);
 const loaded=await p.evaluate(async()=>{const b=await loadStoryBank();return {count:b.length,newIds:b.slice(2570).map(s=>s.id),status:document.getElementById('premiumStatus').textContent,version:APP_VERSION};});
 assert.equal(loaded.count,3000);assert.deepEqual(loaded.newIds,bank.slice(2570).map(s=>s.id));assert(loaded.status.includes('3,000'));assert.equal(loaded.version,'2.11.19');
 await chooseLast(p);await p.locator('#favoriteBtn').click();await p.locator('#finishReadingBtn').click();await p.locator('.calibrate-btn[data-fb="just"]').click();await p.locator('#view-summary:not([hidden])').waitFor();
 const completed=await p.evaluate(()=>({history:getHistory(),favorites:getFavoriteIds()}));assert.equal(completed.history.length,11);assert.equal(completed.history[0].storyId,'s3000');assert.equal(completed.history[0].words,252);assert(completed.favorites.includes('s3000'));assert(completed.favorites.includes('s001'));
 await p.locator('#homeBtn').click();await p.locator('#settingsBtn').click();const downloadEvent=p.waitForEvent('download');await p.locator('#exportBtn').click();const downloaded=await downloadEvent;
 const backup=JSON.parse(await fs.readFile(await downloaded.path(),'utf8'));assert.equal(backup.appVersion,'2.11.19');assert.equal(backup.corpusVersion,'reviewed-2026-10-06-stock-3000');assert.equal(backup.schemaVersion,5);assert(backup.favoriteStoryIds.includes('s3000'));
 assert.equal(await p.evaluate(()=>localStorage.getItem('rl_last_backup_at_v1')),null);await p.locator('#confirmBackupBtn').click();assert(await p.evaluate(()=>Boolean(localStorage.getItem('rl_last_backup_at_v1'))));
 const older={...backup,appVersion:'2.11.18',corpusVersion:'reviewed-2026-10-01-length-s2063-s2070',history:oldHistory,favoriteStoryIds:['s001','s2070'],seenStoryIds:['s001','s2070']};
 await p.evaluate(()=>{localStorage.removeItem('rl_history');localStorage.removeItem('rl_favorite_story_ids');localStorage.removeItem('rl_seen_story_ids');});p.once('dialog',d=>d.accept());
 await p.locator('#restoreInput').setInputFiles({name:'older-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(older))});
 await p.waitForFunction(()=>getHistory().length===10&&getFavoriteIds().includes('s2070'));assert.deepEqual(await p.evaluate(()=>getFavoriteIds()),['s001','s2070']);assert.equal(await p.evaluate(()=>localStorage.getItem('rl_daily_goal')),'200');
 await p.locator('#closeSettingsBtn').click();await offlineReady(p);await c.setOffline(true);await p.reload();await ready(p);assert.equal(await p.evaluate(async()=>(await loadStoryBank()).length),3000);await chooseLast(p);await c.close();
 // Actual v102 -> v103 transition, with a network loss after shell install.
 generation='baseline';const {c:upgrade,p:up}=await context({width:1280,height:800});await up.goto(url);await ready(up);await offlineReady(up);await up.reload();await ready(up);await offlineReady(up);await up.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));assert.equal(await up.evaluate(async()=>(await loadStoryBank()).length),2570);
 const oldSaved=await up.evaluate(()=>({history:getHistory(),favorites:getFavoriteIds()}));generation='current';
 await up.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
 await up.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting),{},{timeout:30000});
 await up.locator('#updateToast:not([hidden])').waitFor();await upgrade.setOffline(true);await up.locator('#applyUpdateBtn').click();
 await up.waitForFunction(()=>typeof APP_VERSION!=='undefined'&&APP_VERSION==='2.11.19');await ready(up);assert.equal(await up.evaluate(async()=>(await loadStoryBank()).length),2570);
 assert((await up.evaluate(()=>caches.keys())).includes('reading-lamp-v102'));assert.deepEqual(await up.evaluate(()=>({history:getHistory(),favorites:getFavoriteIds()})),oldSaved);
 await up.locator('#storyCandidateList .story-candidate').first().click();await up.locator('#view-reading:not([hidden])').waitFor();
 const activeBefore=await up.evaluate(()=>({id:session._bankId,title:readingTitle.textContent,text:readingText.textContent}));
 await upgrade.setOffline(false);await up.evaluate(()=>prepareOfflineContent(false));await offlineReady(up);
 // The new saved bank must become selectable immediately, without a second reload.
 assert.equal(await up.evaluate(async()=>(await loadStoryBank()).length),3000);
 assert.deepEqual(await up.evaluate(()=>({id:session._bankId,title:readingTitle.textContent,text:readingText.textContent})),activeBefore);
 assert.deepEqual(await up.evaluate(()=>({history:getHistory(),favorites:getFavoriteIds()})),oldSaved);
 await up.locator('#finishReadingBtn').click();await up.locator('.calibrate-btn[data-fb="just"]').click();await up.locator('#homeBtn').click();await chooseLast(up);
 assert(!(await up.evaluate(()=>caches.keys())).includes('reading-lamp-v102'));await upgrade.close();
 const {c:desktop,p:dp}=await context({width:1280,height:800});await dp.goto(url);await ready(dp);await dp.locator('#openRewardsBtn').click();await dp.locator('#rewardsModal:not([hidden])').waitFor();assert.equal(await dp.evaluate(async()=>(await loadRewards()).length),103);await desktop.close();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({browser:browser.version(),subpath:'/Reading-Lamp/',published3000:'passed',new430Loaded:'passed',mobileLastStory:'passed',completionAndFavorite:'passed',oldBackupRestore:'passed',offline3000:'passed',interruptedUpdateFallback:'passed',updatedBankWithoutReload:'passed',activeReadingDuringBankRefresh:'preserved',oldHistoryAndFavorites:'preserved',desktopRewards103:'passed',runtimeErrors:0}));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
