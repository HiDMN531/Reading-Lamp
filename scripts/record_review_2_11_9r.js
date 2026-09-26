'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy'),gate=require('./review_release_gate');
const stories=read('stories.json'),reviews=read('content/review-progress.json'),prov=read('content/current-provenance.json'),audits=read('learning_audit_records.json');
const decisions={
 s1349:{reason:'Replace repetitive boilerplate with a specific fictional battery radio project; avoid promising that a radio alone keeps communications operating during every storm.',title:'David Kim Tests a Battery Radio',text:`David Kim is a fictional radio worker. When a storm cut the power in his town, some families could not hear local news. David and a small team built a radio that ran on batteries.

They took the first model to a community center. Its sound was too weak in the back room, so they changed the speaker and tried again. They also wrote clear steps for replacing the batteries.

The radio could receive news when the power went out, as long as its batteries worked and a station was still sending a signal. David kept the test notes for the next model.`,subtopic:'battery radio design'},
 s1350:{reason:'Replace stock phrases with an actual fictional oral-history process, permission to record, review of quotes and accurate labeling.',title:'Nora Hassan Collects Work Stories',text:`Nora Hassan is a fictional history worker. She wanted to record how people worked at the old town market. She asked workers whether they wanted to tell their stories. Some said yes; others did not.

Nora recorded three interviews with permission. She wrote the speakers’ names and dates beside their words. Before sharing a short piece in the town story room, she asked each speaker to check it.

One worker corrected the name of a street. Nora fixed the label. The story room now held those accounts, with the speakers’ own words kept clear.`,subtopic:'oral histories'},
 s1468:{reason:'An eating table beneath school stairs could obstruct a route. Show a teacher assigning an available quiet table and remove generic filler and moral.',title:'A Quiet Lunch Table',text:`Aya and Mei found the school lunch room too loud. They asked a teacher whether there was a quieter place where they were allowed to eat.

The teacher checked the rooms and offered a table in an unused classroom for lunch that day. Aya and Mei carried their trays there. They could hear each other talk without raising their voices.

Before they left, they cleaned the table. The teacher said she would ask the school whether the room could be used again at lunch.`,subtopic:'school lunch'},
 s1469:{reason:'Replace templated stages with a clear missing-word cause and a small domestic ending.',title:'The Note on the Fridge',text:`Leo saw a note from his sister on the fridge: “Please buy ... on the way home.” A fruit magnet covered the middle of the line.

He moved the magnet and read the word “rice.” Leo added rice to his shopping list. At the store, he remembered the note and picked up a bag.

When his sister came home, she found the rice beside the stove. She moved the magnet above the note so it would not hide the words again.`,subtopic:'family errands'},
 s1480:{reason:'The original fisherman releases the fish without requesting food; his wife asks for a cottage afterward. Retell only that first episode to distinguish the full wish-cycle retelling elsewhere.',title:'The Fisherman Frees the Fish',text:`A fisherman caught a strange fish. It spoke and asked him to let it go. He put it back into the sea and went home.

His wife asked what had happened. When he told her about the fish, she said he should have asked for a better home. She sent him back to the shore. The fisherman called to the fish and asked for a small cottage.

The fish told him to return home. There he found his wife beside a cottage. For the moment, she was pleased. The fisherman remembered that he had let the fish go before asking for anything.`,sources:['https://www.gutenberg.org/cache/epub/19068/pg19068-images.html'],subtopic:'fairy tale'},
 s1481:{reason:'The source describes merchants throwing meat into the valley and an eagle carrying away a piece to which Sindbad has tied himself. Remove the invented helpers, generic lesson and guarantee of safety.',title:'Sinbad in the Valley of Diamonds',text:`Sinbad was trapped in a deep valley. Its walls were too steep to climb, and large snakes made the ground dangerous.

He saw pieces of meat fall from above. Merchants had thrown them down so diamonds would stick to them. Great birds carried the meat up to their nests, where the merchants could collect the stones.

Sinbad tied himself to a large piece of meat. A bird lifted it from the valley with Sinbad below it. When the bird landed, he freed himself. The merchants were surprised to see a person beside the diamonds.`,sources:['https://www.gutenberg.org/files/47285/47285-h/47285-h.htm'],subtopic:'adventure classic'},
 s1491:{reason:'Resolve the contradiction between a door that opens only when unwatched and a child who watches from across the room; remove template transitions.',title:'The Door Under the Table',text:`Emi saw a tiny red door beneath a café table. Whenever she looked straight at it, the door stayed shut.

She left a cake crumb nearby and turned to watch the rain at the window. Behind her, a soft tap came from under the table. When she looked back, the door was open and a mouse in a floury hat stood beside the crumb.

The mouse pushed out a cake no bigger than a coin, took the crumb and disappeared. Emi waited for the door to close before she returned to her seat.`,subtopic:'everyday magic'},
 s1492:{reason:'Remove the unsupported claim that pond visitors needed help and the templated moral; keep the magical fish and a specific observation.',title:'The Lantern Fish of Willow Pond',text:`At dusk, Tom saw a small light under Willow Pond. It moved away each time he stepped close to the water.

The next evening, he sat still on the bank. A silver fish rose near the reeds, with a glow beneath its fins. Tom set a leaf boat on the water and watched the fish swim past it.

He left the fish in the pond. When he returned the following night, the little light was there again, moving slowly among the reeds.`,subtopic:'magical creatures'},
 s1493:{reason:'Keep the magical logic clear: the tear releases rain early and mist-covered spider silk makes the mending thread; avoid an explanatory moral.',title:'The Tailor of Rain',text:`Sora lived beside fields that needed rain. One morning, she saw a small cloud dripping over the empty road. A long tear ran across its side. By the time it reached the fields, no rain would be left.

Sora tried ordinary thread, but it fell through the cloud. At dawn the next day, she gathered a few loose strands of spider silk wet with mist. In this story, the mist let the thread hold to the cloud.

Sora sewed the tear and released the cloud. It floated over the fields, where a soft rain began.`,subtopic:'everyday magic'},
 s1504:{reason:'Remove false universal claims about town measurements and travel efficiency; identify Roman milestones as one documented example and explain their limited information.',title:'A Roman Road Marker',contentType:'explanatory-nonfiction',text:`In the Roman world, some roads had stone markers beside them. A marker could tell travelers the distance to a town or another point on the road.

Imagine walking a long road without a modern map. A stone with a place name and a number would help you judge how far you still had to go. It would not tell you the weather or whether every part of the road was open.

Some of these heavy stones remain today. Their carved words help historians study old routes and the people who used them.`,sources:['https://www.britishmuseum.org/exhibitions/legion-life-roman-army/large-print-guide'],subtopic:'Roman roads'},
 s1505:{reason:'Replace a flattened single-step diffusion story with a cautious centuries-long route and avoid comparing all prior writing with heavy tablets.',title:'Paper Travels West',contentType:'explanatory-nonfiction',text:`Paper making developed in China. Over many centuries, knowledge of the craft spread to other parts of Asia, then to lands farther west.

People made paper in new workshops and changed their methods to suit local materials. Travelers and merchants also carried finished sheets. Paper became useful for letters, records and books in many places.

This was a long history, not one trip by a single trader. Different communities learned the craft at different times and made their own kinds of paper.`,sources:['https://www.csmc.uni-hamburg.de/research/affiliated-projects/chinese-paper.html','https://www.britishmuseum.org/exhibitions/silk-roads/large-print-guide'],subtopic:'history of paper'},
 s1506:{reason:'The named crossing is imagined and cannot be presented as a documented historical event. Mark fiction and ground the navigation techniques in Pacific wayfinding.',title:'The Stars Above the Open Sea',contentType:'narrative-fiction',text:`This voyage is imagined. It draws on the way some Pacific navigators have used the stars and the sea.

A canoe crew set out for an island beyond the horizon. At night, they watched where familiar stars rose. By day, they felt the waves and looked for birds that might return to land.

The crew did not trust one sign alone. When clouds hid the stars, they checked the direction of the waves. Several days later, they saw birds flying from one side of the canoe. They followed the signs carefully until an island came into view.`,sources:['https://folklife.si.edu/magazine/hokulea-hawaiian-wayfinding','https://timeandnavigation.si.edu/navigating-at-sea/navigating-without-a-clock/early-voyages'],subtopic:'Pacific navigation'},
 s1522:{reason:'The precise rabbit episode and claimed universal benefit of several openings lack observation. Frame the particular rescue as fiction and confine it to a rabbit warren.',title:'A Second Way Into the Warren',contentType:'narrative-fiction',text:`Snow covered the entrance the young rabbit knew best. It pawed at the snow but could not clear it.

The rabbit followed the hedge to another opening in the ground. It crept inside. The tunnel turned beneath the roots and led back to the other rabbits.

The family settled together below the cold ground. Above them, fresh snow covered the first entrance. In this imagined rabbit warren, the second opening had given the young rabbit a way home.`,subtopic:'winter animals'},
 s1523:{reason:'Ant scent trails can guide nestmates, but the original makes one discovered route and whole-colony uptake sound inevitable. Qualify the example.',title:'The Ant Road Around the Stone',text:`Some ants follow chemical trails left by other ants. A trail can help them travel between food and their nest.

Imagine a stone placed across an ant path. Ants may search along its edge. When some find a way around it, they can leave more of their trail chemical on that route. Other ants may then follow it.

The path does not change because one ant gives orders. Many small movements and chemical signs can help the group find a way past an obstacle.`,sources:['https://repository.si.edu/server/api/core/bitstreams/7f78af20-33c5-4550-b637-2968bb69fc4e/content'],subtopic:'animal behavior'},
 s1524:{reason:'Approved after checking Cornell Lab description of barn owl hearing and low-light hunting; wording already limits the claim.',sources:['https://www.allaboutbirds.org/guide/Barn_Owl/lifehistory']},
 s1536:{reason:'Approved after checking NASA educational account of like and opposite magnetic poles; the class experiment describes this correctly.',sources:['https://pwg.gsfc.nasa.gov/Education/wmfield.html']},
 s1537:{reason:'The cold plate shows condensation, not the formation of a cloud, and water vapor is invisible. Make the observation and conclusion match.',title:'Drops Above a Warm Cup',text:`Leo poured warm water into a cup and held a cool plate above it. After a short time, he saw small drops on the underside of the plate.

Some water from the cup had entered the air as invisible water vapor. When that vapor met the cool plate, some of it changed back into liquid water.

Leo wiped the plate and tried again. New drops appeared. The plate showed one way that cooling can turn water vapor into visible drops.`,sources:['https://www.usgs.gov/water-science-school/science/condensation-and-water-cycle'],subtopic:'earth and everyday science'},
 s1538:{reason:'The shortest shadow is near solar noon, which need not match the clock reading of noon, and exact directions vary with location and season. Describe observed relative changes.',title:'The Shadow at Three Times',text:`Mia put a stick upright in a sunny part of the yard. She marked the end of its shadow in the morning. The shadow was long.

Around the middle of the day, she made a second mark. The shadow was shorter and pointed in a different direction. Late in the afternoon, it grew long again.

The stick had stayed still. As Earth turned, the sun appeared in different parts of the sky, so the shadow changed its length and direction. Mia kept all three marks to compare.`,sources:['https://pwg.gsfc.nasa.gov/stargaze/Ssky.htm'],subtopic:'physics and space'},
 s1549:{reason:'The invented municipal decision is explicitly made up, so classify it as narrative fiction; the text already bounds its cost and usage claims to that story.',contentType:'narrative-fiction',subtopic:'library services'},
 s1550:{reason:'An invented town transit decision should be labeled fiction and classified accordingly. Show the evaluation rather than claim ridership rose without a count.',title:'The Bus Route Meeting',contentType:'narrative-fiction',text:`This town and its bus route are imagined.

At a meeting, riders drew the trips they needed on a map. The old bus reached the market but missed the health center. Some workers also needed a later ride. A driver explained which streets a bus could use.

The town tried a new route for one month. It stopped near the market, the health center and a large work site. Staff counted riders and checked whether the bus stayed on time.

At the next meeting, they showed the results. The group then discussed which parts of the route needed another change.`,subtopic:'transit planning'},
 s1551:{reason:'A specific park decision and observed nest outcome are invented; explicitly frame the scenario as fiction and avoid claiming closure always protects nesting birds.',title:'A Path Beside the Nests',contentType:'narrative-fiction',text:`This river park is imagined. In spring, park workers saw birds nesting near a busy path. They asked a local bird specialist where people could walk without coming too close.

The workers closed a short part of the path and posted a map with another route. Some visitors asked why. A worker pointed out the nests from a distance and explained the temporary sign.

After a week, staff checked the area again. The birds were still using the nests, and visitors could reach the rest of the park by the other path.`,subtopic:'park access'}
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
 if(changed){s.reviewedAt='2026-09-25';const check=policy.inspect(s);if(check.errors.length)throw Error('Learning policy '+id+': '+JSON.stringify(check));p.text_sha256=sha(s.text);p.status='editorial-revision-2026-09-25';p.evidence='content/editorial-batch-2.11.9r.json#'+id;p.note=d.reason;}
 batch.push({id,level:s.level,title:s.title,before,after:structuredClone(s),changed,reason:d.reason,sources:d.sources||[],review:'Individual full-text reading for language, source fidelity, logical order, level fit and fiction scope; AI-assisted editorial',beforeFlags:a.flags});
 reviews.push({id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-25',note:d.reason,evidence:'content/editorial-batch-2.11.9r.json#'+id,warningDisposition:a.flags?`The ${a.flags} flag was evaluated in the complete text. ${d.reason}`:`No automatic flags. Full text checked. ${d.reason}`,origin:'editorial-batch-2.11.9r'});
}
reviews.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('stories.json',stories);write('content/current-provenance.json',prov);write('content/review-progress.json',reviews);write('content/editorial-batch-2.11.9r.json',batch);
console.log('Reviewed',batch.length,'changed',batch.filter(x=>x.changed).map(x=>x.id).join(','));
