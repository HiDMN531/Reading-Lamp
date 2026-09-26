'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy'),gate=require('./review_release_gate');
const stories=read('stories.json'),reviews=read('content/review-progress.json'),prov=read('content/current-provenance.json'),audits=read('learning_audit_records.json'),log=read('content/revision-log.json'),base=read('content/baseline-2.9.4.json');
const decisions=read('scripts/decisions_2_11_9ac.json');
const batch=[];
for(const [id,d] of Object.entries(decisions)){
 const s=stories.find(x=>x.id===id),p=prov.find(x=>x.id===id),a=audits.find(x=>x.id===id);
 if(!s||!p||!a||a.errors||s.level!==3||reviews.some(x=>x.id===id))throw Error('Unexpected source '+id);
 const before=structuredClone(s);
 if(d.title)s.title=d.title;
 if(d.text){s.text=d.text;s.wordCount=policy.countWords(s.text)}
 if(d.contentType)s.contentType=d.contentType;
 if(d.subtopic)s.subtopic=d.subtopic;
 const changed=Boolean(d.title||d.text||d.contentType||d.subtopic);
 if(changed){s.reviewedAt='2026-09-25';const check=policy.inspect(s);if(check.errors.length)throw Error('Learning policy '+id+': '+JSON.stringify(check));p.text_sha256=sha(s.text);p.status='editorial-revision-2026-09-25';p.evidence='content/editorial-batch-2.11.9ac.json#'+id;p.note=d.reason;}
 batch.push({id,level:s.level,title:s.title,before,after:structuredClone(s),changed,reason:d.reason,sources:d.sources||[],review:'Individual full-text reading for language, source fidelity, logical order, level fit and fiction scope; AI-assisted editorial',beforeFlags:a.flags});
 reviews.push({id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-25',note:d.reason,evidence:'content/editorial-batch-2.11.9ac.json#'+id,warningDisposition:a.flags?`The ${a.flags} flag was evaluated in the complete text. ${d.reason}`:`No automatic flags. Full text checked. ${d.reason}`,origin:'editorial-batch-2.11.9ac'});
 if(before.text!==s.text){let item=log.find(x=>x.id===id);if(item){item.afterSha256=sha(s.text);item.reason+=(item.reason.includes(d.reason)?'':'; '+d.reason)}else log.push({id,beforeSha256:base.stories.find(x=>x.id===id).textSha256,afterSha256:sha(s.text),reason:d.reason,review:'AI-assisted full-text language and factual/fictional scope review, not human certification',reviewedAt:'2026-09-25'});}
}
reviews.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));log.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('stories.json',stories);write('content/current-provenance.json',prov);write('content/review-progress.json',reviews);write('content/revision-log.json',log);write('content/editorial-batch-2.11.9ac.json',batch);
console.log('Reviewed',batch.length,'changed',batch.filter(x=>x.changed).map(x=>x.id).join(','));
