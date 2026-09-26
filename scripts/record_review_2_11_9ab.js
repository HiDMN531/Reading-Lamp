'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy'),gate=require('./review_release_gate');
const stories=read('stories.json'),reviews=read('content/review-progress.json'),prov=read('content/current-provenance.json'),audits=read('learning_audit_records.json'),log=read('content/revision-log.json'),base=read('content/baseline-2.9.4.json');
const decisions={
 s407:{reason:'Approved the complete Perrault retelling: fairy help, glass slippers, midnight deadline, flight and search match the source.',sources:['https://www.gutenberg.org/files/29021/29021-h/29021-h.htm']},
 s409:{reason:'The prince’s repeated account of markets and roads is invented. Preserve the hair-entry scene but add Rapunzel’s own idea for a silk ladder from the Grimm source.',title:'Rapunzel Plans a Way Out',text:`Rapunzel lived in a high tower with no door or stairs. An old woman visited by calling from below. Rapunzel let down her long hair, and the woman climbed up.

One day, a prince heard Rapunzel singing in the forest. He saw how the woman reached the window. When he returned, he used the same call. Rapunzel was frightened at first, but they talked, and he came back another day.

Rapunzel wanted to leave the tower. She asked the prince to bring her lengths of silk. She would tie them into a ladder and climb down when it was strong enough.

Each visit gave her more silk. The ladder was not ready yet, but Rapunzel had begun making a way out.`,sources:['https://www.grimmstories.com/en/grimm_fairy-tales/rapunzel'],subtopic:'fairy tale'},
 s410:{reason:'The source calls the seven hosts dwarfs and puts Snow White to sleep in the seventh bed after trying the others. Correct these details and retain this episode only.',title:'Snow White Finds a Small House',text:`Snow White ran through the forest until she was too tired to continue. At evening, she found a small house among the trees.

Inside were seven small chairs, seven plates and seven beds. She ate a little food from each plate. She tried the beds until she found one that fit, and she fell asleep.

Seven dwarfs returned from work in the hills. They noticed that someone had eaten their food. Then one of them found Snow White asleep.

In the morning, she told them why she could not return home. The dwarfs let her stay but warned her to be careful while they were away. Snow White watched them leave. She felt safe in the small house, though danger had not gone away.`,sources:['https://www.gutenberg.org/cache/epub/19068/pg19068-images.html'],subtopic:'fairy tale'},
 s411:{reason:'Approved the episode against Carroll’s original; the waistcoated watch-carrying rabbit, slow fall and hall of doors are preserved.',sources:['https://dev.gutenberg.org/cache/epub/11/pg11-images.html']},
 s477:{reason:'The source says Alice checked for a poison label, not that smelling the unknown bottle established safety. Retell the check without presenting it as a reliable test; preserve the forgotten key.',title:'Alice and the Little Bottle',text:`Alice stood in a hall with many locked doors. A small key on a glass table opened a tiny door. Through it, she saw a beautiful garden, but she was too large to enter.

Back at the table, she found a bottle labeled “DRINK ME.” She looked for a warning that said “poison.” She saw none. In this strange story, she drank from the bottle and began to grow smaller.

Now Alice was small enough for the door. Then she remembered the key. She had left it on the high table. She could see the garden but could no longer reach the key.`,sources:['https://dev.gutenberg.org/cache/epub/11/pg11-images.html'],subtopic:"children's classic"},
 s497:{reason:'Purring can occur in varied contexts; the mechanism is complex and “helps a cat stay calm” is not established by the cited physiology. Limit the description to production and observation.',title:'What a Cat’s Purr Tells Us',text:`A cat can make a low sound called a purr. It comes from vibrations in the area of the voice box while the cat breathes.

A cat may purr when it rests beside a person. It may also purr when it is frightened or unwell. The sound alone cannot tell us that the cat is happy.

People who care for a cat look at more than one sign. They watch how it moves, eats and reacts to touch. Researchers are still studying exactly how cats make a purr and why they use it in different situations.`,sources:['https://pubmed.ncbi.nlm.nih.gov/37794583/'],subtopic:'cat communication'},
 s547:{reason:'Approved the original episode against Collodi: the Carabineer detains Geppetto, Pinocchio goes home, and his disobedience leads to hunger. Do not imply a different ending.',sources:['https://www.gutenberg.org/cache/epub/500/pg500-images.html']},
 s579:{reason:'The specific crow’s choices and traffic-light intention are invented; the evidence on car-assisted nut cracking is not enough to treat this exact event as observation. Label it fiction and avoid suggesting a person approach traffic.',title:'The Crow and the Hard Nut',contentType:'narrative-fiction',text:`This is an imagined crow story. The crow found a hard nut beside a road. It dropped the nut from a branch, but the shell stayed closed.

Next, the bird let the nut fall onto the road. A car passed over it. The crow waited on a tree branch until the road was empty.

When it flew down, it found the shell cracked. It ate the nut and carried the empty shell away. The story shows one way an animal might use things in its surroundings.`,subtopic:'animal problem solving'},
 s580:{reason:'The claim about all bats and protecting crops is too broad. Describe insect-eating bats and frame crop effects as possible rather than an observed result for invented farmers.',title:'Bats Hunt After Sunset',text:`Some insect-eating bats rest in a barn by day. At sunset, they leave to search over nearby fields.

Many of these bats send out sounds too high for people to hear. The sounds bounce back from objects, including insects. A bat listens to the returning sounds as it flies and hunts.

Some insects are pests in fields. Bats can eat them, but this short example does not tell us how many insects they eat or how much a farmer's crop changes. The bats also use their eyes and other senses.`,sources:['https://www.batcon.org/about-bats/faq/','https://www.batcon.org/global-crop-guardians/'],subtopic:'bat echolocation'},
 s599:{reason:'The town and policy are explicitly invented, so classify narrative fiction. Show approval and a limited trial before claims of lasting community use.',title:'A Room for the Town',contentType:'narrative-fiction',text:`This town is imagined. In winter, neighbors needed a warm place to meet. An empty shop near the station seemed useful, but it needed work.

The town checked the building and agreed to try it as a meeting room. Staff arranged heat and lights. A carpenter repaired some tables, and neighbors brought books and games.

For the first month, the room opened on two afternoons a week. Students used a table after school, and an older group met there to play cards. The town counted visits and asked people what hours they needed next.`,subtopic:'community spaces'}
};
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
 if(changed){s.reviewedAt='2026-09-25';const check=policy.inspect(s);if(check.errors.length)throw Error('Learning policy '+id+': '+JSON.stringify(check));p.text_sha256=sha(s.text);p.status='editorial-revision-2026-09-25';p.evidence='content/editorial-batch-2.11.9ab.json#'+id;p.note=d.reason;}
 batch.push({id,level:s.level,title:s.title,before,after:structuredClone(s),changed,reason:d.reason,sources:d.sources||[],review:'Individual full-text reading for language, source fidelity, logical order, level fit and fiction scope; AI-assisted editorial',beforeFlags:a.flags});
 reviews.push({id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-25',note:d.reason,evidence:'content/editorial-batch-2.11.9ab.json#'+id,warningDisposition:a.flags?`The ${a.flags} flag was evaluated in the complete text. ${d.reason}`:`No automatic flags. Full text checked. ${d.reason}`,origin:'editorial-batch-2.11.9ab'});
 if(before.text!==s.text){let item=log.find(x=>x.id===id);if(item){item.afterSha256=sha(s.text);item.reason+=(item.reason.includes(d.reason)?'':'; '+d.reason)}else log.push({id,beforeSha256:base.stories.find(x=>x.id===id).textSha256,afterSha256:sha(s.text),reason:d.reason,review:'AI-assisted full-text language and factual/fictional scope review, not human certification',reviewedAt:'2026-09-25'});}
}
reviews.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));log.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('stories.json',stories);write('content/current-provenance.json',prov);write('content/review-progress.json',reviews);write('content/revision-log.json',log);write('content/editorial-batch-2.11.9ab.json',batch);
console.log('Reviewed',batch.length,'changed',batch.filter(x=>x.changed).map(x=>x.id).join(','));
