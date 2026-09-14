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
const config = JSON.parse(read("config.json"));
const rewards = JSON.parse(read("rewards.json"));
const stories = JSON.parse(read("stories.json"));
const vocabularyAudit = read("vocabulary_audit_2000.csv");
const vocabularyReview = read("vocabulary_editorial_review_2000.csv");
const factCheck = read("fact_check_all_2000.csv");
const languageQuality = read("language_quality_s1911_s2000.csv");

const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const duplicateHtmlIds = htmlIds.filter((id, index) => htmlIds.indexOf(id) !== index);
if (duplicateHtmlIds.length) fail(`duplicate HTML ids: ${[...new Set(duplicateHtmlIds)].join(", ")}`);

const htmlIdSet = new Set(htmlIds);
const directDomIds = [...app.matchAll(/getElementById\("([^"]+)"\)/g)].map((match) => match[1]);
const missingDomIds = [...new Set(directDomIds.filter((id) => !htmlIdSet.has(id)))];
if (missingDomIds.length) fail(`missing HTML elements: ${missingDomIds.join(", ")}`);

if (!app.includes('const APP_VERSION = "2.5.2"')) fail("unexpected app version");
if (!html.includes("Reading Lamp v2.5.2")) fail("footer version mismatch");
if (!sw.includes('const CACHE_NAME = "reading-lamp-v63"')) fail("service worker version mismatch");
if (!html.includes('<button id="startBtn" class="btn-primary btn-lg">読みはじめる</button>')) fail("offline start button label mismatch");
if (!app.includes('? "読みはじめる"')) fail("dynamic offline start button label mismatch");
if (html.includes("おまかせで読みはじめる") || app.includes("おまかせで読みはじめる") || html.includes("この条件で1篇読みはじめる") || app.includes("この条件で1篇読みはじめる")) fail("obsolete offline start label remains");
if (!sw.includes('"./rewards.json"')) fail("rewards.json is not pre-cached");
if (!sw.includes('"./config.json"')) fail("config.json is not pre-cached");
if (!sw.includes('const OFFLINE_CONTENT_FILES = ["./stories.json"]')) fail("offline story package is not separated from the app shell");
const shellFilesBlock = sw.slice(sw.indexOf("const SHELL_FILES"), sw.indexOf("const OFFLINE_CONTENT_FILES"));
if (shellFilesBlock.includes('"./stories.json"')) fail("stories.json must not block app-shell installation");
if (!sw.includes('event.data.type === "PREPARE_OFFLINE"') || !sw.includes('event.data.type === "OFFLINE_STATUS"')) fail("offline preparation messaging is missing");
if (typeof config.analyticsEndpoint !== "string" || typeof config.storyReportEndpoint !== "string") fail("invalid collection endpoint config");
const homeStartIndex = html.indexOf('class="home-start-area"');
const counterHeroIndex = html.indexOf('class="counter-hero"');
const statRowIndex = html.indexOf('class="stat-row"');
if (homeStartIndex < 0 || counterHeroIndex < 0 || statRowIndex < 0 || homeStartIndex > counterHeroIndex || homeStartIndex > statRowIndex) {
  fail("today reading controls are not at the top of the home view");
}
if (!app.includes("history.slice(0, 3).forEach")) fail("home history is not limited to three entries");
if (!app.includes("const HISTORY_LIMIT = 2000")) fail("stored history limit changed unexpectedly");
if (!app.includes("selectRewardTargets(definitions, state, metrics).slice(0, 1)")) fail("home reward target is not limited to one");
if (!app.includes("active.slice(0, 4)")) fail("recommended reward collection is not limited to four");
if (!html.includes('<option value="recommended">いま見る4件（おすすめ）</option>')) fail("recommended reward view is missing");
if (!app.includes("newlyEarned.length > 3")) fail("bulk reward notifications are not consolidated");
if (!app.includes("pickStoryCandidates(bank, topicSelect.value, getLevel(), 3)")) fail("three-story candidates are missing");
if ((html.match(/name="onboardingLevelSample"/g) || []).length !== 3) fail("three onboarding level samples are required");
if (!app.includes("anonymousInstallId: getAnonymousInstallId()")) fail("anonymous usage payload is missing its pseudonymous id");
if (!app.includes("if (!getBool(LS.anonymousUsageConsent, false)")) fail("anonymous usage consent guard is missing");
if (!app.includes("const REPORT_QUEUE_LIMIT = 100")) fail("story report queue limit is missing");
if (!app.includes("flushStoryReports()")) fail("story report retry flow is missing");

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
if (rewards.length !== 100) fail(`expected 100 rewards, found ${rewards.length}`);
if (new Set(rewards.map((reward) => reward.id)).size !== rewards.length) fail("duplicate reward ids");
if (new Set(rewards.map((reward) => reward.title)).size !== rewards.length) fail("duplicate reward titles");
if (new Set(rewards.map((reward) => `${reward.metric}|${reward.threshold}`)).size !== rewards.length) fail("duplicate reward milestones");
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
  { date: "2026-01-03T12:00:00Z", topic: "Science", level: 4, words: 300, abandoned: false },
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

if (stories.length !== 2000) fail(`expected 2,000 stories, found ${stories.length}`);
const storyIds = new Set();
const storyTitles = new Set();
const storyTexts = new Set();
let totalWords = 0;
let wordCountMismatches = 0;
let metadataErrors = 0;
const cells = new Map();
const newCells = new Map();
const requiredMetadata = ["subtopic", "contentType", "editorialStatus", "factChecked", "reviewedAt", "sourceWork", "vocabularyVersion"];
const allowedStoryTopics = new Set([
  "Fantasy/stories", "Nature and animals", "World affairs", "Everyday life", "History",
  "Science", "Famous books", "Mystery and adventure", "Travel and culture", "People and biography",
]);
const contentTypeForTopic = {
  "Fantasy/stories": "narrative-fiction",
  "Nature and animals": "explanatory-nonfiction",
  "World affairs": "explanatory-nonfiction",
  "Everyday life": "narrative-fiction",
  History: "historical-narrative",
  Science: "explanatory-nonfiction",
  "Famous books": "classic-retelling",
  "Mystery and adventure": "mystery-fiction",
  "Travel and culture": "travel-vignette",
  "People and biography": "fictional-biography",
};
stories.forEach((story, index) => {
  const expectedId = `s${String(index + 1).padStart(3, "0")}`;
  if (story.id !== expectedId) fail(`unexpected story sequence at ${expectedId}: ${story.id}`);
  if (storyIds.has(story.id)) fail(`duplicate story id: ${story.id}`);
  if (storyTitles.has(story.title)) fail(`duplicate story title: ${story.title}`);
  if (storyTexts.has(story.text)) fail(`duplicate story text: ${story.id}`);
  storyIds.add(story.id);
  storyTitles.add(story.title);
  storyTexts.add(story.text);
  if (!Number.isInteger(story.level) || story.level < 1 || story.level > 10) fail(`invalid story level: ${story.id}`);
  if (!allowedStoryTopics.has(story.topic)) fail(`invalid story topic: ${story.id}`);
  if (!String(story.title || "").trim() || !String(story.text || "").trim()) fail(`missing story content: ${story.id}`);
  const counted = String(story.text || "").trim().split(/\s+/).filter(Boolean).length;
  if (counted !== story.wordCount) wordCountMismatches += 1;
  totalWords += story.wordCount;
  if (requiredMetadata.some((field) => !Object.prototype.hasOwnProperty.call(story, field))) metadataErrors += 1;
  if (story.editorialStatus !== "published") metadataErrors += 1;
  if (typeof story.factChecked !== "boolean") metadataErrors += 1;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(story.reviewedAt)) metadataErrors += 1;
  if (story.vocabularyVersion !== "v2") metadataErrors += 1;
  if (!String(story.subtopic || "").trim()) metadataErrors += 1;
  if (story.contentType !== contentTypeForTopic[story.topic]) metadataErrors += 1;
  if (story.topic === "Famous books" ? !String(story.sourceWork || "").trim() : story.sourceWork !== null) metadataErrors += 1;
  const cell = `${story.level}|${story.topic}`;
  cells.set(cell, (cells.get(cell) || 0) + 1);
  if (story.reviewedAt !== "2026-09-14" || story.factChecked !== true) metadataErrors += 1;
  if (index >= 1910) {
    newCells.set(cell, (newCells.get(cell) || 0) + 1);
  }
});
if (totalWords !== 345407) fail(`unexpected corpus word total: ${totalWords}`);
if (wordCountMismatches) fail(`wordCount mismatches: ${wordCountMismatches}`);
if (metadataErrors) fail(`story metadata errors: ${metadataErrors}`);
if (cells.size !== 100) fail(`expected 100 level/topic cells, found ${cells.size}`);
if (Math.min(...cells.values()) < 18) fail("a level/topic cell has fewer than 18 stories");
if (newCells.size !== 90 || [...newCells.values()].some((count) => count !== 1)) fail("new stories must occupy 90 distinct level/topic cells");
const newLevelCounts = new Map();
const newTopicCounts = new Map();
stories.slice(1910).forEach((story) => {
  newLevelCounts.set(story.level, (newLevelCounts.get(story.level) || 0) + 1);
  newTopicCounts.set(story.topic, (newTopicCounts.get(story.topic) || 0) + 1);
});
if ([...newLevelCounts.values()].some((count) => count !== 9) || newLevelCounts.size !== 10) fail("new stories are not balanced at nine per level");
if ([...newTopicCounts.values()].some((count) => count !== 9) || newTopicCounts.size !== 10) fail("new stories are not balanced at nine per topic");
const omittedTopicByLevel = new Map([
  [1, "Mystery and adventure"], [2, "Travel and culture"], [3, "People and biography"],
  [4, "Fantasy/stories"], [5, "History"], [6, "Nature and animals"], [7, "Everyday life"],
  [8, "World affairs"], [9, "Science"], [10, "Famous books"],
]);
omittedTopicByLevel.forEach((topic, level) => {
  if (newCells.has(`${level}|${topic}`)) fail(`unexpected new story in intentionally omitted cell: ${level}|${topic}`);
});
if (vocabularyAudit.trim().split(/\r?\n/).length !== 2001) fail("vocabulary audit row count mismatch");
if (vocabularyReview.trim().split(/\r?\n/).length !== 2001) fail("vocabulary review row count mismatch");
if (factCheck.trim().split(/\r?\n/).length !== 2001) fail("fact-check row count mismatch");
if (languageQuality.trim().split(/\r?\n/).length !== 91) fail("language-quality audit row count mismatch");
if ((languageQuality.match(/,"pass","pass","pass","reviewed",/g) || []).length !== 90) fail("language-quality pass count mismatch");
for (let id = 1; id <= 2000; id += 1) {
  const storyId = `s${String(id).padStart(3, "0")}`;
  const prefix = `${storyId},`;
  if (!vocabularyAudit.includes(`\n${prefix}`) || !vocabularyReview.includes(`\n${prefix}`)) fail(`missing vocabulary review row: s${id}`);
  if (!factCheck.includes(`"${storyId}"`)) fail(`missing fact-check row: ${storyId}`);
}
if ((factCheck.match(/verified-against-authoritative-source/g) || []).length !== 583) fail("authoritative-source fact-check count mismatch");
if ((factCheck.match(/verified-against-primary-text/g) || []).length !== 192) fail("primary-text fact-check count mismatch");
if ((factCheck.match(/verified-no-external-claims/g) || []).length !== 1225) fail("no-external-claims fact-check count mismatch");

console.log(JSON.stringify({
  appVersion: "2.5.2",
  serviceWorker: "reading-lamp-v63",
  rewards: rewards.length,
  rewardCategories: new Set(rewards.map((reward) => reward.category)).size,
  lampStyles: allowedLampStyles.size + 1,
  stories: stories.length,
  words: totalWords,
  levelTopicCells: cells.size,
  minimumStoriesPerCell: Math.min(...cells.values()),
}, null, 2));
