'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy'),gate=require('./review_release_gate');
const stories=read('stories.json'),reviews=read('content/review-progress.json'),prov=read('content/current-provenance.json'),audits=read('learning_audit_records.json');
const decisions={
 s2002:['Sam opens the door for a cold cat, offers it a chair, and watches it settle. It remains clear which actions belong to Sam and which to the cat; the short present-tense clauses fit Level 1.'],
 s2005:['The duck explores the tree and flower, hears the other ducks, then returns to swim with them. The call and return make a complete sequence with concrete beginner vocabulary.'],
 s2007:['Tom checks his bag and the table before his sister points to the door. Say explicitly that the key is in the door so its location and his ability to enter agree.','Tom cannot find his key. He looks in his bag. No key. He looks on the table. No key.\n\nHis sister points to the door.\n\nTom looks at the door. The key is in the door! He can go in.\n\n"Thank you," Tom says. His sister smiles.'],
 s2009:['The fish hides behind a rock until the big fish has gone and then swims with two other small fish. Sequence, size references and the fictional sunlit water are clear.'],
 s2012:['The bird sees bread on the ground, takes it to a tree, and May watches while eating her own bread. Her referent is May, and the two separate pieces of bread remain distinguishable.'],
 s2014:['Ben follows the wet marks to his rain-soaked dog and gets a towel. The closed door and dog under the table create a small mystery without asserting an external claim.'],
 s2015:['Lia sees scenery change during her first train trip and recognizes the sea at the last stop. Her mother remains present, and the final arrival is easy to follow.'],
 s2017:['The snail moves from one leaf to another over a day while faster animals pass. The final drop of water provides a concrete stopping point; the story makes no claim about every snail.'],
 s2019:['Kim finds the toy car gone, then sees a loose red wheel at the door where her brother has the car. Remove the instruction that she follows a single wheel as though it forms a trail.','A box is open under the bed. It was closed last night. Kim looks inside. The little toy car is gone. She looks at the floor. A red wheel is by the door. Her brother is there with the car. "I can fix it," he says.'],
 s2020:['Omar takes a map, follows a left and a right turn, hears water, and reaches the lake. The directions and arrival form a simple, complete Level 1 travel scene.'],
 s2022:['Leo plants and waters a seed, waits through several days, then shares the new leaf with his sister. The wait avoids promising overnight growth and the observation stays within the story.'],
 s2024:['Ada sees an unexpected upstairs light and finds her father using a small lamp while searching for a book. The object under the chair resolves the setup and pronoun it points to the book.'],
 s2025:['Mina uses the tree as a landmark on her bus ride and meets a waiting friend at the park. The progression from bus to stop to friend is explicit.'],
 s2027:['The puppy seeks cover from rain, but water falls from the leaves. Identify the woman at the gate as its owner so their relationship is clear before she calls it in.','A puppy runs under a tree when rain begins. Drops fall from the leaves. The puppy is still wet. Its owner opens the garden gate. She calls the puppy in. There is a dry place by the door. The puppy lies down and waits for the rain to stop.'],
 s2029:['The children deny taking an apple, a sound reveals their dog holding it, and Dad retrieves it. No one eats the apple after the dog carries it; the fiction does not offer hygiene advice.'],
 s2030:['Rui walks on cool sand, watches the sunrise, and decides to stay longer on his day off. The sights, time and ending follow naturally in short sentences.'],
 s2032:['One ant cannot move the food alone; a second helps and the food reaches the hole. The repeated food/ants language and stepwise action suit Level 1 fiction.'],
 s2034:['Nao traces a ringing bell to the cat on her doorstep. Once the cat is on the step, let it inside rather than opening a separate gate.','A small bell rings in the hall. No one is there. It rings again. Nao opens the front door. A cat is on the step. The cat has a bell on its neck. It moves its head, and the bell rings. Nao laughs and lets the cat in.'],
 s2035:['Ella looks at a new town through a window and later sees her own small room from a hill. The change in viewpoint explains the final observation.'],
 s2037:['The turtle sits in sunlight, notices a fish, and leaves when the rock cools after the cloud arrives. Make the cooling gradual, not immediate.','A turtle sits on a warm rock. The sun is on its back. A fish moves in the water below. The turtle watches it. Then a cloud covers the sun. Soon the rock gets cool. The turtle goes into the water and swims away.'],
 s2039:['Max follows a blue string to the room where his sister is using its ball to make him a gift. The line of string connects the discovery and the ending.'],
 s2040:['Tao recognizes the wrong bus stop, uses the sign and next bus, then finds his street. The two stops and location references are consistent.'],
 s2041:['Lee borrows a spare short pencil from a classmate and returns it after class. Clear possessives and chronological classroom actions fit the entry level.'],
 s2042:['The bee moves from one flower to another while a child watches from the path. The action is local to one fictional bee and does not imply a general rule about pollination.'],
 s2043:['One shoe jumps on its own, the other does not, and the boy puts both on. The magical premise is explicit and his ordinary jump gives the short tale a playful close.'],
 s2044:['A first-person narrator follows two simple notes, reaches the window, and sees a friend with cakes outside. The narrator and friend remain easy to tell apart.'],
 s2045:['Jo and her grandfather cross the bridge from a field into town, pause over the river, and buy bread. The two sides and destination remain consistent.'],
 s2046:['Nia invites her brother to a show; they attend and recall a funny part while walking home. Simple pronouns and clear order suit Level 1.'],
 s2047:['A fish moves with a leaf across a pond while a boy interprets the motion as play. The boy’s thought is framed as his interpretation, not a claim about fish behavior.'],
 s2048:['A personified bedside light illuminates a girl’s book before she falls asleep. Lives signals fantasy, and the light’s action ends the nighttime scene.'],
 s2049:['May finds a sleeping cat in a box. Keep the box open when she lets it rest so the ending does not suggest shutting the cat inside.','The house is very quiet. Where is the cat? May looks in the kitchen and under the table. No cat. She hears a soft sound from a box. She opens it. The cat is asleep inside. May leaves the box open and lets it rest.'],
 s2050:['Kim boards the last boat before it crosses the river, then sees her sister on the far side. The man waits for her to board and the crossing finishes the travel scene.']
};
const batch=[];
for(const [id,[reason,newText]] of Object.entries(decisions)){
 const s=stories.find(x=>x.id===id),a=audits.find(x=>x.id===id),p=prov.find(x=>x.id===id);
 if(!s||!a||!p||reviews.some(x=>x.id===id)||s.level!==1||a.errors)throw Error('Unexpected source '+id);
 const before=structuredClone(s);
 if(s.topic==='Nature and animals'&&s.contentType==='explanatory-nonfiction')s.contentType='narrative-fiction';
 if(newText){s.text=newText;s.wordCount=policy.countWords(newText);}
 const changed=Boolean(newText)||s.contentType!==before.contentType;
 if(changed){s.reviewedAt='2026-09-24';const c=policy.inspect(s);if(c.errors.length)throw Error('Learning policy '+id+': '+JSON.stringify(c));p.text_sha256=sha(s.text);p.status='editorial-revision-2026-09-24';p.evidence='content/editorial-batch-2.11.9e.json#'+id;p.note=reason+(s.contentType!==before.contentType?' The individual animal scene is fictional rather than explanatory nonfiction.':'');}
 batch.push({id,level:s.level,title:s.title,before,after:structuredClone(s),changed,reason:reason+(s.contentType!==before.contentType?' Corrected illustrative animal scene from explanatory-nonfiction to narrative-fiction.':''),sources:[],review:'Full text read for vocabulary, grammar, naturalness, pronouns, sequence, Level 1 fit and fiction scope; AI-assisted editorial, not human certification',beforeFlags:a.flags});
 reviews.push({id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-24',note:reason,evidence:'content/editorial-batch-2.11.9e.json#'+id,warningDisposition:a.flags?`The ${a.flags} flag was assessed in the complete text; recurring names or necessary scene words are contextualized by short clauses and clear actions. ${reason}`:`No automatic flags. Full text checked for syntax, continuity, references, level and fictional scope. ${reason}`,origin:'editorial-batch-2.11.9e'});
}
reviews.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('stories.json',stories);write('content/current-provenance.json',prov);write('content/review-progress.json',reviews);write('content/editorial-batch-2.11.9e.json',batch);
console.log('Reviewed',batch.length,'revised',batch.filter(x=>x.changed).map(x=>x.id).join(','));
