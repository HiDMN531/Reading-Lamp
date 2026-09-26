'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy'),gate=require('./review_release_gate');
const stories=read('stories.json'),reviews=read('content/review-progress.json'),prov=read('content/current-provenance.json'),batch=read('content/editorial-batch-2.11.9r.json'),log=read('content/revision-log.json'),base=read('content/baseline-2.9.4.json');
const edits={
 s1349:`David Kim is a fictional radio worker. A storm cut the power in his town. Some families could not hear local news. David and a small team built a radio that ran on batteries.

They took the first model to a community center. Its sound was too weak in the back room. They changed the speaker and tried again. They also wrote clear steps for replacing the batteries.

The radio could receive news when the power went out. It needed working batteries and a station still sending a signal. David kept the test notes for the next model.`,
 s1491:`Emi saw a tiny red door beneath a café table. Whenever she looked straight at it, the door stayed shut.

She left a cake crumb nearby. Then she turned to watch the rain at the window. Behind her, something tapped under the table. She looked back. The door was open. A mouse in a floury hat stood beside the crumb.

The mouse pushed out a tiny cake. It took the crumb and went inside. Emi waited for the door to close before returning to her seat.`,
 s1504:`In the Roman world, some roads had stone markers beside them. A marker could tell travelers the distance to a town or another point.

Imagine walking a long road without a modern map. A stone showed a place name and a number. These details could help you judge how far you still had to go. They could not tell you whether the road was open.

Some of these heavy stones remain today. Their carved words help people study old routes.`
};
for(const [id,value] of Object.entries(edits)){const s=stories.find(x=>x.id===id);s.text=value;s.wordCount=policy.countWords(value)}
for(const b of batch){const s=stories.find(x=>x.id===b.id),r=reviews.find(x=>x.id===b.id),p=prov.find(x=>x.id===b.id);b.after=structuredClone(s);r.contentDigest=gate.reviewDigest(s);p.text_sha256=sha(s.text);if(b.before.text!==s.text){let item=log.find(x=>x.id===b.id);if(!item){item={id:b.id,beforeSha256:base.stories.find(x=>x.id===b.id).textSha256,afterSha256:sha(s.text),reason:b.reason,review:'AI-assisted full-text language and factual/fictional scope review, not human certification',reviewedAt:'2026-09-25'};log.push(item)}else{item.afterSha256=sha(s.text);item.reason+=(item.reason.includes(b.reason)?'':'; '+b.reason)} }}
log.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('stories.json',stories);write('content/review-progress.json',reviews);write('content/current-provenance.json',prov);write('content/editorial-batch-2.11.9r.json',batch);write('content/revision-log.json',log);
