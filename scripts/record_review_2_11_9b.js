'use strict';
const fs=require('fs');
const path=require('path');
const gate=require('./review_release_gate');
const root=path.resolve(__dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const write=(name,value)=>fs.writeFileSync(path.join(root,name),JSON.stringify(value,null,2)+'\n');
const stories=read('stories.json');
const audits=read('learning_audit_records.json');
const progress=read('content/review-progress.json');
const decisions={
 s001:{note:'The lantern duty, distant lights, succession from Mara to the boy, and final repeated question form a coherent fictional arc. Dialogue and pronoun references are clear; Level 5 vocabulary and sentence variety fit an extended narrative. No historical lantern network is asserted.',warning:'No automatic flags. Low-frequency tokens such as Mara and lantern are a character name and recurring story object; the complete passage was checked for syntax, continuity and fiction scope.'},
 s004:{note:'Daniel sees the older passenger after a teenager takes the last free seat, gives up his own seat, and notices others the next day. Train positions, dialogue tags, pronouns and the consequence are coherent. The passenger’s remark is character speech, not a claim about society.',warning:'No automatic flags. Terms such as headphones and crowded are concrete details in a Level 5 fictional commute; the complete passage was checked for syntax, references and causal sequence.'},
 s2004:{note:'The moon in the water is a reflection, made clear when Jo looks up. The claim that there are two moons is Jo’s playful speech and the brother’s laugh signals that reading. Short present-tense clauses fit the beginner sequence.',warning:'No automatic flags. The inflected word moons appears in a child’s playful dialogue and is explained by the preceding reflection; the full passage was checked.'},
 s2006:{note:'A new classmate sits alone, Nina invites her to an empty chair, and their food conversation leads naturally to laughter. Her and hers clearly refer to the new girl and Nina respectively. Simple present tense and concrete actions fit Level 1.',warning:'The low-frequency warning is for Nina (a character name) and hers (a common possessive pronoun in the two-lunch contrast). Both are supported by the scene; full text, grammar and references were checked.'},
 s2013:{note:'A personified cloud notices a sad flower, gives it rain, and plans to return. The flower standing up is a light fantasy image, not botanical guidance. Short present-tense sentences and repeated nouns fit Level 1.',warning:'No automatic flags. The whole personification was read for simple syntax, sequence, coherence and fiction scope.'}
};
const batch=[];
for(const [id,d] of Object.entries(decisions)){
 const s=stories.find(x=>x.id===id),a=audits.find(x=>x.id===id);
 if(!s||!a||progress.some(x=>x.id===id)||s.contentType!=='narrative-fiction'||a.errors)throw Error('Unexpected source state '+id);
 batch.push({id,level:s.level,title:s.title,before:s,after:s,changed:false,reason:d.note,sources:[],review:'Full text read for vocabulary, grammar, syntax, naturalness, sequence, level and fiction-vs-fact scope; AI-assisted editorial, not human certification',beforeFlags:a.flags,afterAudit:a});
 progress.push({id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-24',note:d.note,evidence:'content/editorial-batch-2.11.9b.json#'+id,warningDisposition:d.warning,origin:'editorial-batch-2.11.9b'});
}
progress.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('content/editorial-batch-2.11.9b.json',batch);
write('content/review-progress.json',progress);
console.log(gate.current().reviewed,gate.current().pending);
