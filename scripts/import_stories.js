#!/usr/bin/env node
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const policy = require('../learning-policy.js');
const TOPICS = ['Fantasy/stories','Nature and animals','World affairs','Everyday life','History','Science','Famous books','Mystery and adventure','Travel and culture','People and biography'];
function contentDigest(s) {
  return crypto.createHash('sha256').update(JSON.stringify([s.id,s.level,s.topic,s.title,s.text,s.sourceWork,s.contentType,s.factScope,s.subtopic,s.wordCount])).digest('hex');
}
function validateBatch(bank, additions, reviews) {
  if (!Array.isArray(additions) || !additions.length || !Array.isArray(reviews)) throw Error('Expected nonempty drafts and review array');
  const reviewMap = new Map(reviews.map(r => [r.id, r]));
  if (reviewMap.size !== reviews.length) throw Error('Duplicate review ID');
  const ids = new Set(bank.map(s=>s.id)), titles = new Set(bank.map(s=>s.title.trim().toLowerCase()));
  const normalize = t => t.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const texts = new Set(bank.map(s=>normalize(s.text)));
  let next = Math.max(0,...bank.map(s=>Number(s.id.slice(1))))+1;
  return additions.map(s=>{
    const check = policy.inspect(s), r = reviewMap.get(s.id);
    if (s.id !== `s${String(next++).padStart(3,'0')}` || ids.has(s.id)) throw Error(`ID/sequence: ${s.id}`);
    if (!TOPICS.includes(s.topic)) throw Error(`Topic: ${s.id}`);
    if (check.errors.length || check.warnings.length) throw Error(`Learning checks: ${s.id}: ${[...check.errors,...check.warnings]}`);
    if (s.wordCount !== check.metrics.words) throw Error(`Word count: ${s.id}`);
    if (titles.has(s.title.trim().toLowerCase()) || texts.has(normalize(s.text))) throw Error(`Duplicate: ${s.id}`);
    if (!r || r.contentDigest !== contentDigest(s) || r.policyVersion !== policy.version || r.decision !== 'approved') throw Error(`Missing/stale review: ${s.id}`);
    for (const key of ['vocabulary','grammar','coherence','facts','originality']) {
      if (typeof r[key] !== 'string' || r[key].trim().length < 20) throw Error(`Review ${key}: ${s.id}`);
    }
    if (!['AI-assisted-editorial','human-editorial'].includes(r.method) || !/^\d{4}-\d{2}-\d{2}$/.test(r.reviewedAt)) throw Error(`Review attribution: ${s.id}`);
    if (s.factChecked !== true || !s.factScope || !s.contentType || !s.subtopic || s.vocabularyVersion !== 'v3') throw Error(`Metadata: ${s.id}`);
    if (s.topic === 'Famous books' && (!s.sourceWork || !r.sources?.some(u=>/^https:\/\//.test(u)))) throw Error(`Classic source: ${s.id}`);
    if (s.factScope === 'verified-external-claims' && !r.sources?.length) throw Error(`Fact sources: ${s.id}`);
    ids.add(s.id); titles.add(s.title.trim().toLowerCase()); texts.add(normalize(s.text));
    return {...s,editorialStatus:'published',reviewedAt:r.reviewedAt,learningPolicyVersion:policy.version};
  });
}
if (require.main === module) {
  const [draftPath, reviewPath, flag] = process.argv.slice(2);
  if (!draftPath || !reviewPath || (flag && flag!=='--write')) throw Error('Usage: node scripts/import_stories.js drafts.json reviews.json [--write]');
  const target = path.resolve(__dirname,'../stories.json');
  const bank = JSON.parse(fs.readFileSync(target,'utf8'));
  const approved = validateBatch(bank,JSON.parse(fs.readFileSync(draftPath,'utf8')),JSON.parse(fs.readFileSync(reviewPath,'utf8')));
  if (flag === '--write') {
    fs.writeFileSync(target+'.tmp',JSON.stringify([...bank,...approved],null,2)+'\n');
    fs.renameSync(target+'.tmp',target);
  }
  console.log(JSON.stringify({mode:flag?'written':'dry-run',added:approved.length,total:bank.length+approved.length}));
}
module.exports = { validateBatch, contentDigest };
