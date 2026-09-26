#!/usr/bin/env node
'use strict';
// Explicitly for the separate 2500-story learning edition, NOT v2.10.9.
const fs=require('fs'),map=require('../content/id-map-learning-2.10.0.json');
function convert(input){
 if(input.corpusVersion && input.corpusVersion!=='learning-2.10.0')throw Error('This backup has a different corpus version; do not convert it twice.');
 const data=JSON.parse(JSON.stringify(input));
 const history=Array.isArray(data)?data:data.history;
 if(!Array.isArray(history))throw Error('Expected a Reading Lamp history or backup package');
 const originals=require('../content/additions-500.json');
 const oldTitles=new Map(originals.map(s=>['s'+(Number(s.id.slice(1))-70),s.title]));
 for(const e of history){if(map[e.storyId]&&e.title&&e.title!==oldTitles.get(e.storyId))throw Error('Story/title conflict: this is not a learning-2.10.0 backup');if(map[e.storyId])e.storyId=map[e.storyId];}
 if(!Array.isArray(data)){for(const field of ['favoriteStoryIds','seenStoryIds'])if(Array.isArray(data[field]))data[field]=data[field].map(id=>map[id]||id);data.corpusVersion='merged-2.11.0';}
 return data;
}
if(require.main===module){const [src,dst,flag]=process.argv.slice(2);if(!src||!dst||flag!=='--from-learning-2.10.0')throw Error('Usage: node scripts/convert_learning_backup.js old.json converted.json --from-learning-2.10.0');if(fs.existsSync(dst))throw Error('Output exists; choose a new file name');fs.writeFileSync(dst,JSON.stringify(convert(JSON.parse(fs.readFileSync(src,'utf8'))),null,2)+'\n',{flag:'wx'});console.log('Converted copy created. Original backup unchanged.');}
module.exports=convert;
