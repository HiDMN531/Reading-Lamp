#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const app = read("app.js");
const html = read("index.html");
const sw = read("sw.js");
const stories = JSON.parse(read("stories.json"));
const rewards = JSON.parse(read("rewards.json"));
const config = JSON.parse(read("config.json"));
const pkg = JSON.parse(read("package.json"));

new vm.Script(app, { filename: "app.js" });
new vm.Script(sw, { filename: "sw.js" });
assert(pkg.version === "2.11.9", "package version mismatch");
assert(app.includes(`const APP_VERSION = "${pkg.version}"`), "app version mismatch");
assert(html.includes(`Reading Lamp v${pkg.version}`), "displayed version mismatch");
assert(sw.includes('const CACHE_NAME = "reading-lamp-v92"'), "service worker cache version mismatch");
assert(read("RELEASE_CHECKLIST.md").includes(`対象版: ${pkg.version}`), "release checklist version mismatch");
assert(config.analyticsEndpoint === "" && config.storyReportEndpoint === "", "unexpected collection endpoint");

const htmlIds = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert(new Set(htmlIds).size === htmlIds.length, "duplicate HTML id");
for (const [, id] of app.matchAll(/getElementById\("([^"]+)"\)/g)) {
  assert(htmlIds.includes(id), `missing HTML id: ${id}`);
}
assert((html.match(/name="onboardingLevelSample"/g) || []).length === 3, "onboarding needs three options");
for (const level of [1, 3, 5]) {
  assert(html.includes(`name="onboardingLevelSample" value="${level}"`), `missing level ${level} option`);
}
assert(html.includes('id="onboardingLevelInput" min="1" max="10" step="1" value="1"'), "new reader must start at level 1");
assert(html.includes('id="summaryWpmCell"'), "beginner summary must be able to hide speed");
assert(app.includes('getNum(LS.level, 1)') && app.includes('getNum(LS.dailyGoal, 100)'), "beginner defaults missing");
assert(app.includes("beginnerCandidatePool(available, level)"), "beginner candidate selection missing");
assert(app.includes('startSession({ preferShort: abandonReason === "too-hard" && levelBefore === 1 })'), "level 1 difficulty support missing");
assert(html.includes('id="autumnEvent"') && html.includes('id="startAutumnEventBtn"'), "autumn event UI missing");
assert(app.includes('start: "2026-09-23"') && app.includes('end: "2026-10-08"'), "autumn event dates missing");
assert(app.includes('`s${2051 + index}`') && app.includes('function startAutumnEventSession()'), "autumn event story routing missing");
assert(app.includes('"autumn-ember": { label: "Autumn Ember"'), "autumn lamp style missing");
const homeMarkup = html.slice(html.indexOf('id="view-home"'), html.indexOf('<!-- ============ READING'));
const settingsMarkup = html.slice(html.indexOf('id="settingsModal"'), html.indexOf('<!-- ============ READING GUIDE'));
assert(!homeMarkup.includes('id="modeNote"') && !homeMarkup.includes('id="offlineStatus"'), "offline details remain on home");
assert(settingsMarkup.includes('id="modeNote"') && settingsMarkup.includes('id="offlineStatus"'), "offline details are missing from settings");

const topics = new Set([
  "Fantasy/stories", "Famous books", "Nature and animals", "World affairs", "Everyday life",
  "History", "Science", "Mystery and adventure", "Travel and culture", "People and biography",
]);
const metadata = ["subtopic", "contentType", "editorialStatus", "factChecked", "reviewedAt", "sourceWork", "vocabularyVersion"];
assert(stories.length === 2570, `expected 2570 stories, found ${stories.length}`);
let totalWords = 0;
const cells = new Map();
const titles = new Set();
const texts = new Set();
for (const [index, story] of stories.entries()) {
  const id = `s${String(index + 1).padStart(3, "0")}`;
  assert(story.id === id, `story ID sequence broken at ${id}`);
  assert(Number.isInteger(story.level) && story.level >= 1 && story.level <= 10, `invalid level: ${id}`);
  assert(topics.has(story.topic), `invalid topic: ${id}`);
  assert(typeof story.title === "string" && story.title.trim(), `missing title: ${id}`);
  assert(typeof story.text === "string" && story.text.trim(), `missing text: ${id}`);
  assert(!titles.has(story.title) && !texts.has(story.text), `duplicate story: ${id}`);
  titles.add(story.title);
  texts.add(story.text);
  const words = story.text.trim().split(/\s+/).length;
  assert(story.wordCount === words, `word count mismatch: ${id}`);
  assert(metadata.every((field) => Object.hasOwn(story, field)), `missing metadata: ${id}`);
  assert(story.editorialStatus === "published" && story.factChecked === true, `unreviewed story: ${id}`);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(story.reviewedAt), `invalid review date: ${id}`);
  assert(["v2", "v3"].includes(story.vocabularyVersion), `unexpected vocabulary version: ${id}`);
  totalWords += words;
  const cell = `${story.level}|${story.topic}`;
  cells.set(cell, (cells.get(cell) || 0) + 1);
}
assert(totalWords === JSON.parse(read('learning_audit_summary.json')).words, `audit word count mismatch: ${totalWords}`);
assert(cells.size === 100 && Math.min(...cells.values()) >= 18, "level/topic coverage regressed");
const starters = stories.filter((story) => Object.hasOwn(story, "starterOrder"));
assert(starters.length === 50, "expected fifty beginner stories");
assert(starters.every((story, index) => story.starterOrder === index + 1), "beginner story order is broken");
for (const story of starters) {
  assert(story.level === 1 && story.wordCount >= 30 && story.wordCount <= 60, `beginner story length or level: ${story.id}`);
  assert(story.reviewedAt >= "2026-09-22", `beginner story review date: ${story.id}`);
}
const added = starters.slice(10);
const addedTopicCounts = new Map();
for (const story of added) addedTopicCounts.set(story.topic, (addedTopicCounts.get(story.topic) || 0) + 1);
assert(addedTopicCounts.size === 5 && [...addedTopicCounts.values()].every((count) => count === 8), "new beginner stories are not balanced across five topics");
assert(added.every((story) => story.wordCount >= 43 && story.wordCount <= 50), "new beginner story length is outside the edited range");
const autumnStories = stories.slice(2050,2070);
assert(autumnStories.length === 20, "expected twenty autumn stories");
assert(autumnStories.every((story) => story.seasonalEvent === "autumn-reading-nights-2026"), "autumn story event metadata mismatch");
const autumnLevelCounts = new Map();
for (const story of autumnStories) autumnLevelCounts.set(story.level, (autumnLevelCounts.get(story.level) || 0) + 1);
assert(autumnLevelCounts.size === 10 && [...autumnLevelCounts.values()].every((count) => count === 2), "autumn stories are not balanced across levels");
assert(rewards.length === 103 && new Set(rewards.map((reward) => reward.id)).size === 103, "reward definitions changed");
for (const [id, threshold] of [["autumn-reads-1", 1], ["autumn-reads-5", 5], ["autumn-reads-10", 10]]) {
  const reward = rewards.find((item) => item.id === id);
  assert(reward?.metric === "autumnReads" && reward.threshold === threshold, `invalid autumn reward: ${id}`);
}
assert(rewards.find((reward) => reward.id === "autumn-reads-10")?.unlock?.value === "autumn-ember", "autumn lamp reward missing");
console.log(`Reading Lamp ${pkg.version}: ${stories.length} stories, ${totalWords} words, 50 beginner stories, 20 autumn stories, 103 rewards — validated`);
