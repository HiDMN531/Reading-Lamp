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
 s2001:{
  note:'Mia prepares two cups after her tired father comes home, and the parallel actions end in a shared drink and matching smiles. Pronouns remain clear, the present tense is consistent, and the concrete repetition suits Level 1.',
  warning:'The low-frequency warning is caused by Mia, a character name. Cup, color, table, sit, drink and smile are supported by the scene; the entire passage was checked for syntax and reference.'
 },
 s2003:{
  note:'Ken leaves his hat on a chair, wind moves it to the floor, and he finds it beneath his dog when he returns. The missing-hat surprise follows the stated positions, and the short present-tense sentences fit Level 1.',
  warning:'No automatic flags. The full passage was checked for article use, location words, tense, sequence and the final visual joke.'
 },
 s2008:{
  note:'The personified wind knocks, enters after the mouse invites it, moves a paper boat, and returns for another game. Dialogue tags and repeated nouns keep references clear; the impossible actions are plainly fantasy.',
  warning:'No automatic flags. The complete passage was checked for punctuation, present-tense consistency, action order and fantasy scope.'
 },
 s2018:{
  note:'Nora finds a tiny glowing star, uses its light in her room, and releases it through the window in the morning. The spatial sequence is coherent, pronouns have clear referents, and the boxed star is unmistakably fantasy.',
  warning:'No automatic flags. The whole narrative was checked for simple vocabulary, syntax, continuity and fiction-versus-fact scope.'
 },
 s2021:{
  note:'Ana and her son add carrots to a pot, wait together, and share the warm soup. The text presents a family scene rather than a complete recipe; actions and pronouns are clear, and the simple present tense suits Level 1.',
  warning:'The low-frequency warning is caused by Ana, a character name. Stove, pot and carrots are concrete topic words; the whole passage was checked and is not treated as cooking instructions.'
 },
 s2023:{
  note:'A mouse rings a long-unused bell, which draws a bird and cat to a meeting place before ringing again. The animals and social bell are personified fantasy, while the action chain and repeated bell references remain clear.',
  warning:'No automatic flags. The full text was checked for grammar, reference, causality and the boundary between animal fantasy and real animal behavior.'
 },
 s2026:{
  note:'Pat notices a new boy without a seat, invites him by pointing, and uses a funny picture to move past their initial silence. The social sequence is easy to follow, pronouns are unambiguous, and the short clauses fit Level 1.',
  warning:'No automatic flags. The complete passage was checked for naturalness, reference, sequence and age-neutral fictional framing.'
 },
 s2028:{
  note:'Ivy hears a stone ask to be moved, carries it to the river, and receives its thanks. The speech and preference belong to a clearly personified stone, not a factual claim; sentence structure and references suit Level 1.',
  warning:'The low-frequency warning is caused by Ivy, a character name. River and stone are necessary scene words; the whole passage was checked for grammar, sequence and fantasy scope.'
 },
 s2031:{
  note:'Sara retraces her route while looking for a missing glove, then a child outside the shop returns it. One glove versus the other remains clear, the search locations are coherent, and the dialogue closes the Level 1 story naturally.',
  warning:'The low-frequency warning is caused by Sara, a character name. The complete text was checked for pronoun reference, location sequence, dialogue punctuation and beginner readability.'
 },
 s2033:{
  note:'A child makes a paper moon, cannot see it in darkness, and makes it visible by turning on a lamp. Bright describes the lit appearance rather than emitted light; the good-night line is playful and the moon remains ordinary paper.',
  warning:'No automatic flags. The entire passage was checked for cause and effect, simple syntax, physical interpretation and imaginative tone.'
 },
 s2036:{
  note:'Noah places a plant by a window, waters it regularly, notices a new leaf, and shares the result with a friend. Her final comment is a character inference rather than universal plant-care advice; pronouns and chronology are clear.',
  warning:'No automatic flags. The full passage was checked for tense, reference, sequence, Level 1 vocabulary and the limits of its plant-care claim.'
 },
 s2038:{
  note:'A cold young dragon produces only a tiny light, and a girl brings a blanket and stays with it. The final warmth can follow from the blanket and companionship as well as the light; the fantasy premise and emotional ending are coherent.',
  warning:'No automatic flags. The complete story was checked for modal use, pronoun reference, causality, beginner sentence length and fantasy scope.'
 }
};

const batch=[];
for(const [id,d] of Object.entries(decisions)){
 const s=stories.find(x=>x.id===id),a=audits.find(x=>x.id===id);
 if(!s||!a||progress.some(x=>x.id===id)||s.level!==1||s.contentType!=='narrative-fiction'||a.errors)throw Error('Unexpected source state '+id);
 batch.push({
  id,level:s.level,title:s.title,before:s,after:s,changed:false,reason:d.note,sources:[],
  review:'Full text read for vocabulary, grammar, syntax, naturalness, sequence, level and fiction-vs-fact scope; AI-assisted editorial, not human certification',
  beforeFlags:a.flags,afterAudit:a
 });
 progress.push({
  id,contentDigest:gate.reviewDigest(s),language:'approved',facts:'approved',method:'AI-assisted-editorial',reviewedAt:'2026-09-24',
  note:d.note,evidence:'content/editorial-batch-2.11.9c.json#'+id,warningDisposition:d.warning,origin:'editorial-batch-2.11.9c'
 });
}
progress.sort((a,b)=>Number(a.id.slice(1))-Number(b.id.slice(1)));
write('content/editorial-batch-2.11.9c.json',batch);
write('content/review-progress.json',progress);
console.log(gate.current().reviewed,gate.current().pending);
