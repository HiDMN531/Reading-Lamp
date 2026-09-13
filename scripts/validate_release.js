#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const fail = (message) => { throw new Error(message); };

const html = read("index.html");
const app = read("app.js");
const sw = read("sw.js");
const rewards = JSON.parse(read("rewards.json"));
const stories = JSON.parse(read("stories.json"));

const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateHtmlIds = htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index);
if (duplicateHtmlIds.length) fail(`duplicate HTML ids: ${[...new Set(duplicateHtmlIds)].join(", ")}`);

const htmlIdSet = new Set(htmlIds);
const directDomIds = [...app.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]);
const missingDomIds = [...new Set(directDomIds.filter((id) => !htmlIdSet.has(id)))];
if (missingDomIds.length) fail(`missing HTML elements: ${missingDomIds.join(", ")}`);

if (!app.includes('const APP_VERSION = "1.7.0"')) fail("unexpected app version");
if (!html.includes("Reading Lamp v1.7.0")) fail("footer version mismatch");
if (!sw.includes('const CACHE_NAME = "reading-lamp-v52"')) fail("service worker version mismatch");
if (!sw.includes('"./rewards.json"')) fail("rewards.json is not pre-cached");

const allowedCategories = new Set(["words", "stories", "rhythm", "exploration", "comeback", "habits", "collection"]);
const allowedMetrics = new Set([
  "totalWords", "completedStories", "readingDays", "longestStreak", "threeDayWeeks", "sevenDayWeeks",
  "topicsExplored", "levelsExplored", "returnGapDays", "shortReads", "earlyReads", "nightReads",
  "weekendReads", "healthySkips", "favorites",
  "topic:Fantasy/stories", "topic:Famous books", "topic:Nature and animals", "topic:World affairs",
  "topic:Everyday life", "topic:History", "topic:Science", "topic:Mystery and adventure",
  "topic:Travel and culture", "topic:People and biography",
]);
const allowedLampStyles = new Set(["ember", "ocean", "forest", "violet", "dawn", "moon", "prism"]);
if (rewards.length !== 58) fail(`expected 58 rewards, found ${rewards.length}`);
if (new Set(rewards.map((reward) => reward.id)).size !== rewards.length) fail("duplicate reward ids");
rewards.forEach((reward) => {
  if (!/^[a-z0-9-]{1,80}$/.test(reward.id)) fail(`invalid reward id: ${reward.id}`);
  if (!allowedCategories.has(reward.category)) fail(`invalid reward category: ${reward.id}`);
  if (!allowedMetrics.has(reward.metric)) fail(`unsupported reward metric: ${reward.id}`);
  if (!Number.isFinite(reward.threshold) || reward.threshold <= 0) fail(`invalid reward threshold: ${reward.id}`);
  if (!reward.title || !reward.description) fail(`missing reward text: ${reward.id}`);
  if (reward.unlock && (reward.unlock.type !== "lamp-style" || !allowedLampStyles.has(reward.unlock.value))) {
    fail(`invalid reward unlock: ${reward.id}`);
  }
});

const requiredRewardHooks = [
  "renderRewardHome();",
  "evaluateRewards({ notify: true });",
  "rewardState: getRewardState()",
  "applyEquippedLampStyle();",
  "function selectRewardTargets(",
  "function weeklySummaryData(",
  "const rewardSort = document.getElementById(\"rewardSort\")",
  "function renderRewardChains(",
  "function monthlySummaryData(",
  "exportRewardDiagnosticsBtn",
  "rewardNotificationsInput",
  "function validPinnedReward(",
  "getBool(LS.showRewardGoals, true)",
  "getBool(LS.rewardNotifications, true)",
];
requiredRewardHooks.forEach((hook) => { if (!app.includes(hook)) fail(`missing reward hook: ${hook}`); });
if ((app.match(/evaluateRewards\(\{ notify: true \}\);/g) || []).length < 4) fail("reward evaluation is not connected to all lifecycle events");

