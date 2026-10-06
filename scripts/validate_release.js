'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),json=f=>JSON.parse(read(f));
const stories=json('stories.json'),rewards=json('rewards.json'),pkg=json('package.json'),manifest=json('manifest.json');
assert.equal(stories.length,3000);assert.equal(rewards.length,103);
// Canonical content hash of the previously published 2570 records, including metadata.
assert.equal(crypto.createHash('sha256').update(JSON.stringify(stories.slice(0,2570))).digest('hex'),'1abe84ce6a921600d81ced1c049d1f68d1a5f99e276c49a3fe57f8619fedaa4f');
const ids=new Set(),titles=new Set(),bodies=new Set(),topics=new Set();
for(const s of stories){
 assert.equal(s.editorialStatus,'published',s.id);assert(s.factChecked,s.id);
 assert.equal(s.wordCount,s.text.trim().split(/\s+/).length,s.id);
 assert.equal(s.id,`s${String(ids.size+1).padStart(3,'0')}`);
 assert(!ids.has(s.id));assert(!titles.has(s.title.trim().toLowerCase()));
 const body=s.text.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();assert(!bodies.has(body),s.id);
 ids.add(s.id);titles.add(s.title.trim().toLowerCase());bodies.add(body);topics.add(s.topic);
 assert(Number.isInteger(s.level)&&s.level>=1&&s.level<=10);
}
assert.equal(topics.size,10);assert.equal(stories.reduce((n,s)=>n+s.wordCount,0),415357);
const additions=stories.slice(2570),policy=require('../learning-policy.js');
for(const s of additions){const a=policy.inspect(s);assert.deepEqual(a.errors,[],s.id);assert.deepEqual(a.warnings,[],s.id);assert.equal(s.textSha256,crypto.createHash('sha256').update(s.text).digest('hex'),s.id);}
for(let l=1;l<=10;l++)assert.equal(additions.filter(s=>s.level===l).length,43);
for(const t of topics)assert.equal(additions.filter(s=>s.topic===t).length,43);
for(const f of ['app.js','sw.js','premium.js','learning-policy.js'])new vm.Script(read(f),{filename:f});
assert.equal(pkg.version,'2.11.20');assert(read('app.js').includes(`const APP_VERSION = "${pkg.version}";`));
assert(read('index.html').includes('Reading Lamp Premium v'+pkg.version));
assert(read('sw.js').includes('const CACHE_NAME = "reading-lamp-v104";'));
assert(read('app.js').includes('reviewed-2026-10-06-stock-3000'));
for(const f of ['app.js','index.html','manifest.json','terms.html'])assert(!/2,570篇|stories: 2570/.test(read(f)),f);
assert(read('README.md').includes('全3,000篇・415,357語'));
assert(manifest.description.includes('3,000篇'));
// Every asset cached by the worker must exist under the GitHub Pages subpath.
for(const m of read('sw.js').matchAll(/"\.\/(.*?)"/g)){if(m[1])assert(fs.existsSync(path.join(root,m[1])),m[1]);}
const html=read('index.html');for(const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(!/^\w+:|^\//.test(m[1]))assert(fs.existsSync(path.join(root,m[1])),m[1]);}
console.log(JSON.stringify({version:pkg.version,stories:stories.length,words:415357,published:3000,original2570:'unchanged',additions:430,levels:10,topics:10,rewards:103,syntax:'passed'}));
