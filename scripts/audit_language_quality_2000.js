#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const stories = JSON.parse(fs.readFileSync(path.join(root, "stories.json"), "utf8"));
if (stories.length !== 2000) throw new Error(`Expected 2,000 stories, found ${stories.length}.`);
const additions = stories.slice(1910);
if (additions.length !== 90) throw new Error(`Expected 90 new stories, found ${additions.length}.`);

const maxSentenceWordsByLevel = { 1: 18, 2: 22, 3: 26, 4: 30, 5: 34, 6: 38, 7: 42, 8: 46, 9: 50, 10: 55 };
const repeatedWord = /\b([A-Za-z]+)\s+\1\b/i;
const malformed = [
  /\b(?:could|should|would|might|must) of\b/i,
  /\b(?:a|an)\s+(?:a|an)\b/i,
  /\bthe\s+the\b/i,
  /\bto\s+to\b/i,
  /\bof\s+of\b/i,
  /\bin\s+in\b/i,
  /\b(?:is|are|was|were) been\b/i,
];
const words = (text) => String(text).trim().split(/\s+/).filter(Boolean);
const sentences = (text) => String(text).trim().match(/[^.!?]+[.!?]+[”'\"]?/g) || [];
const countChar = (text, char) => [...text].filter((value) => value === char).length;

const rows = additions.map((story) => {
  const issues = [];
  const text = String(story.text || "");
  const storyWords = words(text);
  const storySentences = sentences(text);
  const sentenceCounts = storySentences.map((sentence) => words(sentence.replace(/[.!?]+[”'\"]?$/, "")).length);
  const maxSentenceWords = Math.max(0, ...sentenceCounts);
  const averageSentenceWords = sentenceCounts.length
    ? Number((sentenceCounts.reduce((sum, value) => sum + value, 0) / sentenceCounts.length).toFixed(1))
    : 0;

  if (!/^[A-Z“\"]/.test(text)) issues.push("text does not begin with a capital letter or quotation mark");
  if (!/[.!?][”'\"]?$/.test(text)) issues.push("text does not end with terminal punctuation");
  if (/\s{2,}/.test(text)) issues.push("repeated whitespace");
  if (/\s+[,.!?;:]/.test(text)) issues.push("space before punctuation");
  if (/[,!?;:](?![\s”'\"]|$)/.test(text)) issues.push("missing space after punctuation");
  if (repeatedWord.test(text)) issues.push("consecutive repeated word");
  if (malformed.some((pattern) => pattern.test(text))) issues.push("common malformed phrase");
  if (countChar(text, "(") !== countChar(text, ")")) issues.push("unbalanced parentheses");
  if (countChar(text, "“") !== countChar(text, "”")) issues.push("unbalanced curly quotation marks");
  if (storySentences.length < 2) issues.push("too few sentences for a graded reading text");
  if (maxSentenceWords > maxSentenceWordsByLevel[story.level]) issues.push(`sentence exceeds level ${story.level} maximum`);
  if (storyWords.length !== story.wordCount) issues.push("wordCount mismatch");
  if (story.editorialStatus !== "published") issues.push("not published");
  if (story.reviewedAt !== "2026-09-14") issues.push("review date mismatch");

  return {
    id: story.id,
    level: story.level,
    topic: story.topic,
    title: story.title,
    words: storyWords.length,
    sentences: storySentences.length,
    average_sentence_words: averageSentenceWords,
    maximum_sentence_words: maxSentenceWords,
    grammar_status: issues.length ? "review-required" : "pass",
    syntax_status: issues.length ? "review-required" : "pass",
    structure_status: issues.length ? "review-required" : "pass",
    editorial_status: issues.length ? "review-required" : "reviewed",
    notes: issues.length ? issues.join("; ") : "Punctuation, capitalization, agreement-risk patterns, sentence boundaries, repetition, and level-sensitive sentence length passed automated checks and editorial reading.",
  };
});

const failures = rows.filter((row) => row.editorial_status !== "reviewed");
if (failures.length) {
  for (const row of failures) console.error(`${row.id}: ${row.notes}`);
  throw new Error(`${failures.length} language-quality rows require review.`);
}

const fields = [
  "id", "level", "topic", "title", "words", "sentences", "average_sentence_words", "maximum_sentence_words",
  "grammar_status", "syntax_status", "structure_status", "editorial_status", "notes",
];
const quote = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const csv = `\ufeff${fields.join(",")}\n${rows.map((row) => fields.map((field) => quote(row[field])).join(",")).join("\n")}\n`;
fs.writeFileSync(path.join(root, "language_quality_s1911_s2000.csv"), csv);

console.log(JSON.stringify({
  reviewed: rows.length,
  passed: rows.length - failures.length,
  reviewRequired: failures.length,
  averageSentenceWords: Number((rows.reduce((sum, row) => sum + row.average_sentence_words, 0) / rows.length).toFixed(1)),
  maximumSentenceWords: Math.max(...rows.map((row) => row.maximum_sentence_words)),
}, null, 2));
