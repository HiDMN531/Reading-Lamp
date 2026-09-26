'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy'),gate=require('./review_release_gate');
const stories=read('stories.json'),reviews=read('content/review-progress.json'),prov=read('content/current-provenance.json'),audits=read('learning_audit_records.json'),log=read('content/revision-log.json'),base=read('content/baseline-2.9.4.json');
const decisions={
 s337:{reason:'Approved this impossible wish and sudden recovery as explicit talking-fish fantasy. Dialogue, sequence and pronouns are consistent.'},
 s338:{reason:'Bread crumbs are poor food for ducks. Let the friends observe wild ducks at a distance while keeping their lakeside friendship.',text:`Every summer, Sophia visited her aunt's house near a quiet lake. She often walked along the shore alone because there were no other children nearby.

One morning, a small creature with green skin and big eyes rose from the water. “Hello,” it said softly. “My name is Pip.”

Sophia was surprised, but Pip seemed friendly. They talked about the fish and plants in the lake. Together they watched ducks swim near the reeds, without giving them bread.

Sophia returned to the same spot each morning. Pip taught her how to skip stones in an empty part of the lake.

Near the end of summer, Sophia said she would miss him. Pip promised to look for her when she returned the following year. She walked back to her aunt's house thinking about their unusual friendship.`,sources:['https://generationwild.wwt.org.uk/activities/feed-a-bird'],subtopic:'magical creatures'},
 s339:{reason:'Correct the capitalized dialogue tag after an exclamation mark; the tiny dragon’s growth remains explicitly fantastical.',text:'Behind the old barn, a farmer\'s daughter named Elena found a small dragon hiding under some leaves. It was no bigger than a cat, and its wings were too small to fly.\n\n“Are you hurt?” Elena asked gently. The dragon shook its head but looked hungry and tired.\n\nElena brought it some bread and milk every day for two weeks. Slowly, the little dragon grew stronger. Its wings became bigger, and its scales began to shine like copper.\n\nOne evening, the dragon tried flying for the first time. It flapped its wings and rose a little into the air before falling softly onto the grass.\n\nElena laughed and clapped. “You almost did it!” she said encouragingly.\n\nThe dragon tried again the next day, and this time it flew higher, circling above the barn before landing safely beside Elena.\n\n“You did it!” she shouted happily.\n\nThe dragon nuzzled against her arm gently, thanking her without words. From then on, it visited Elena every evening, flying above the farm just before sunset.'},
 s349:{reason:'The original treats one cup-nest sequence as universal, implies all birds use string and both parents incubate. Show varied nesting strategies and match the subtopic.',title:'Different Ways Birds Nest',text:`Birds use many kinds of places for their eggs. Some make a cup from grass and small twigs. Others lay eggs on the ground or use a hole in a tree. A nest is usually a place for eggs and young birds, not a home used all year.

A bird may choose a place hidden by leaves. It may carry plant material in its beak and shape it into a cup. The work can take time, but not every bird builds this way.

After eggs are laid, an adult bird may sit on them to keep them warm. The way parents share this job depends on the species. Later, young birds hatch. Their needs differ too: some stay in a nest for a while, while others can walk away soon after hatching.`,sources:['https://academy.allaboutbirds.org/understand-how-nest-designs-protect-baby-birds/','https://www.allaboutbirds.org/news/providing-nest-material-for-birds-dos-donts/'],subtopic:'bird nesting'},
 s351:{reason:'This is a specific imagined day with Mia and her uncle. Classify as narrative fiction and leave the modest farm scene intact.',contentType:'narrative-fiction',subtopic:'farm chores'},
 s373:{reason:'Remove generic praise and age-based assumptions; clarify permission to help and end on the specific shopping action.',title:'Emma Helps at the Store',text:`Emma went grocery shopping with her mother. She checked the list while her mother pushed the cart. They chose vegetables, bread, milk and eggs.

Near the fruit, Emma saw a shopper trying to reach a bag of apples on a high shelf. She asked, “Would you like me to get that bag for you?”

“Yes, please,” he said. Emma took the bag down and handed it to him. He checked the apples and put them in his basket.

Emma and her mother finished their list. On the way home, Emma remembered that asking first had made it easy to help.`,subtopic:'shopping and kindness'},
 s374:{reason:'Approved the complete fictional neighbor scene. The shy greeting, park visit and next-day walk follow coherently.'},
 s397:{reason:'The topic is science but the subtopic falsely says physics and space. Limit the universal tree claim, distinguish water uptake from food-making, and retain a simple sequence.',title:'From Seed to Green Plant',text:`A seed holds a tiny young plant. With enough water and warmth, it can begin to grow. A first root comes out and grows down. It takes in water and helps hold the plant in place.

A shoot then grows up. When leaves open in the light, the plant can use sunlight, water and a gas from the air to make its own food.

The plant may later grow flowers or fruit, depending on its kind. Many large trees began as small seeds, but some plants can grow in other ways too.`,sources:['https://blog-nwcrops.extension.umn.edu/2023/05/its-magic-neat-process-of-soybean.html','https://ssec.si.edu/stemvisions-blog/what-photosynthesis'],subtopic:'plant growth'},
 s398:{reason:'Approved the complete moon-phase explanation after checking NASA: the visible share of the Sun-lit half changes as the Moon orbits Earth.',sources:['https://science.nasa.gov/moon/moon-phases/']},
 s399:{reason:'Approved the full hearing chain against the U.S. National Institute on Deafness and Other Communication Disorders, including eardrum, middle-ear bones and inner-ear cells.',sources:['https://www.nidcd.nih.gov/health/how-do-we-hear']}
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
 if(changed){s.reviewedAt='2026-09-25';const check=policy.inspect(s);if(check.errors.length)throw Error('Learning policy '+id+': '+JSON.stringify(check));p.text_sha256=sha(s.text);p.status='editorial-revision-2026-09-25';p.evidence='content/editorial-batch-2.11.9y.json#'+id;p.note=d.reason;}
 batch.push({id,level:s.level,title:s.title,before,after:structuredClone(s),changed,reason:d.reason,sources:d.sources||[],review:'Individual full-text reading for language, source fidelity, logical order, level fit and fiction scope; AI-assisted editorial',beforeFlags:a.flags});
 reviews.push({id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-25',note:d.reason,evidence:'content/editorial-batch-2.11.9y.json#'+id,warningDisposition:a.flags?`The ${a.flags} flag was evaluated in the complete text. ${d.reason}`:`No automatic flags. Full text checked. ${d.reason}`,origin:'editorial-batch-2.11.9y'});
 if(before.text!==s.text){let item=log.find(x=>x.id===id);if(item){item.afterSha256=sha(s.text);item.reason+=(item.reason.includes(d.reason)?'':'; '+d.reason)}else log.push({id,beforeSha256:base.stories.find(x=>x.id===id).textSha256,afterSha256:sha(s.text),reason:d.reason,review:'AI-assisted full-text language and factual/fictional scope review, not human certification',reviewedAt:'2026-09-25'});}
}
reviews.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));log.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('stories.json',stories);write('content/current-provenance.json',prov);write('content/review-progress.json',reviews);write('content/revision-log.json',log);write('content/editorial-batch-2.11.9y.json',batch);
console.log('Reviewed',batch.length,'changed',batch.filter(x=>x.changed).map(x=>x.id).join(','));
