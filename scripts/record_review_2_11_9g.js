'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy'),gate=require('./review_release_gate');
const stories=read('stories.json'),reviews=read('content/review-progress.json'),prov=read('content/current-provenance.json'),audits=read('learning_audit_records.json');
// Each entry is an individual full-text editorial decision, not approval by automated audit.
const decisions={
 s343:{reason:'One particular cat sleeps, eats and returns to bed; its happiness is the narrator’s imaginative interpretation. Classify the small scene as fiction rather than a general account of cats.',contentType:'narrative-fiction'},
 s344:{reason:'The blue fish, fleeing smaller fish and its supposed indifference to cold form an invented scene, not species-level marine biology. Fiction classification makes the subjective language appropriate.',contentType:'narrative-fiction'},
 s345:{reason:'The text follows a few birds singing, resting and flying again. Correct its unrelated plants-and-fungi subtopic and identify the birds’ happiness as part of a fictional scene.',contentType:'narrative-fiction',subtopic:'birds and flight'},
 s403:{reason:'The mouse is freed, then bites through the net holding the lion. The lion’s thanks completes the fable; the dialogue and short temporal transition are understandable at Level 1.'},
 s404:{reason:'The hare stops to sleep and the tortoise continues; the race outcome follows from the setup. Repeated references to each animal are clear at Level 1.'},
 s405:{reason:'The boy’s two false alarms explain why villagers ignore the true alarm. Letting the sheep run away gives the retelling a consequence without a graphic ending.'},
 s435:{reason:'The opening explicitly calls this a made-up town; classify it as an illustrative fiction. Replace the absolute claim that every resident benefits with a modest ending acknowledging unequal effects.',contentType:'narrative-fiction',text:'This town is made up. It builds a new road. Many workers help. The road connects two small towns. Before the road, the trip was long. Now the trip is shorter. Cars and buses use the new road. Some farmers can sell food more easily. Some families can visit one another more often. The road helps many people.'},
 s475:{reason:'The fox cannot reach the grapes and calls them bad, although he still wants them. The final explanation of his excuse agrees with the fable’s action.'},
 s495:{reason:'The episode describes one mother duck and her ducklings on a pond, so identify the adult at the start and mark the scene as fiction. Avoid assuming the duck’s internal happiness.',contentType:'narrative-fiction',text:'A mother duck swims on the pond. The water is calm. She finds food and eats. Her little ducks follow her. They swim in a line. The pond is peaceful today.'},
 s505:{reason:'A particular restaurant and diners are a made-up social scene. Replace “all the people” with people in the room and mark the example as fiction.',contentType:'narrative-fiction',text:'This restaurant is made up. It gives free meals to people who need them. The food is warm. People say thank you. The owner is glad to help. The diners eat together.'},
 s545:{reason:'In the old text Grandma was not located, yet the ending said she was safe. Show her hiding and let the girl call the nearby worker, so the wolf’s departure resolves both people’s danger.',text:'A girl wore a little red hood. One day, her mother gave her a basket of food. “Please take this to Grandma,” she said. “Stay on the road.” The girl walked through the forest. A wolf saw her and asked where she was going. She told him. The wolf ran ahead to Grandma’s house. Grandma saw him and hid in a back room. When the girl arrived, she saw the wolf and called for help. A man working nearby heard her. He came to the house, and the wolf ran away. Grandma came out. She and the girl were safe.'},
 s575:{reason:'The rabbit hears a sound, runs and hides. It is a plausible event involving one particular rabbit, so classify it as fiction rather than a universal description of rabbit behavior.',contentType:'narrative-fiction'},
 s576:{reason:'The ant with a leaf and its helpers are individual story characters. The brief scene has a clear task and ending, but is not a general account of all ants.',contentType:'narrative-fiction'},
 s595:{reason:'The bridge and unanimous happiness belong to an invented town. Mark the account as fiction and remove the claim that everyone benefits.',contentType:'narrative-fiction',text:'This town is made up. A river runs through it. People have to walk far to cross. The town builds a new bridge. Now many people can cross more easily. Cars use the bridge. Some children walk across it to school.'},
 s596:{reason:'The food-sharing family and neighbors are an illustrative fictional episode. Clarify that the neighbors share food the following week rather than guaranteeing that everyone in the street does so.',contentType:'narrative-fiction',text:'A family has extra food. They give some to their neighbors. The neighbors are glad. The next week, those neighbors have extra food, too. They share some with the family. They smile when they meet on the street.'},
 s655:{reason:'The NIH MedlinePlus description supports irritation from dust and sneezing; replace the overly absolute claim that every sneeze cleans the nose with a qualified explanation.',text:'Sometimes dust gets in our nose. It can make our nose feel funny. Then we may sneeze. Air comes out of our nose very fast. A sneeze can help move the dust out.',sources:['https://medlineplus.gov/ency/article/003060.htm']},
 s675:{reason:'The swan grows up after winter, sees its reflection and recognizes its identity. This is a fairy-tale retelling; its ending expresses his feelings as fiction.'},
 s676:{reason:'Beds stacked on top of a pea make the scene physically confused. Use mattresses, as in the fairy tale; the unusual word is needed for this plot and is supported by the immediately following blankets and bed context.',text:'One rainy night, a young woman came to a palace. She said she was a princess. The queen wanted to know if this was true. The queen put one small pea on a bed. Then she put many soft mattresses and blankets over it. The young woman slept there. In the morning, the queen asked, “Did you sleep well?” “No,” the young woman said. “I felt something hard under me.” The queen was surprised. The young woman had felt the pea through all those mattresses. The prince was happy, and the young woman stayed at the palace.'},
 s698:{reason:'Sara observes one specific group of ants. The apple and shared path are part of a fictional garden episode; reclassify it from generalized nonfiction. The order from discovery to gathering stays clear.',contentType:'narrative-fiction'},
 s699:{reason:'The village and new well present a specific invented sequence without a documented place. Mark it as fiction, while retaining the drought, assistance, second well and hygiene rule as coherent details.',contentType:'narrative-fiction'}
};
const batch=[];
for(const [id,d] of Object.entries(decisions)){
 const s=stories.find(x=>x.id===id),p=prov.find(x=>x.id===id),a=audits.find(x=>x.id===id);
 if(!s||!p||!a||a.errors||s.level!==1||reviews.some(x=>x.id===id))throw Error('Unexpected source '+id);
 const before=structuredClone(s);
 if(d.text){s.text=d.text;s.wordCount=policy.countWords(s.text)}
 if(d.contentType)s.contentType=d.contentType;
 if(d.subtopic)s.subtopic=d.subtopic;
 const changed=Boolean(d.text||d.contentType||d.subtopic);
 if(changed){s.reviewedAt='2026-09-24';const check=policy.inspect(s);if(check.errors.length)throw Error('Learning policy '+id+': '+JSON.stringify(check));p.text_sha256=sha(s.text);p.status='editorial-revision-2026-09-24';p.evidence='content/editorial-batch-2.11.9g.json#'+id;p.note=d.reason;}
 batch.push({id,level:s.level,title:s.title,before,after:structuredClone(s),changed,reason:d.reason,sources:d.sources||[],review:'Individual full-text check of grammar, reference, continuity, Level 1 vocabulary and factual/fictional scope; AI-assisted editorial',beforeFlags:a.flags});
 reviews.push({id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-24',note:d.reason,evidence:'content/editorial-batch-2.11.9g.json#'+id,warningDisposition:a.flags?`The ${a.flags} flag was evaluated in the complete text. ${d.reason}`:`No automatic flags. Full text checked. ${d.reason}`,origin:'editorial-batch-2.11.9g'});
}
reviews.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('stories.json',stories);write('content/current-provenance.json',prov);write('content/review-progress.json',reviews);write('content/editorial-batch-2.11.9g.json',batch);
console.log('Reviewed',batch.length,'changed',batch.filter(x=>x.changed).map(x=>x.id).join(','));
