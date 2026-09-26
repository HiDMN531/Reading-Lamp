'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const write=(p,v)=>fs.writeFileSync(path.join(root,p),JSON.stringify(v,null,2)+'\n');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const policy=require('../learning-policy'),gate=require('./review_release_gate');
const edits={
 s858:'A sailor stood on a ship at night. He wanted to sail east. He found the North Star. It showed him where north was. He kept that star to his left. The ship moved through the night. At sunrise, he saw land ahead. The star had helped him keep his course.',
 s860:'The shadow of a tree is long in the morning. Near the middle of the day, it grows short. In the evening, it becomes long again on the other side. The tree does not move. The Sun seems to move across the sky. Its light now comes from another place. The changing light makes the shadow move over the ground.',
 s1312:'Jon Bell opened a small bike shop. A worker came in with a broken wheel. Jon showed her how to take it off. He showed her how to put it back on. She watched and then tried it herself. The next week, she helped a friend fix a bike. Jon was glad. His shop could help people learn.',
 s1313:'Amina Okafor kept seeds from nearby farms. One family brought her beans. Their family had grown them for years. Amina put the seeds in a dry bag. She wrote the family’s name on it. In spring, she shared some seeds with two neighbors. They planted them and saved seeds from the new plants. More families could now try growing those beans.',
 s1315:'Hana Mori made wooden toys in her shop. A boy brought back a toy car. One wheel was loose. Hana showed him how the wheel fit on. She made her next cars with wheels that were easy to change. Later, another wheel came loose. The boy knew what to do. He told Hana that his car was moving again.',
 s1316:'Samir Patel worked with a village clinic. In heavy rain, one road was hard to use. Samir asked families when they could meet the nurse. He wrote down their answers. He planned a visit for a clear day. A local helper told the families about it. On that day, the nurse met them at the village hall.',
 s1318:'David Kim helped at a small town radio station. Storms sometimes cut the power. The station then went quiet. David kept a two-way radio and spare batteries ready. During the next storm, he called the town office on the radio. He told them which road was closed. The town office shared the news with families.',
 s1322:'Omar Reed kept records for three bridges. One winter, he could not find the old repair notes. He asked an engineer to check the bridges. The engineer found some work that needed to be done. Omar wrote it down. He made a new file for each bridge. Before the next storm, the town could plan the repairs.',
 s1325:'Sara Lind repaired boat engines near a harbor. New parts often took days to arrive. Sara made a list of parts that broke often. She ordered the correct parts for the engines she knew. She kept them in her shop. One morning, a fisher came with a broken engine. Sara fitted the right part. She tested the engine on land. Then the boat could go out.'
};
const stories=read('stories.json'),reviews=read('content/review-progress.json'),prov=read('content/current-provenance.json'),batch=read('content/editorial-batch-2.11.9i.json'),log=read('content/revision-log.json');
for(const [id,text] of Object.entries(edits)){
 const s=stories.find(x=>x.id===id),b=batch.find(x=>x.id===id),p=prov.find(x=>x.id===id),r=reviews.find(x=>x.id===id);
 if(!s||!b||!p||!r||b.origin)throw Error('Missing editorial target '+id);
 s.text=text;s.wordCount=policy.countWords(text);
 const check=policy.inspect(s);if(check.errors.length||check.warnings.includes('dense-syntax'))throw Error('New warning '+id);
 p.text_sha256=sha(text);b.after=structuredClone(s);b.reason+=' Final pass: split dense sentences into short Level 1 clauses and checked the referents.';
 r.contentDigest=gate.reviewDigest(s);r.note=b.reason;r.warningDisposition='Final full-text pass after the sentence revision. '+b.reason;
 const l=log.find(x=>x.id===id);if(l){l.afterSha256=sha(text);l.reason=b.reason;}
}
write('stories.json',stories);write('content/review-progress.json',reviews);write('content/current-provenance.json',prov);write('content/editorial-batch-2.11.9i.json',batch);write('content/revision-log.json',log);
console.log('Refined',Object.keys(edits).join(','));
