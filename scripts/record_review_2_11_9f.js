'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy'),gate=require('./review_release_gate');
const stories=read('stories.json'),reviews=read('content/review-progress.json'),prov=read('content/current-provenance.json'),audits=read('learning_audit_records.json');
// Each decision follows an individual full-text reading; the release gate cannot confer editorial approval.
const decisions={
 s2051:{reason:'Mia collects a leaf, opens the same book that night, and recognizes the start of autumn. The little-fire comparison is clearly figurative; short pronouns and present-tense sentences fit Level 1.'},
 s2052:{reason:'Ken observes one squirrel burying a nut. Make the squirrel’s front paws precise and label this named encounter as fiction, while keeping the plausible cold-season behavior.',contentType:'narrative-fiction',text:'Ken walks in the park on a cool morning. A squirrel runs under a tree. It finds a brown nut and holds it in its front paws. Then it hides the nut near a rock. Ken walks on. The squirrel is getting ready for cold days.'},
 s2053:{reason:'Hana cooks the listed vegetables with water and shares the result with her brother. Replace “smells warm,” which describes a feeling as an odor, with concrete beginner-friendly language.',text:'The wind is cool after sunset. Hana cuts carrots, an onion, and a potato. She puts them in a pot with water. Soon, the soup smells good. Her brother brings two bowls to the table. They eat the soup slowly and listen to the wind outside.'},
 s2054:{reason:'The fictional town walk, host family, lanterns, bridge and river have clear spatial and temporal continuity. The vignette offers a quiet scene without presenting a named festival as documented fact.'},
 s2055:{reason:'Sara and her grandfather watch a particular flock of geese in a V. The southward movement fits the northern autumn setting; classify this scene as fiction instead of a general explanatory text.',contentType:'narrative-fiction'},
 s2056:{reason:'Noah follows the clue from the acorn at the library to the old garden and finds bookmarks. The phrase “where summer ends” functions as a fictional riddle, resolved by the last green tree.'},
 s2057:{reason:'The cooler morning explains the empty outdoor tables, and the owner brings tea and a blanket to Aiko. The final “gift” is an intelligible metaphor at Level 4.'},
 s2058:{reason:'The bell and museum describe an invented village custom with no identifying historical source. Classify the scene as narrative fiction so its specific past is not mistaken for verified history.',contentType:'narrative-fiction'},
 s2059:{reason:'A single leaf becomes a guiding light for a traveler. The magical turn is explicit in the narrative and the pronoun “it” refers consistently to the leaf/light.'},
 s2060:{reason:'Chlorophyll decline, the visibility of yellow/orange pigments, and new red pigments are stated with useful qualifiers (“many,” “some”). The explanation does not claim all trees change alike.'},
 s2061:{reason:'The mountain market, seasonal produce, grower conversations and bag of food connect clearly. “Stories” is a comprehensible figurative ending at Level 6.'},
 s2062:{reason:'Mr. Alvarez is presented as a fictional seed-library keeper; seed borrowing and return are understandable in the described community program, without claiming a named real person.'},
 s2063:{reason:'Human footprints would not logically lead directly to a trapped deer. Use hoofprints and a call for trained help; the discovery, rescue and fence repair then follow without suggesting that Leila handles a distressed wild animal.',text:'After the apple harvest, Leila notices hoofprints between the empty trees. They lead from a gap in the fence toward a thicket. Following them, she finds a young deer caught in loose wire. Leila calls a local wildlife rescue team and stays back while they free the animal. By dusk, the deer has gone, and the damaged fence has been repaired.'},
 s2064:{reason:'Northern autumn and Southern Hemisphere spring are correctly contrasted. The piece also recognizes local variation in crops and temperature, avoiding a universal seasonal calendar.'},
 s2065:{reason:'Leaf litter can retain moisture and shelter small animals; decomposers gradually return nutrients to soil. The ending is a clearly marked seasonal metaphor rather than an added factual claim.'},
 s2066:{reason:'Shorter daylight from June to October leads Daniel to move his reading chair under a lamp. His new twenty-minute habit and the closing reflection follow in order.'},
 s2067:{reason:'The text explains broad harvest customs across diverse farming communities rather than narrating one particular historical episode. Give it the explanatory-nonfiction category.',contentType:'explanatory-nonfiction'},
 s2068:{reason:'The equinox claim is supported by the US Naval Observatory: solar disk size and atmospheric refraction make sunrise-to-sunset time slightly more than twelve hours in ordinary circumstances. Upper-edge sunrise and sunset definitions are correctly described.',sources:['https://aa.usno.navy.mil/faq/equinoxes','https://aa.usno.navy.mil/faq/RST_defs']},
 s2069:{reason:'Elena returns to a changed estate, notices vines, rain and fallen leaves, then rethinks preservation. The philosophical close grows from the described garden and fits Level 10.'},
 s2070:{reason:'The retired translator revisits decisions in her notebook. The text distinguishes changing editorial judgment from objective error and remains within a fictional biography.'}
};
const batch=[];
for(const [id,d] of Object.entries(decisions)){
 const s=stories.find(x=>x.id===id),p=prov.find(x=>x.id===id),a=audits.find(x=>x.id===id);
 if(!s||!p||!a||a.errors||reviews.some(x=>x.id===id))throw Error('Unexpected source '+id);
 const before=structuredClone(s);
 if(d.text){s.text=d.text;s.wordCount=policy.countWords(s.text)}
 if(d.contentType)s.contentType=d.contentType;
 const changed=Boolean(d.text||d.contentType);
 if(changed){s.reviewedAt='2026-09-24';const check=policy.inspect(s);if(check.errors.length)throw Error('Learning policy '+id+': '+JSON.stringify(check));p.text_sha256=sha(s.text);p.status='editorial-revision-2026-09-24';p.evidence='content/editorial-batch-2.11.9f.json#'+id;p.note=d.reason;}
 batch.push({id,level:s.level,title:s.title,before,after:structuredClone(s),changed,reason:d.reason,sources:d.sources||[],review:'Individually read complete text for grammar, meaning, references, sequence, level, and factual/fictional scope; AI-assisted editorial',beforeFlags:a.flags});
 reviews.push({id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-24',note:d.reason,evidence:'content/editorial-batch-2.11.9f.json#'+id,warningDisposition:a.flags?`The ${a.flags} flag was evaluated in context. ${d.reason}`:`No automatic flags. Full text checked. ${d.reason}`,origin:'editorial-batch-2.11.9f'});
}
reviews.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('stories.json',stories);write('content/current-provenance.json',prov);write('content/review-progress.json',reviews);write('content/editorial-batch-2.11.9f.json',batch);
console.log('Reviewed',batch.length,'revised',batch.filter(x=>x.changed).map(x=>x.id).join(','));
