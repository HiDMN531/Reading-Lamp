'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const policy=require('../learning-policy');
const {validateBatch}=require('./import_stories');
const root=path.resolve(__dirname,'..'),read=n=>JSON.parse(fs.readFileSync(path.join(root,n),'utf8'));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function validateCorpus(){
 const stories=read('stories.json'),base=read('content/baseline-2.9.4.json'),log=read('content/revision-log.json'),audits=read('learning_audit_records.json');
 if(stories.length!==2570 || audits.length!==2570)throw Error('Expected 2570 stories and audit rows');
 const changes=new Map(log.map(x=>[x.id,x]));
 const provenance=read('content/current-provenance.json');
 if(provenance.length!==stories.length)throw Error('Provenance row count');
 const ids=new Set(),titles=new Set(),texts=new Set(),cells=new Map();let words=0;
 for(let index=0;index<stories.length;index++){
  const s=stories[index],a=audits[index],h=hash(s.text),r=policy.inspect(s);
  if(s.id!==`s${String(index+1).padStart(3,'0')}`||ids.has(s.id)||titles.has(s.title)||texts.has(s.text))throw Error('Sequence/duplicate '+s.id);
  if(r.errors.length||s.wordCount!==r.metrics.words)throw Error('Content/count '+s.id);
  if(s.editorialStatus!=='published'||s.factChecked!==true||!s.subtopic||!s.contentType||!/^\d{4}-\d{2}-\d{2}$/.test(s.reviewedAt))throw Error('Metadata '+s.id);
  if((s.topic==='Famous books')!==Boolean(s.sourceWork))throw Error('Source work '+s.id);
  if(!a||a.id!==s.id||a.text_sha256!==h||a.words!==s.wordCount||a.level!==s.level)throw Error('Stale audit '+s.id);
  if(provenance[index].id!==s.id||provenance[index].text_sha256!==h)throw Error('Stale provenance '+s.id);
  if(index<2000){const b=base.stories[index];if(s.id!==b.id||s.level!==b.level||s.topic!==b.topic)throw Error('Compatibility '+s.id);if(h!==b.textSha256){const c=changes.get(s.id);if(!c||c.beforeSha256!==b.textSha256||c.afterSha256!==h)throw Error('Unrecorded revision '+s.id)}}
  ids.add(s.id);titles.add(s.title);texts.add(s.text);words+=s.wordCount;
  const key=s.level+'|'+s.topic;cells.set(key,(cells.get(key)||0)+1);
 }
 if(cells.size!==100||Math.min(...cells.values())<23)throw Error('Unbalanced corpus');
 const newCells=new Map();for(const s of stories.slice(2070)){const key=s.level+'|'+s.topic;newCells.set(key,(newCells.get(key)||0)+1)}
 if(newCells.size!==100||[...newCells.values()].some(n=>n!==5))throw Error('Expected five additions per level/topic');
 validateBatch(stories.slice(0,2070),stories.slice(2070),read('content/reviews-500.json'));
 if(hash(fs.readFileSync(path.join(root,'rewards.json')))!==read('content/merge-baseline.json').rewardsSha256)throw Error('Rewards changed');
 const summary=read('learning_audit_summary.json');if(summary.words!==words||summary.stories!==stories.length)throw Error('Stale summary');
 return {stories:stories.length,words,levelTopicCells:cells.size,minimumStoriesPerCell:Math.min(...cells.values()),revisedExisting:log.length,newLearningChecks:500,frequencyAndSyntaxFlags:summary.flagged};
}
if(require.main===module)console.log(JSON.stringify(validateCorpus(),null,2));
module.exports=validateCorpus;
