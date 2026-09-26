'use strict';
// One-time, idempotent editorial revision of the three held Level 1 stories.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy');
const gate=require('./review_release_gate');
const stories=read('stories.json'),incoming=read('content/incoming-70.json');
const provenance=read('content/current-provenance.json'),reviews=read('content/review-progress.json');
const changes={
 s2010:{text:'There is one cookie on the plate. Ali wants it. His sister wants it too.\n\nAli breaks the cookie in two with his hands. He gives half to his sister.\n\nShe says, "Thank you."\n\nAli says, "We can make more tomorrow." They eat and smile.',reason:'Replaced the knife with breaking the cookie by hand. Half clearly refers to one of two pieces. The sharing and final line remain in the same present-tense sequence.',warning:'The entire passage was checked for simple present tense, referents, safe action, natural use of half, and fictional scope.'},
 s2011:{text:'Rain starts when Emi leaves the shop. She has no umbrella. Her friend Ken is by the door. He has a big blue umbrella.\n\nKen says, "Let’s walk to the bus stop." They walk together. Emi stays dry.\n\nWhen her bus comes, she waves to Ken. He waves back.',reason:'Identified Ken as Emi’s friend before he offers to share his umbrella; the bus arrival and goodbye now clearly follow their walk. The umbrella remains the key concrete image.',warning:'The entire passage was checked for natural dialogue, unambiguous pronouns, action order, Level 1 syntax, and fictional scope.'},
 s2016:{text:'Jun opens his lunch box. There is rice, an egg, and a small note. The note says, "Have a good day." Jun reads it again.\n\nAt home, Jun writes a note for his mother. He puts it by her cup. It says, "Thank you, Mom."',reason:'Changed two times to reads it again and gave Jun a natural reply to his mother. His new note and its place are explicit, preserving the kind exchange.',warning:'The entire passage was checked for natural collocations, clear references to each note, present tense, Level 1 length, and fictional scope.'}
};
const batch=[];
for(const [id,change] of Object.entries(changes)){
 const s=stories.find(x=>x.id===id),baseline=incoming.find(x=>x.id===id),p=provenance.find(x=>x.id===id);
 if(!s||!baseline||!p||reviews.some(x=>x.id===id)||s.text!==baseline.text)throw Error('Unexpected prior revision '+id);
 const before=structuredClone(s);s.text=change.text;s.wordCount=policy.countWords(s.text);s.reviewedAt='2026-09-24';
 const inspect=policy.inspect(s);
 if(inspect.errors.length||inspect.warnings.length)throw Error('Learning policy '+id+': '+JSON.stringify(inspect));
 p.text_sha256=sha(s.text);p.status='editorial-revision-2026-09-24';p.evidence='content/editorial-batch-2.11.9d.json#'+id;
 p.note=change.reason;
 batch.push({id,level:s.level,title:s.title,before,after:structuredClone(s),changed:true,reason:change.reason,sources:[],review:'Full text read for vocabulary, grammar, naturalness, referents, sequence, Level 1 fit and fiction scope; AI-assisted editorial, not human certification',beforeFlags:(read('learning_audit_records.json').find(x=>x.id===id)||{}).flags,afterPolicy:inspect});
 reviews.push({id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-24',note:change.reason,evidence:'content/editorial-batch-2.11.9d.json#'+id,warningDisposition:change.warning,origin:'editorial-batch-2.11.9d'});
}
reviews.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('stories.json',stories);write('content/current-provenance.json',provenance);
write('content/editorial-batch-2.11.9d.json',batch);write('content/review-progress.json',reviews);
console.log('Revised and reviewed:',batch.map(x=>x.id).join(', '));