const topicPoolMatch = app.match(/const TOPIC_POOL = (\[[\s\S]*?\]);/);
const rewardMetricsStart = app.indexOf("function rewardMetrics(");
const rewardMetricsEnd = app.indexOf('\ndocument.getElementById("unpinRewardBtn")', rewardMetricsStart);
const rewardWeekStart = app.indexOf("function rewardWeekKey(");
const rewardWeekEnd = app.indexOf("\nfunction rewardMetrics", rewardWeekStart);
const localDateStart = app.indexOf("function localDateKey(");
const localDateEnd = app.indexOf("\nfunction weeklyReadingRhythm", localDateStart);
const weeklyRhythmStart = app.indexOf("function weeklyReadingRhythm(");
const weeklyRhythmEnd = app.indexOf("\nfunction weeklyRhythmMessage", weeklyRhythmStart);
if (!topicPoolMatch || [rewardMetricsStart, rewardMetricsEnd, rewardWeekStart, rewardWeekEnd, localDateStart, localDateEnd, weeklyRhythmStart, weeklyRhythmEnd].some((index) => index < 0)) {
  fail("could not inspect reward metrics implementation");
}
const syntheticHistory = [
  { date: "2026-01-01T12:00:00Z", topic: "Fantasy/stories", level: 2, words: 100, abandoned: false },
  { date: "2026-01-02T12:00:00Z", topic: "History", level: 3, words: 200, abandoned: false },
  { date: "2026-01-03T22:00:00Z", topic: "Science", level: 4, words: 300, abandoned: false },
  { date: "2026-01-10T12:00:00Z", topic: "Travel and culture", level: 4, words: 400, abandoned: false },
  { date: "2026-01-11T12:00:00Z", topic: "History", level: 4, words: 0, abandoned: true },
];
const inspectMetrics = new Function(
  "history",
  "favorites",
  "definitions",
  "state",
  `const getFavoriteIds = () => favorites;\nconst getWeeklyGoalDays = () => 3;\nconst combinedWpm = () => 130;\nconst hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);\n${topicPoolMatch[0]}\n${app.slice(localDateStart, localDateEnd)}\n${app.slice(weeklyRhythmStart, weeklyRhythmEnd)}\n${app.slice(rewardWeekStart, rewardWeekEnd)}\n${app.slice(rewardMetricsStart, rewardMetricsEnd)}\n` +
  "const metrics = rewardMetrics(history); return { metrics, targets: selectRewardTargets(definitions, state, metrics), summary: weeklySummaryData(history, state, new Date('2026-01-03T12:00:00Z')), summaryNext: weeklySummaryData(history, state, new Date('2026-01-10T12:00:00Z')), monthly: monthlySummaryData(history, state, new Date('2026-01-11T12:00:00Z')) };"
);
const featureState = {
  earned: {
    "stories-1": "2026-01-02T12:00:00Z",
    "words-1000": "2026-01-02T12:00:00Z",
  },
  suppressed: [],
};
const inspected = inspectMetrics(syntheticHistory, ["s001", "s002"], rewards, featureState);
const { metrics } = inspected;
// The extracted function uses its supplied history and the injected favorite getter below.
if (metrics.totalWords !== 1000 || metrics.completedStories !== 4 || metrics.readingDays !== 4 || metrics.longestStreak !== 3) {
  fail(`reward metrics failed basic totals and streaks: ${JSON.stringify(metrics)}`);
}
if (metrics.returnGapDays !== 7 || metrics.threeDayWeeks !== 1 || metrics.topicsExplored !== 4 || metrics.levelsExplored !== 3) {
  fail("reward metrics failed rhythm or exploration checks");
}
if (metrics.shortReads !== 1 || metrics.healthySkips !== 1) fail("reward metrics failed habit checks");
if (inspected.targets.length !== 3 || new Set(inspected.targets.map((target) => target.reward.id)).size !== 3) {
  fail("three distinct reward targets were not selected");
}
if (inspected.targets.map((target) => target.kind).join("|") !== "もうすぐ|今週できそう|長期目標") {
  fail("reward target bands are incorrect");
}
if (inspected.summary.readingDays !== 3 || inspected.summary.stories !== 3 || inspected.summary.words !== 600 || inspected.summary.rewards !== 2 || inspected.summary.newTopics !== 3) {
  fail(`weekly summary is incorrect: ${JSON.stringify(inspected.summary)}`);
}
if (inspected.summaryNext.readingDays !== 1 || inspected.summaryNext.words !== 400 || inspected.summaryNext.previous.readingDays !== 3 || inspected.summaryNext.previous.words !== 600) {
  fail(`previous week comparison is incorrect: ${JSON.stringify(inspected.summaryNext)}`);
}
if (inspected.monthly.readingDays !== 4 || inspected.monthly.stories !== 4 || inspected.monthly.words !== 1000 || inspected.monthly.rewards !== 2 || inspected.monthly.topics !== 4) {
  fail(`monthly summary is incorrect: ${JSON.stringify(inspected.monthly)}`);
}

if (stories.length !== 1610) fail(`expected 1,610 stories, found ${stories.length}`);
const storyIds = new Set();
const storyTitles = new Set();
let totalWords = 0;
let wordCountMismatches = 0;
let metadataErrors = 0;
const cells = new Map();
const requiredMetadata = ["subtopic", "contentType", "editorialStatus", "factChecked", "reviewedAt", "sourceWork", "vocabularyVersion"];
stories.forEach((story) => {
  if (storyIds.has(story.id)) fail(`duplicate story id: ${story.id}`);
  if (storyTitles.has(story.title)) fail(`duplicate story title: ${story.title}`);
  storyIds.add(story.id);
  storyTitles.add(story.title);
  const counted = String(story.text || "").trim().split(/\s+/).filter(Boolean).length;
  if (counted !== story.wordCount) wordCountMismatches += 1;
  totalWords += story.wordCount;
  if (requiredMetadata.some((field) => !Object.prototype.hasOwnProperty.call(story, field))) metadataErrors += 1;
  if (story.editorialStatus !== "published") metadataErrors += 1;
  const cell = `${story.level}|${story.topic}`;
  cells.set(cell, (cells.get(cell) || 0) + 1);
});
if (totalWords !== 305511) fail(`unexpected corpus word total: ${totalWords}`);
if (wordCountMismatches) fail(`wordCount mismatches: ${wordCountMismatches}`);
if (metadataErrors) fail(`story metadata errors: ${metadataErrors}`);
if (cells.size !== 100) fail(`expected 100 level/topic cells, found ${cells.size}`);
if (Math.min(...cells.values()) < 15) fail("a level/topic cell has fewer than 15 stories");

console.log(JSON.stringify({
  appVersion: "1.7.0",
  serviceWorker: "reading-lamp-v52",
  rewards: rewards.length,
  rewardCategories: new Set(rewards.map((reward) => reward.category)).size,
  lampStyles: allowedLampStyles.size + 1,
  stories: stories.length,
  words: totalWords,
  levelTopicCells: cells.size,
  minimumStoriesPerCell: Math.min(...cells.values()),
}, null, 2));
