#!/usr/bin/env node
'use strict';
const p=require('../learning-policy');
const [levelText,topic,wordsText='150']=process.argv.slice(2),level=Number(levelText),words=Number(wordsText);
if(!topic||!Number.isInteger(level)||level<1||level>10||!Number.isInteger(words)||words<40||words>2000)throw Error('Usage: node scripts/create_authoring_brief.js LEVEL "TOPIC" WORDS (40-2000)');
console.log(`Write ONE original English extensive-reading passage. Topic: ${topic}. Target: ${words} words, within 15%.\n${p.instructions(level)}\nProvide a draft, then separately record actual vocabulary concerns, sources, grammar/coherence review and originality checks. Do not self-label an unverified fact as checked. Reading Lamp uses 10 internal levels, not certified CEFR bands.`);
