'use strict';
// This gate records completed work; it cannot perform editorial review itself.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function reviewDigest(s){
 return hash(JSON.stringify([s.id,s.title,s.text,s.level,s.topic,s.contentType,s.sourceWork??null,s.factScope??null]));
}
function assetDigest(){
 const names=Object.keys(read('release-assets.json')).sort();
 return hash(JSON.stringify(names.map(n=>[n,hash(fs.readFileSync(path.join(root,n)))])));
}
function assess(stories,reviews,audits,verification,digest){
 const byId=new Map(reviews.map(x=>[x.id,x]));
 const auditById=new Map(audits.map(x=>[x.id,x]));
 const pending=[];
 const problems=[];
 if(byId.size!==reviews.length)problems.push('duplicate-review-id');
 if(reviews.some(r=>!stories.some(s=>s.id===r.id)))problems.push('unknown-review-id');
 for(const s of stories){
  const r=byId.get(s.id),a=auditById.get(s.id);
  const valid=r&&r.contentDigest===reviewDigest(s)&&r.language==='approved'&&r.facts==='approved'
   &&['AI-assisted-editorial','human-editorial'].includes(r.method)
   &&typeof r.note==='string'&&r.note.trim().length>20
   &&typeof r.evidence==='string'&&r.evidence.trim()
   &&/^\d{4}-\d{2}-\d{2}$/.test(r.reviewedAt||'');
  const currentAudit=a&&a.text_sha256===hash(s.text)&&!a.errors;
  const warningsHandled=a&&!a.flags || r&&typeof r.warningDisposition==='string'&&r.warningDisposition.trim().length>20;
  if(!valid||!currentAudit||!warningsHandled)pending.push(s.id);
 }
 for(const name of ['automatedTests','browserTests']){
  const v=verification[name];
  if(!v||v.status!=='passed'||v.assetDigest!==digest||!v.evidence)problems.push(name);
 }
 return {ready:pending.length===0&&problems.length===0,total:stories.length,reviewed:stories.length-pending.length,pending:pending.length,pendingIds:pending,verificationBlockers:problems};
}
function current(){return assess(read('stories.json'),read('content/review-progress.json'),read('learning_audit_records.json'),read('content/verification-status.json'),assetDigest())}
if(require.main===module){const r=current();console.log(JSON.stringify({...r,pendingIds:r.pendingIds.slice(0,20)},null,2));process.exitCode=r.ready?0:2;}
module.exports={reviewDigest,assetDigest,assess,current};
