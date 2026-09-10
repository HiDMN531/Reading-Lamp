// =====================================================================
// Reading Lamp — an Extensive Reading (多読) app
//
// Design follows the ER principles in the reference material:
//  - Text must be EASY: ~98% known words, 1-2 unknown per 100 words
//  - Volume is the core metric (1,000,000 words as the long-run target)
//  - Reading fluency (WPM) is tracked, dictionary use discouraged
//  - Reading is its own reward: no post-reading tests, vocab lists, or quizzes
//  - The reader may abandon any text without penalty
//  - The reader chooses the topic
// =====================================================================

// ---------------------- Global error visibility ----------------------
// On a phone there is no console to check, so surface any JS error
// on-screen instead of failing silently. This must be the very first
// thing that runs, before anything else can throw.

window.addEventListener("error", (e) => {
  alert("エラーが発生しました:\n" + e.message + "\n(" + (e.filename || "").split("/").pop() + ":" + e.lineno + ")");
});
window.addEventListener("unhandledrejection", (e) => {
  alert("エラーが発生しました:\n" + (e.reason && e.reason.message ? e.reason.message : e.reason));
});

// iOS Safari (especially in home-screen standalone mode) does not resize
// `position: fixed` elements when the on-screen keyboard opens, so a
// bottom-sheet modal can end up partly hidden behind the keyboard. Track
// the real visible height via visualViewport and let the modal use that
// instead of 100vh.
function updateViewportHeight() {
  const h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
  document.documentElement.style.setProperty("--vvh", h + "px");
}
updateViewportHeight();
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", updateViewportHeight);
  window.visualViewport.addEventListener("scroll", updateViewportHeight);
}
window.addEventListener("resize", updateViewportHeight);

// ---------------------- Storage ----------------------

const LS = {
  apiKey: "rl_api_key",
  wordCount: "rl_word_count",
  level: "rl_level",
  dailyGoal: "rl_daily_goal",
  history: "rl_history",
  offlineBank: "rl_offline_bank",
  seenStoryIds: "rl_seen_story_ids",
};

const get = (k, d) => {
  try {
    const v = localStorage.getItem(k);
    return v === null ? d : v;
  } catch {
    return memoryFallback[k] !== undefined ? memoryFallback[k] : d;
  }
};
const getNum = (k, d) => parseInt(get(k, String(d)), 10);
const getBool = (k, d) => get(k, d ? "1" : "0") === "1";

// In-memory fallback used only if localStorage itself is unavailable
// (e.g. "Block All Cookies" enabled in Safari, or private-mode quota issues).
// Keeps the app usable for the current session even then.
const memoryFallback = {};
let storageBlocked = false;

function set(k, v) {
  try {
    localStorage.setItem(k, String(v));
    return true;
  } catch (err) {
    console.error("localStorage write failed", err);
    memoryFallback[k] = String(v);
    storageBlocked = true;
    return false;
  }
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(LS.history) || memoryFallback[LS.history] || "[]"); }
  catch { return []; }
}
function pushHistory(entry) {
  const h = getHistory();
  h.unshift(entry);
  const payload = JSON.stringify(h.slice(0, 500));
  try {
    localStorage.setItem(LS.history, payload);
  } catch (err) {
    console.error("localStorage write failed", err);
    memoryFallback[LS.history] = payload;
    storageBlocked = true;
  }
}

// ---------------------- Level system ----------------------
// Modelled on graded-reader headword bands, which is how ER material is
// conventionally levelled. Level is what keeps text in the "easy" zone.

const LEVELS = [
  { n: 1,  headwords: 300,   label: "ごく易しい",     desc: "300語程度の基本語彙。短く単純な文" },
  { n: 2,  headwords: 600,   label: "易しい",         desc: "600語程度。日常的な話題" },
  { n: 3,  headwords: 800,   label: "易しい",         desc: "800語程度。単純な物語が読める" },
  { n: 4,  headwords: 1000,  label: "初中級",         desc: "1,000語程度。過去・未来の時制が自在に" },
  { n: 5,  headwords: 1400,  label: "中級",           desc: "1,400語程度。描写や説明が増える" },
  { n: 6,  headwords: 1800,  label: "中級",           desc: "1,800語程度。抽象的な話題も少し" },
  { n: 7,  headwords: 2500,  label: "中上級",         desc: "2,500語程度。複文や比喩が自然に" },
  { n: 8,  headwords: 3000,  label: "上級",           desc: "3,000語程度。論説的な文章も" },
  { n: 9,  headwords: 4000,  label: "上級",           desc: "4,000語程度。原書に近い語彙" },
  { n: 10, headwords: null,  label: "無制限",         desc: "簡略化なし。一般書・報道と同水準" },
];

