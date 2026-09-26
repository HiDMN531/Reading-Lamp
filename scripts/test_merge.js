'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path');
const r=path.resolve(__dirname,'..'),read=n=>JSON.parse(fs.readFileSync(path.join(r,n),'utf8'));
const all=read('stories.json'),incoming=read('content/incoming-70.json'),drafts=read('content/additions-500.json'),map=read('content/id-map-learning-2.10.0.json');
const revised=new Map([...require('../content/editorial-batch-2.11.9d.json'),...require('../content/editorial-batch-2.11.9e.json'),...require('../content/editorial-batch-2.11.9f.json')].filter(x=>x.changed).map(x=>[x.id,x]));
for(let i=0;i<70;i++){
 const current=all[2000+i],original=incoming[i],record=revised.get(current.id);
 if(record){
  assert.deepEqual(record.before,original,'Editorial revision must preserve the incoming source');
  assert.deepEqual(record.after,current,'Editorial revision record must match the current story');
  assert.deepEqual({...current,text:original.text,wordCount:original.wordCount,reviewedAt:original.reviewedAt,contentType:original.contentType},original,'Editorial revision may only change text, count, date and content type');
 }else assert.deepEqual(current,original,'Unreviewed incoming stories must remain unchanged');
}
for(let i=0;i<500;i++){assert.equal(all[2070+i].text,drafts[i].text);assert.equal(map['s'+(2001+i)],all[2070+i].id)}
const convert=require('./convert_learning_backup');
const backup={history:[{storyId:'s2001',title:drafts[0].title,words:51}],seenStoryIds:['s001','s2001','s2500'],favoriteStoryIds:['s2002']};
const result=convert(backup);assert.equal(result.history[0].storyId,'s2071');assert.deepEqual(result.seenStoryIds,['s001','s2071','s2570']);assert.equal(result.favoriteStoryIds[0],'s2072');assert.equal(backup.history[0].storyId,'s2001');assert.throws(()=>convert(result));assert.throws(()=>convert({history:[{storyId:'s2001',title:incoming[0].title}]}));
const html=fs.readFileSync(path.join(r,'index.html'),'utf8'),sw=fs.readFileSync(path.join(r,'sw.js'),'utf8');assert(html.indexOf('src="learning-policy.js"')<html.indexOf('src="app.js"'));assert(sw.includes('"./learning-policy.js"'));
console.log(`Merge: incoming 70 baseline preserved with ${revised.size} recorded editorial revisions; 500 remapped; backup conversion and collision protection passed.`);
