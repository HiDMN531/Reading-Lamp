'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy'),gate=require('./review_release_gate');
const stories=read('stories.json'),reviews=read('content/review-progress.json'),prov=read('content/current-provenance.json'),audits=read('learning_audit_records.json'),log=read('content/revision-log.json'),base=read('content/baseline-2.9.4.json');
const decisions={
 s1822:{reason:'Oil alone does not explain waterproof plumage. Explain feather structure, preening and oil in a bounded description and preserve the clean-water need.',title:'How a Duck Keeps Its Feathers',contentType:'explanatory-nonfiction',text:`A duck spends time caring for its feathers. It uses its bill to put the feathers back in place. Their small parts fit closely together and help keep water away from its skin.

As it cleans its feathers, the duck also spreads oil from a small gland near its tail. The oil helps the feathers stay in good condition. Air held by the feathers helps keep the duck warm.

A duck needs water and time to clean and arrange its feathers. Feathers do more than cover its body; their condition matters when it swims.`,sources:['https://academy.allaboutbirds.org/features/all-about-feathers/how-feathers-are-built.php','https://www.vet.cornell.edu/animal-health-diagnostic-center/programs/duck-research-laboratory/basic-duck-care']},
 s1825:{reason:'The road structure varied and stone top surfaces were not universal. Describe a possible layered gravel road with drainage rather than a single standard construction.',title:'Layers in a Roman Road',contentType:'explanatory-nonfiction',text:`Roman builders made roads in different ways. The materials depended on the land and on what was nearby.

On some roads, workers raised the middle of the road. They laid stones or gravel in layers to make a firm path. Ditches at the sides helped carry water away.

These roads linked towns and other places. Parts remain today, but one surviving road cannot show how every Roman road was built.`,sources:['https://www.english-heritage.org.uk/learn/story-of-england/romans/roman-roads/'],subtopic:'Roman road construction'},
 s1827:{reason:'Approved after comparison with Baum’s original: the cyclone, Scarecrow, Tin Woodman, Lion and silver shoes are present. No ruby-shoe substitution.',sources:['https://www.gutenberg.org/files/43936/43936-h/43936-h']},
 s1921:{reason:'Make clear that echolocation applies to many, not every, bats; explain reflected sound in everyday language and retain the correction that bats can see.',title:'A Bat Finds an Insect',text:`Many bats find insects by sending out high sounds. When a sound reaches an insect, part of it comes back to the bat.

The bat listens to the returning sound. It can use that sound to find an insect in the dark. This way of finding things is called echolocation.

Bats can also see. They do not use sound because they are blind. Different bats use their senses in different ways.`,sources:['https://www.batcon.org/about-bats/faq/','https://www.batcon.org/hearing-like-a-bat/'],subtopic:'bat echolocation'},
 s1924:{reason:'Keep the date and excavation claim grounded in the Pompeii Archaeological Park account. Replace “hot rock” and the ambiguous assertion that objects were left underground.',title:'Pompeii under Ash',contentType:'explanatory-nonfiction',text:`In the year 79, Mount Vesuvius erupted near the Roman town of Pompeii. Pumice stones and ash fell on the town. Later, very hot clouds of gas and ash reached it.

The eruption killed many people and covered streets, homes and everyday objects. Long afterward, people began to uncover parts of the town.

Today, the remains help us study how people lived there. They also show how suddenly the eruption changed their lives.`,sources:['https://pompeiisites.org/en/pompeii-map/analysis/the-casts/','https://pompeiisites.org/en/archaeological-park-of-pompeii/press-kit/'],subtopic:'Pompeii and Vesuvius'},
 s1925:{reason:'The Sun usually lights half the Moon, with the eclipse as an exception; the phases depend on viewing the lit part as the Moon orbits Earth. Bound that statement and avoid suggesting Earth’s shadow causes ordinary phases.',title:'Why the Moon Looks Different',text:`Sunlight usually lights one half of the Moon. As the Moon moves around Earth, we see different amounts of that lit half.

Sometimes we see only a thin bright curve. On other nights, we see nearly the whole bright side. The Moon has not changed its shape.

Earth’s shadow does not cause these regular changes. When the Moon passes into that shadow, it is a lunar eclipse. That is a different event.`,sources:['https://science.nasa.gov/resource/phases-of-the-moon-2/','https://www.jpl.nasa.gov/edu/resources/project/watch-and-measure-a-total-lunar-eclipse/'],subtopic:'moon phases'}
};
const batch=[];
for(const [id,d] of Object.entries(decisions)){
 const s=stories.find(x=>x.id===id),p=prov.find(x=>x.id===id),a=audits.find(x=>x.id===id);
 if(!s||!p||!a||a.errors||s.level!==2||reviews.some(x=>x.id===id))throw Error('Unexpected source '+id);
 const before=structuredClone(s);
 if(d.title)s.title=d.title;
 if(d.text){s.text=d.text;s.wordCount=policy.countWords(s.text)}
 if(d.contentType)s.contentType=d.contentType;
 if(d.subtopic)s.subtopic=d.subtopic;
 const changed=Boolean(d.title||d.text||d.contentType||d.subtopic);
 if(changed){s.reviewedAt='2026-09-25';const check=policy.inspect(s);if(check.errors.length)throw Error('Learning policy '+id+': '+JSON.stringify(check));p.text_sha256=sha(s.text);p.status='editorial-revision-2026-09-25';p.evidence='content/editorial-batch-2.11.9x.json#'+id;p.note=d.reason;}
 batch.push({id,level:s.level,title:s.title,before,after:structuredClone(s),changed,reason:d.reason,sources:d.sources||[],review:'Individual full-text reading for language, source fidelity, logical order, level fit and fiction scope; AI-assisted editorial',beforeFlags:a.flags});
 reviews.push({id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-25',note:d.reason,evidence:'content/editorial-batch-2.11.9x.json#'+id,warningDisposition:a.flags?`The ${a.flags} flag was evaluated in the complete text. ${d.reason}`:`No automatic flags. Full text checked. ${d.reason}`,origin:'editorial-batch-2.11.9x'});
 if(before.text!==s.text){let item=log.find(x=>x.id===id);if(item)throw Error('Existing revision '+id);log.push({id,beforeSha256:base.stories.find(x=>x.id===id).textSha256,afterSha256:sha(s.text),reason:d.reason,review:'AI-assisted full-text language and factual/fictional scope review, not human certification',reviewedAt:'2026-09-25'});}
}
reviews.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));log.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('stories.json',stories);write('content/current-provenance.json',prov);write('content/review-progress.json',reviews);write('content/revision-log.json',log);write('content/editorial-batch-2.11.9x.json',batch);
console.log('Reviewed',batch.length,'changed',batch.filter(x=>x.changed).map(x=>x.id).join(','));