function levelInfo(n) { return LEVELS.find((l) => l.n === n) || LEVELS[4]; }
function getLevel() { return Math.min(10, Math.max(1, getNum(LS.level, 5))); }
function setLevel(n) { set(LS.level, Math.min(10, Math.max(1, n))); }

// ---------------------- Milestones ----------------------
// The reference material names 200,000 words as the point where gains
// become clearly visible, and 1,000,000 as the long-run target.

const MILESTONES = [10000, 25000, 50000, 100000, 200000, 350000, 500000, 750000, 1000000];

function nextMilestone(total) {
  for (const m of MILESTONES) if (total < m) return m;
  // Beyond the last named milestone, keep counting in millions.
  return Math.floor(total / 1000000) * 1000000 + 1000000;
}
function prevMilestone(total) {
  if (total >= 1000000) return Math.floor(total / 1000000) * 1000000;
  let p = 0;
  for (const m of MILESTONES) { if (total >= m) p = m; else break; }
  return p;
}

// ---------------------- DOM ----------------------

const views = {
  home: document.getElementById("view-home"),
  loading: document.getElementById("view-loading"),
  reading: document.getElementById("view-reading"),
  calibrate: document.getElementById("view-calibrate"),
  summary: document.getElementById("view-summary"),
};

function showView(name) {
  Object.entries(views).forEach(([k, el]) => { el.hidden = k !== name; });
  window.scrollTo(0, 0);
}

const errorToast = document.getElementById("errorToast");
function showError(msg) {
  errorToast.textContent = msg;
  errorToast.hidden = false;
  clearTimeout(showError._t);
  showError._t = setTimeout(() => { errorToast.hidden = true; }, 7000);
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const fmt = (n) => Number(n).toLocaleString();

// ---------------------- Settings modal ----------------------

const settingsModal = document.getElementById("settingsModal");
const apiKeyInput = document.getElementById("apiKeyInput");
const levelInput = document.getElementById("levelInput");
const levelDescription = document.getElementById("levelDescription");
const wordCountInput = document.getElementById("wordCountInput");
const wordCountValue = document.getElementById("wordCountValue");
const dailyGoalInput = document.getElementById("dailyGoalInput");
const dailyGoalValue = document.getElementById("dailyGoalValue");
const toggleOfflineBank = document.getElementById("toggleOfflineBank");
const apiKeySection = document.getElementById("apiKeySection");

function renderLevelDescription(n) {
  const info = levelInfo(parseInt(n, 10));
  const hw = info.headwords ? `${fmt(info.headwords)}語レベル` : "簡略化なし";
  levelDescription.textContent = `レベル ${info.n} — ${info.label} (${hw})`;
}

function openSettings() {
  apiKeyInput.value = get(LS.apiKey, "");
  levelInput.value = getLevel();
  renderLevelDescription(getLevel());
  wordCountInput.value = getNum(LS.wordCount, 800);
  wordCountValue.textContent = getNum(LS.wordCount, 800);
  dailyGoalInput.value = getNum(LS.dailyGoal, 1500);
  dailyGoalValue.textContent = getNum(LS.dailyGoal, 1500);
  toggleOfflineBank.checked = getBool(LS.offlineBank, false);
  apiKeySection.style.display = toggleOfflineBank.checked ? "none" : "block";
  settingsModal.hidden = false;
}

document.getElementById("settingsBtn").addEventListener("click", openSettings);
document.getElementById("closeSettingsBtn").addEventListener("click", () => { settingsModal.hidden = true; });
settingsModal.addEventListener("click", (e) => { if (e.target === settingsModal) settingsModal.hidden = true; });

levelInput.addEventListener("input", () => renderLevelDescription(levelInput.value));
wordCountInput.addEventListener("input", () => { wordCountValue.textContent = wordCountInput.value; });
dailyGoalInput.addEventListener("input", () => { dailyGoalValue.textContent = dailyGoalInput.value; });
toggleOfflineBank.addEventListener("change", () => {
  apiKeySection.style.display = toggleOfflineBank.checked ? "none" : "block";
});

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  apiKeyInput.blur(); // dismiss the mobile keyboard so nothing hides feedback

  const ok1 = set(LS.apiKey, apiKeyInput.value.trim());
  const ok2 = set(LS.level, String(parseInt(levelInput.value, 10)));
  const ok3 = set(LS.wordCount, String(parseInt(wordCountInput.value, 10)));
  const ok4 = set(LS.dailyGoal, String(parseInt(dailyGoalInput.value, 10)));
  const ok8 = set(LS.offlineBank, toggleOfflineBank.checked ? "1" : "0");

  if (ok1 && ok2 && ok3 && ok4 && ok8) {
    settingsModal.hidden = true;
    renderHome();
  } else {
    // Storage is blocked (private mode / cookies disabled / quota).
    // Settings still work for THIS session via the in-memory fallback,
    // so close the modal and let the user continue, but warn clearly.
    settingsModal.hidden = true;
    renderHome();
    showError("この端末では設定を保存できませんでした（プライベートブラウズや「すべてのCookieをブロック」がオンだと保存できません）。今回のセッション中は使えますが、アプリを閉じると消えます。");
  }
});

apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("saveSettingsBtn").click();
});

// When the keyboard opens, nudge the modal so the Save button stays reachable.
apiKeyInput.addEventListener("focus", () => {
  setTimeout(() => {
    document.getElementById("saveSettingsBtn").scrollIntoView({ block: "nearest" });
  }, 300);
});

document.getElementById("resetHistoryBtn").addEventListener("click", () => {
  if (confirm("これまでの記録をすべて消去します。よろしいですか？")) {
    try { localStorage.removeItem(LS.history); } catch {}
    delete memoryFallback[LS.history];
    renderHome();
    settingsModal.hidden = true;
  }
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(getHistory(), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `reading-lamp-history-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

// ---------------------- Home ----------------------

const topicSelect = document.getElementById("topicSelect");
const customTopicInput = document.getElementById("customTopicInput");
topicSelect.addEventListener("change", () => {
  customTopicInput.style.display = topicSelect.value === "custom" ? "block" : "none";
});

const TOPIC_POOL = [
  "Fantasy/stories", "Famous books", "Nature and animals",
  "World affairs", "Everyday life", "History", "Science",
];

function totalWordsRead() {
  return getHistory().reduce((s, h) => s + (h.words || 0), 0);
}

function recentWpm() {
  const withWpm = getHistory().filter((h) => h.wpm > 0).slice(0, 5);
  if (withWpm.length === 0) return null;
  return Math.round(withWpm.reduce((s, h) => s + h.wpm, 0) / withWpm.length);
}

function computeStreak() {
  const days = new Set(getHistory().map((h) => new Date(h.date).toDateString()));
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  // Today not yet read still keeps yesterday's streak alive.
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function wordsToday() {
  const today = new Date().toDateString();
  return getHistory()
    .filter((h) => new Date(h.date).toDateString() === today)
    .reduce((s, h) => s + (h.words || 0), 0);
}

function renderHome() {
  const total = totalWordsRead();
  document.getElementById("totalWords").textContent = fmt(total);

  const next = nextMilestone(total);
  const prev = prevMilestone(total);
  const pct = Math.max(2, Math.min(100, ((total - prev) / (next - prev)) * 100));
  document.getElementById("milestoneFill").style.width = pct + "%";

  const goal = getNum(LS.dailyGoal, 1500);
  const today = wordsToday();
  const caption = document.getElementById("milestoneCaption");
  if (today >= goal) {
    caption.textContent = `今日の目標 ${fmt(goal)} 語を達成 ・ 次の節目 ${fmt(next)} 語まであと ${fmt(next - total)} 語`;
  } else {
    caption.textContent = `今日 ${fmt(today)} / ${fmt(goal)} 語 ・ 次の節目 ${fmt(next)} 語まであと ${fmt(next - total)} 語`;
  }

  document.getElementById("statStreak").textContent = computeStreak();
  const wpm = recentWpm();
  document.getElementById("statWpm").textContent = wpm === null ? "—" : wpm;
  document.getElementById("statLevel").textContent = getLevel();

  const info = levelInfo(getLevel());
  document.getElementById("levelNote").textContent =
    `レベル ${info.n}：${info.desc}`;

  const list = document.getElementById("historyList");
  list.innerHTML = "";
  const history = getHistory();
  if (history.length === 0) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = "まだ記録がありません。まずは一篇、辞書を閉じて読んでみましょう。";
    list.appendChild(li);
  } else {
    history.slice(0, 8).forEach((h) => {
      const li = document.createElement("li");
      const d = new Date(h.date);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const meta = h.abandoned
        ? "途中でやめた"
        : `${fmt(h.words)}語 ・ ${h.wpm || "—"} wpm`;
      li.innerHTML = `<span class="h-topic">${esc(h.title || h.topic || "")}</span><span class="h-meta">${dateStr} ・ ${meta}</span>`;
      list.appendChild(li);
    });
  }
}

// ---------------------- Generation ----------------------

const LOADING_MESSAGES = [
  "文章を書いています…",
  "語彙をレベルに合わせています…",
  "読みやすさを整えています…",
];
let loadingTimer = null;

function animateLoading() {
  const el = document.getElementById("loadingText");
  let i = 0;
  el.textContent = LOADING_MESSAGES[0];
  clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    i = (i + 1) % LOADING_MESSAGES.length;
    el.textContent = LOADING_MESSAGES[i];
  }, 2400);
}
function stopLoading() { clearInterval(loadingTimer); }

let session = null;
let readingStartedAt = 0;

document.getElementById("startBtn").addEventListener("click", startSession);
document.getElementById("anotherBtn").addEventListener("click", startSession);
document.getElementById("homeBtn").addEventListener("click", () => { renderHome(); showView("home"); });

async function startSession() {
  const useBank = getBool(LS.offlineBank, false);

  if (useBank) {
    return startOfflineSession();
  }

  const apiKey = get(LS.apiKey, "");
  if (!apiKey) {
    openSettings();
    showError("先に Anthropic API キーを設定してください。もしくは「オフラインの文章バンクを使う」を設定でオンにしてください。");
    return;
  }

  let topic = topicSelect.value;
  if (topic === "random") {
    topic = Math.random() < 1 / 7
      ? "any topic of your own choosing — something fresh and a little unexpected"
      : TOPIC_POOL[Math.floor(Math.random() * TOPIC_POOL.length)];
  } else if (topic === "custom") {
    const c = customTopicInput.value.trim();
    if (!c) { showError("テーマを入力してください。"); return; }
    topic = c;
  }

  showView("loading");
  animateLoading();

  try {
    session = await generate({ topic, apiKey });
    stopLoading();
    renderReading(session);
    showView("reading");
    readingStartedAt = Date.now();
  } catch (err) {
    stopLoading();
    console.error(err);
    showView("home");
    showError(readableError(err));
  }
}

// ---------------------- Offline story bank ----------------------

let STORY_BANK = null; // loaded lazily, cached for the rest of the session
let storyBankLoadError = null;

async function loadStoryBank() {
  if (STORY_BANK) return STORY_BANK;
  try {
    const res = await fetch("stories.json");
    if (!res.ok) throw new Error("stories.json " + res.status);
    STORY_BANK = await res.json();
    return STORY_BANK;
  } catch (err) {
    storyBankLoadError = err;
    throw err;
  }
}

function getSeenIds() {
  try { return new Set(JSON.parse(get(LS.seenStoryIds, "[]"))); }
  catch { return new Set(); }
}
function markSeen(id) {
  const seen = getSeenIds();
  seen.add(id);
  set(LS.seenStoryIds, JSON.stringify([...seen]));
}
function clearSeenForPool(ids) {
  const seen = getSeenIds();
  ids.forEach((id) => seen.delete(id));
  set(LS.seenStoryIds, JSON.stringify([...seen]));
}

// Tracks the most recently offered story so that, right when a pool resets
// (see below), we don't immediately hand back the very same text again.
let lastBankStoryId = null;

function pickStory(bank, topic, level) {
  const seen = getSeenIds();

  const matchesTopic = (s) => topic === "random" || topic === "custom" || s.topic === topic;

  // Prefer the exact level, then fan out to nearby levels.
  const byDistance = [...bank].sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
  const candidates = byDistance.filter(matchesTopic);
  const pool = candidates.length ? candidates : byDistance; // fall back to any topic

  let unseen = pool.filter((s) => !seen.has(s.id));

  if (unseen.length === 0) {
    // The reader has now read every story available in this pool (this
    // topic's stock, or the whole bank in "random"/"custom" mode). Start a
    // fresh cycle rather than picking freely among already-read stories:
    // clear the "seen" record for just this pool, excluding whichever
    // story was offered last so it isn't immediately handed back again.
    clearSeenForPool(pool.map((s) => s.id));
    unseen = pool.filter((s) => s.id !== lastBankStoryId);
    if (unseen.length === 0) unseen = pool; // pool has only a single story
  }

  // Among the closest-level matches available among the unseen stories, pick randomly.
  const minDist = Math.abs(unseen[0].level - level);
  const closest = unseen.filter((s) => Math.abs(s.level - level) === minDist);
  return closest[Math.floor(Math.random() * closest.length)];
}

async function startOfflineSession() {
  showView("loading");
  document.getElementById("loadingText").textContent = "文章を選んでいます…";

  let bank;
  try {
    bank = await loadStoryBank();
  } catch (err) {
    showView("home");
    showError("文章バンクの読み込みに失敗しました。オフラインで初回起動している可能性があります。一度オンラインの状態でアプリを開き直してください。");
    return;
  }

  if (!bank || bank.length === 0) {
    showView("home");
    showError("文章バンクが空です。");
    return;
  }

  const topic = topicSelect.value === "custom" ? "random" : topicSelect.value;
  const story = pickStory(bank, topic, getLevel());

  session = { topic: story.topic, title: story.title, text: story.text, _bankId: story.id };
  markSeen(story.id);
  lastBankStoryId = story.id;

  renderReading(session);
  showView("reading");
  readingStartedAt = Date.now();
}

function readableError(err) {
  const m = String((err && err.message) || err);
  if (m.includes("401") || /authentication/i.test(m)) return "APIキーが正しくないようです。設定を確認してください。";
  if (m.includes("429")) return "リクエストが混み合っています。少し待ってから再試行してください。";
  if (m.includes("400")) return "リクエストが受け付けられませんでした。設定の語数を減らして試してみてください。";
  if (/Failed to fetch|NetworkError/i.test(m)) return "通信に失敗しました。ネットワーク接続を確認してください。";
  return "生成中にエラーが発生しました: " + m;
}

function buildSystemPrompt() {
  const level = getLevel();
  const info = levelInfo(level);
  const words = getNum(LS.wordCount, 800);

  const vocabRule = info.headwords
    ? `Restrict yourself to roughly the most frequent ${fmt(info.headwords)} words of English (a graded-reader band). Beyond that band, allow at most 1-2 unfamiliar words per 100 words of text, and only where surrounding context makes the meaning guessable without a dictionary.`
    : `Use unsimplified, natural English at the level of a general-audience book or quality newspaper. Do not artificially restrict vocabulary.`;

  return `You write original English material for a Japanese adult's extensive reading (多読) practice.

The single most important rule: THE TEXT MUST BE COMFORTABLE TO READ WITHOUT A DICTIONARY. Extensive reading only works when the reader recognises around 98% of the words and can move forward without stopping. A text that is slightly too easy is correct; a text that is slightly too hard is a failure.

Level: ${level} of 10 (${info.label}).
${vocabRule}

Other requirements:
- Length: approximately ${words} words (within 15%).
- Short paragraphs. Natural narrative or expository flow, not a list of facts.
- Write something genuinely worth reading: a story with a shape, or an explanation with a thread. Enjoyment is the point.
- Fully original. Never copy or closely paraphrase existing published text, news articles, or books.
- Neutral, balanced tone for world affairs. Avoid graphic, offensive, or distressing content.
- English only in the reading text. No Japanese, no romanization, no glosses inside the text.

Respond with ONLY a single JSON object, no markdown fences and no commentary:
{
  "topic": "the topic category used",
  "title": "a short title",
  "text": "the full passage, paragraphs separated by \\n\\n"
}`;
}

async function generate({ topic, apiKey }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 4000,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: `Topic: ${topic}` }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const block = (data.content || []).find((b) => b.type === "text");
  if (!block) throw new Error("応答に本文が含まれていませんでした。");

  const parsed = parseJsonLoose(block.text);
  if (!parsed || typeof parsed.text !== "string" || parsed.text.length < 50) {
    throw new Error("生成結果の形式が想定と異なります。もう一度お試しください。");
  }
  return parsed;
}

function parseJsonLoose(raw) {
  let s = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

// ---------------------- Reading ----------------------

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function renderReading(s) {
  document.getElementById("readingTopic").textContent = s.topic || "";
  document.getElementById("readingTitle").textContent = s.title || "";

  const wc = countWords(s.text);
  s._words = wc;

  const wpm = recentWpm() || 130;
  document.getElementById("readingMeta").textContent =
    `${fmt(wc)} words ・ 目安 ${Math.max(1, Math.round(wc / wpm))} 分`;

  const container = document.getElementById("readingText");
  container.innerHTML = "";
  s.text.split(/\n\n+/).forEach((para) => {
    if (!para.trim()) return;
    const p = document.createElement("p");
    p.textContent = para.trim();
    container.appendChild(p);
  });
}

document.getElementById("finishReadingBtn").addEventListener("click", () => {
  session._elapsedSec = Math.max(1, (Date.now() - readingStartedAt) / 1000);
  showView("calibrate");
});

document.getElementById("abandonBtn").addEventListener("click", () => {
  // Principle: the reader may abandon a text freely. Log it, credit nothing,
  // and treat it as a signal that the level may be too high.
  pushHistory({
    date: new Date().toISOString(),
    topic: session.topic,
    title: session.title,
    words: 0,
    wpm: 0,
    level: getLevel(),
    abandoned: true,
  });
  startSession();
});

// ---------------------- Calibration ----------------------

document.querySelectorAll(".calibrate-btn").forEach((btn) => {
  btn.addEventListener("click", () => finishSession(btn.dataset.fb));
});

function finishSession(feedback) {
  const words = session._words;
  const minutes = session._elapsedSec / 60;
  // Guard against an unrealistically fast "read" (tab left open, skimming).
  const rawWpm = Math.round(words / minutes);
  const wpm = rawWpm > 600 ? 0 : rawWpm;

  // Level adjustment. Nudge down promptly when hard, up cautiously when easy —
  // ER favours erring on the easy side.
  const before = getLevel();
  if (feedback === "hard") setLevel(before - 1);
  else if (feedback === "easy") setLevel(before + 1);

  pushHistory({
    date: new Date().toISOString(),
    topic: session.topic,
    title: session.title,
    words,
    wpm,
    level: before,
    feedback,
    abandoned: false,
  });

  renderSummary(words, wpm, before, getLevel(), feedback);
  showView("summary");
}

// ---------------------- Summary ----------------------

function renderSummary(words, wpm, levelBefore, levelAfter, feedback) {
  const total = totalWordsRead();

  document.getElementById("summaryHeadline").textContent = `${fmt(words)} 語を読みました`;
  document.getElementById("summaryWords").textContent = fmt(words);
  document.getElementById("summaryWpm").textContent = wpm || "—";
  document.getElementById("summaryTotal").textContent = fmt(total);

  const notes = [];
  if (levelAfter !== levelBefore) {
    notes.push(levelAfter < levelBefore
      ? `次からレベル ${levelAfter} に下げます。易しいほうが多読は伸びます。`
      : `次からレベル ${levelAfter} に上げます。`);
  }
  const goal = getNum(LS.dailyGoal, 1500);
  const today = wordsToday();
  if (today >= goal) notes.push(`今日の目標 ${fmt(goal)} 語を達成しました。`);

  const crossed = MILESTONES.find((m) => total >= m && total - words < m);
  if (crossed) notes.push(`累計 ${fmt(crossed)} 語に到達しました。`);

  if (wpm === 0) notes.push("読書時間が短すぎたため、読む速さは記録しませんでした。");

  document.getElementById("summaryNote").textContent = notes.join(" ");
}

// ---------------------- Init ----------------------

renderHome();
showView("home");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
