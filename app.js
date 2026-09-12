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
  wordCount: "rl_word_count",
  level: "rl_level",
  dailyGoal: "rl_daily_goal",
  history: "rl_history",
  offlineBank: "rl_offline_bank",
  seenStoryIds: "rl_seen_story_ids",
  levelSignals: "rl_level_signals",
};
const HISTORY_LIMIT = 2000;

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

// API keys used to be stored in localStorage. Remove any legacy copy and keep
// the current key in memory only. This prevents it from surviving reloads,
// browser restarts, backups, or access by scripts running in a later session.
const LEGACY_API_KEY_STORAGE_KEYS = ["rl_api_key", "rl_api_key_session"];
let sessionApiKey = "";

for (const key of LEGACY_API_KEY_STORAGE_KEYS) {
  try { localStorage.removeItem(key); } catch {}
  try { sessionStorage.removeItem(key); } catch {}
  delete memoryFallback[key];
}

function getSessionApiKey() { return sessionApiKey; }
function setSessionApiKey(value) { sessionApiKey = String(value || "").trim(); }
function clearSessionApiKey() { sessionApiKey = ""; }

// A page restored from the back-forward cache must not retain the key.
window.addEventListener("pagehide", clearSessionApiKey);

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
  try {
    if (storageBlocked && memoryFallback[LS.history]) {
      return JSON.parse(memoryFallback[LS.history]);
    }
    const stored = localStorage.getItem(LS.history);
    return JSON.parse(stored === null ? (memoryFallback[LS.history] || "[]") : stored);
  }
  catch { return []; }
}
function writeHistory(entries) {
  const payload = JSON.stringify(entries.slice(0, HISTORY_LIMIT));
  try {
    localStorage.setItem(LS.history, payload);
    return true;
  } catch (err) {
    console.error("localStorage write failed", err);
    memoryFallback[LS.history] = payload;
    storageBlocked = true;
    return false;
  }
}
function pushHistory(entry) {
  const h = getHistory();
  h.unshift(entry);
  return writeHistory(h);
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

const EASY_STREAK_REQUIRED = 3;

function getLevelSignals(level = getLevel()) {
  try {
    const saved = JSON.parse(get(LS.levelSignals, "null"));
    if (saved && saved.level === level && Number.isInteger(saved.easyStreak)) {
      return { level, easyStreak: Math.max(0, saved.easyStreak) };
    }
  } catch {}
  return { level, easyStreak: 0 };
}

function saveLevelSignals(level, easyStreak = 0) {
  return set(LS.levelSignals, JSON.stringify({ level, easyStreak }));
}

function adjustLevelFromFeedback(feedback, before) {
  if (feedback === "hard") {
    const after = Math.max(1, before - 1);
    setLevel(after);
    saveLevelSignals(after, 0);
    return {
      before,
      after,
      note: after < before
        ? `次からレベル ${after} に下げます。易しいほうが多読は伸びます。`
        : "現在はレベル1です。難しい文章は無理せず別の文章に替えてください。",
    };
  }

  if (feedback === "easy") {
    if (before >= 10) {
      saveLevelSignals(before, 0);
      return { before, after: before, note: "最高レベルを続けます。" };
    }

    const streak = getLevelSignals(before).easyStreak + 1;
    if (streak >= EASY_STREAK_REQUIRED) {
      const after = before + 1;
      setLevel(after);
      saveLevelSignals(after, 0);
      return { before, after, note: `「やさしすぎた」が3回続いたため、次からレベル ${after} に上げます。` };
    }

    saveLevelSignals(before, streak);
    const remaining = EASY_STREAK_REQUIRED - streak;
    return {
      before,
      after: before,
      note: `レベルはまだ上げません。「やさしすぎた」があと${remaining}回続いたら見直します。`,
    };
  }

  // "just" breaks an easy streak and confirms the current level.
  saveLevelSignals(before, 0);
  return { before, after: before, note: "" };
}

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
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const ABANDON_REASONS = {
  "too-hard": "難しすぎた",
  "not-interesting": "興味を持てなかった",
  "too-long": "長すぎた・時間不足",
  interrupted: "用事などで中断",
  other: "その他・未記録",
};

// ---------------------- Accessible modal handling ----------------------

const appRoot = document.getElementById("app");
let activeModalElement = null;
let activeModalCloseRequest = null;
let modalReturnFocus = null;
let modalPausedReading = false;

function modalFocusableElements(modal) {
  return [...modal.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
  )].filter((el) => !el.hidden && !el.closest("[hidden]") && el.getAttribute("aria-hidden") !== "true");
}

function openAccessibleModal(modal, initialFocus, closeRequest) {
  if (activeModalElement) return;
  modalReturnFocus = document.activeElement;
  activeModalElement = modal;
  activeModalCloseRequest = closeRequest;
  modalPausedReading = Boolean(readingClock.running);
  if (modalPausedReading) pauseReadingTimer();
  modal.hidden = false;
  initialFocus.focus();
  appRoot.inert = true;
  appRoot.setAttribute("aria-hidden", "true");
  document.body.classList.add("modal-open");
}

function closeAccessibleModal({ restoreFocus = true, resumeReading = true } = {}) {
  if (!activeModalElement) return;
  const modal = activeModalElement;
  const returnFocus = modalReturnFocus;
  const shouldResume = modalPausedReading && resumeReading;
  modal.hidden = true;
  appRoot.inert = false;
  appRoot.removeAttribute("aria-hidden");
  document.body.classList.remove("modal-open");
  activeModalElement = null;
  activeModalCloseRequest = null;
  modalReturnFocus = null;
  modalPausedReading = false;
  if (shouldResume) resumeReadingTimer();
  if (restoreFocus && returnFocus && typeof returnFocus.focus === "function") {
    returnFocus.focus();
  }
}

document.addEventListener("keydown", (e) => {
  if (!activeModalElement) return;
  if (e.key === "Escape") {
    e.preventDefault();
    if (activeModalCloseRequest) activeModalCloseRequest();
    return;
  }
  if (e.key !== "Tab") return;
  const focusable = modalFocusableElements(activeModalElement);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});

// ---------------------- Settings modal ----------------------

const settingsModal = document.getElementById("settingsModal");
const settingsButton = document.getElementById("settingsBtn");
const apiKeyInput = document.getElementById("apiKeyInput");
const levelInput = document.getElementById("levelInput");
const levelDescription = document.getElementById("levelDescription");
const wordCountInput = document.getElementById("wordCountInput");
const wordCountValue = document.getElementById("wordCountValue");
const dailyGoalInput = document.getElementById("dailyGoalInput");
const dailyGoalValue = document.getElementById("dailyGoalValue");
const toggleOfflineBank = document.getElementById("toggleOfflineBank");
const apiKeySection = document.getElementById("apiKeySection");
const wordCountSection = document.getElementById("wordCountSection");
const modeDescription = document.getElementById("modeDescription");
const apiKeyStatus = document.getElementById("apiKeyStatus");
const clearApiKeyBtn = document.getElementById("clearApiKeyBtn");
const closeSettingsIconBtn = document.getElementById("closeSettingsIconBtn");
const restoreInput = document.getElementById("restoreInput");
const settingsStatus = document.getElementById("settingsStatus");

function renderApiKeyStatus() {
  const isSet = Boolean(getSessionApiKey());
  apiKeyStatus.textContent = isSet
    ? "このページ内にAPIキーを設定済みです。"
    : "APIキーは未設定です。";
  apiKeyStatus.classList.toggle("is-set", isSet);
  clearApiKeyBtn.hidden = !isSet;
}

function usingOfflineBank() {
  // New users start with the bundled bank. Existing users keep their saved mode.
  return getBool(LS.offlineBank, true);
}

function syncSettingsMode(useBank) {
  apiKeySection.hidden = useBank;
  wordCountSection.hidden = useBank;
  modeDescription.textContent = useBank
    ? "通常はこちらをおすすめします。通信やAPI利用料なしで読めます。"
    : "オフにするとAI生成モードになります。APIキーはこのページを開いている間だけ保持します。";
}

function renderLevelDescription(n) {
  const info = levelInfo(parseInt(n, 10));
  const hw = info.headwords ? `${fmt(info.headwords)}語レベル` : "簡略化なし";
  levelDescription.textContent = `レベル ${info.n} — ${info.label} (${hw})`;
  levelInput.setAttribute("aria-valuetext", `レベル${info.n}、${info.label}、${hw}`);
}

function updateRangeAccessibility() {
  wordCountInput.setAttribute("aria-valuetext", `${wordCountInput.value}語`);
  dailyGoalInput.setAttribute("aria-valuetext", `1日${dailyGoalInput.value}語`);
}

function closeSettings() {
  closeAccessibleModal();
  settingsButton.setAttribute("aria-expanded", "false");
}

function openSettings() {
  apiKeyInput.value = "";
  levelInput.value = getLevel();
  renderLevelDescription(getLevel());
  wordCountInput.value = getNum(LS.wordCount, 800);
  wordCountValue.textContent = getNum(LS.wordCount, 800);
  dailyGoalInput.value = getNum(LS.dailyGoal, 1500);
  dailyGoalValue.textContent = getNum(LS.dailyGoal, 1500);
  toggleOfflineBank.checked = usingOfflineBank();
  syncSettingsMode(toggleOfflineBank.checked);
  renderApiKeyStatus();
  settingsStatus.textContent = "";
  updateRangeAccessibility();
  settingsButton.setAttribute("aria-expanded", "true");
  openAccessibleModal(settingsModal, closeSettingsIconBtn, closeSettings);
}

settingsButton.addEventListener("click", openSettings);
document.getElementById("closeSettingsBtn").addEventListener("click", closeSettings);
closeSettingsIconBtn.addEventListener("click", closeSettings);
settingsModal.addEventListener("click", (e) => { if (e.target === settingsModal) closeSettings(); });

levelInput.addEventListener("input", () => renderLevelDescription(levelInput.value));
wordCountInput.addEventListener("input", () => {
  wordCountValue.textContent = wordCountInput.value;
  updateRangeAccessibility();
});
dailyGoalInput.addEventListener("input", () => {
  dailyGoalValue.textContent = dailyGoalInput.value;
  updateRangeAccessibility();
});
toggleOfflineBank.addEventListener("change", () => {
  syncSettingsMode(toggleOfflineBank.checked);
});

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  apiKeyInput.blur(); // dismiss the mobile keyboard so nothing hides feedback

  const typedApiKey = apiKeyInput.value.trim();
  if (!toggleOfflineBank.checked && typedApiKey) setSessionApiKey(typedApiKey);
  apiKeyInput.value = "";

  if (!toggleOfflineBank.checked && !getSessionApiKey()) {
    renderApiKeyStatus();
    showError("AI生成モードでは、このページで使用するAnthropic APIキーを入力してください。");
    apiKeyInput.focus();
    return;
  }

  if (toggleOfflineBank.checked) clearSessionApiKey();

  const previousLevel = getLevel();
  const selectedLevel = Math.min(10, Math.max(1, parseInt(levelInput.value, 10)));
  const ok2 = set(LS.level, String(selectedLevel));
  const okSignals = selectedLevel === previousLevel ? true : saveLevelSignals(selectedLevel, 0);
  const ok3 = set(LS.wordCount, String(parseInt(wordCountInput.value, 10)));
  const ok4 = set(LS.dailyGoal, String(parseInt(dailyGoalInput.value, 10)));
  const ok8 = set(LS.offlineBank, toggleOfflineBank.checked ? "1" : "0");

  if (ok2 && okSignals && ok3 && ok4 && ok8) {
    closeSettings();
    renderHome();
  } else {
    // Storage is blocked (private mode / cookies disabled / quota).
    // Settings still work for THIS session via the in-memory fallback,
    // so close the modal and let the user continue, but warn clearly.
    closeSettings();
    renderHome();
    showError("この端末では設定を保存できませんでした（プライベートブラウズや「すべてのCookieをブロック」がオンだと保存できません）。今回のセッション中は使えますが、アプリを閉じると消えます。");
  }
});

clearApiKeyBtn.addEventListener("click", () => {
  clearSessionApiKey();
  apiKeyInput.value = "";
  renderApiKeyStatus();
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
    closeSettings();
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

function cleanHistoryText(value, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 240) : fallback;
}

function normalizeHistoryEntry(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const parsedDate = new Date(entry.date);
  if (!Number.isFinite(parsedDate.getTime())) return null;
  const abandoned = entry.abandoned === true;
  const words = Math.round(Number(entry.words));
  const level = Math.round(Number(entry.level));
  if (!Number.isFinite(words) || words < 0 || words > 1000000) return null;
  if (!abandoned && words <= 0) return null;
  if (!Number.isFinite(level) || level < 1 || level > 10) return null;

  const normalized = {
    date: parsedDate.toISOString(),
    topic: cleanHistoryText(entry.topic, "Unknown"),
    title: cleanHistoryText(entry.title),
    words: abandoned ? 0 : words,
    wpm: Number.isFinite(Number(entry.wpm)) ? Math.max(0, Math.min(1000, Math.round(Number(entry.wpm)))) : 0,
    level,
    abandoned,
  };

  const activeSeconds = Math.round(Number(entry.activeSeconds));
  if (Number.isFinite(activeSeconds) && activeSeconds >= 0 && activeSeconds <= 86400) {
    normalized.activeSeconds = activeSeconds;
  }
  if (typeof entry.wpmValid === "boolean") normalized.wpmValid = entry.wpmValid;
  if (["too-short", "too-slow", "too-fast", null].includes(entry.wpmInvalidReason)) {
    normalized.wpmInvalidReason = entry.wpmInvalidReason;
  }
  if (["hard", "just", "easy"].includes(entry.feedback)) normalized.feedback = entry.feedback;
  const levelAfter = Math.round(Number(entry.levelAfter));
  if (Number.isFinite(levelAfter) && levelAfter >= 1 && levelAfter <= 10) normalized.levelAfter = levelAfter;
  if (abandoned && hasOwn(ABANDON_REASONS, entry.abandonReason)) {
    normalized.abandonReason = entry.abandonReason;
  }
  return normalized;
}

function historyFingerprint(entry) {
  return [entry.date, entry.topic, entry.title, entry.words, entry.level, entry.abandoned ? 1 : 0].join("|");
}

restoreInput.addEventListener("change", async () => {
  settingsStatus.textContent = "";
  const file = restoreInput.files && restoreInput.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showError("復元ファイルが大きすぎます。5MB以下のJSONを選んでください。");
    restoreInput.value = "";
    return;
  }

  try {
    const parsed = JSON.parse(await file.text());
    const source = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.history) ? parsed.history : null;
    if (!source || source.length > 5000) throw new Error("invalid history container");
    const imported = source.map(normalizeHistoryEntry).filter(Boolean);
    if (!imported.length) throw new Error("no valid history entries");
    const current = getHistory();
    const known = new Set(current.map(historyFingerprint));
    const additions = [];
    imported.forEach((entry) => {
      const fingerprint = historyFingerprint(entry);
      if (known.has(fingerprint)) return;
      known.add(fingerprint);
      additions.push(entry);
    });
    if (!additions.length) {
      settingsStatus.textContent = "すべて既に復元済みです。重複する記録は追加しませんでした。";
      return;
    }
    const merged = [...current, ...additions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, HISTORY_LIMIT);
    const retained = new Set(merged.map(historyFingerprint));
    const restoredCount = additions.filter((entry) => retained.has(historyFingerprint(entry))).length;
    const omittedCount = additions.length - restoredCount;
    if (!restoredCount) {
      settingsStatus.textContent = `保存上限の${fmt(HISTORY_LIMIT)}件より古い記録だけだったため、追加しませんでした。`;
      return;
    }
    if (!confirm(`${restoredCount}件の記録を、現在の記録に追加します。よろしいですか？`)) return;
    const saved = writeHistory(merged);
    renderHome();
    const omittedNote = omittedCount ? ` 古い${omittedCount}件は保存上限のため除外しました。` : "";
    settingsStatus.textContent = saved
      ? `${restoredCount}件の記録を復元しました。${omittedNote}`
      : `${restoredCount}件を今回のセッションへ復元しましたが、端末には保存できませんでした。${omittedNote}`;
  } catch (err) {
    showError("記録を復元できませんでした。Reading Lampから書き出したJSONか確認してください。");
  } finally {
    restoreInput.value = "";
  }
});

// ---------------------- Home ----------------------

const topicSelect = document.getElementById("topicSelect");
const customTopicInput = document.getElementById("customTopicInput");
const customTopicOption = topicSelect.querySelector('option[value="custom"]');

function syncTopicMode(useBank = usingOfflineBank()) {
  customTopicOption.disabled = useBank;
  customTopicOption.hidden = useBank;
  if (useBank && topicSelect.value === "custom") topicSelect.value = "random";
  customTopicInput.hidden = useBank || topicSelect.value !== "custom";
}

topicSelect.addEventListener("change", () => syncTopicMode());

const TOPIC_POOL = [
  "Fantasy/stories", "Famous books", "Nature and animals",
  "World affairs", "Everyday life", "History", "Science",
];

function totalWordsRead() {
  return getHistory().reduce((s, h) => s + (h.words || 0), 0);
}

function combinedWpm(entries) {
  const withWpm = entries.filter((h) => h.wpm > 0 && h.wpmValid !== false);
  if (withWpm.length === 0) return null;

  // Combine words and time instead of averaging session WPM values. This
  // prevents a very short passage from influencing the result as much as a
  // longer one. Older records without activeSeconds remain compatible by
  // treating their saved WPM as a one-minute sample.
  const totals = withWpm.reduce((acc, h) => {
    const words = Number(h.words);
    const seconds = Number(h.activeSeconds);
    if (words > 0 && seconds > 0) {
      acc.words += words;
      acc.seconds += seconds;
    } else {
      acc.words += Number(h.wpm);
      acc.seconds += 60;
    }
    return acc;
  }, { words: 0, seconds: 0 });

  return totals.seconds > 0
    ? Math.round(totals.words / (totals.seconds / 60))
    : null;
}

function recentWpm() {
  return combinedWpm(
    getHistory().filter((h) => h.wpm > 0 && h.wpmValid !== false).slice(0, 5)
  );
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

function renderAnalysisBars(container, items, valueFormatter) {
  container.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "analysis-bar-label";
    empty.textContent = "記録なし";
    container.appendChild(empty);
    return;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  items.forEach((item) => {
    const row = document.createElement("li");
    row.className = "analysis-bar-row";

    const label = document.createElement("span");
    label.className = "analysis-bar-label";
    label.textContent = item.label;

    const track = document.createElement("span");
    track.className = "analysis-bar-track";
    track.setAttribute("aria-hidden", "true");
    const fill = document.createElement("span");
    fill.className = "analysis-bar-fill";
    fill.style.width = `${Math.max(3, (item.value / max) * 100)}%`;
    track.appendChild(fill);

    const value = document.createElement("span");
    value.className = "analysis-bar-value";
    value.textContent = valueFormatter(item.value);

    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(value);
    container.appendChild(row);
  });
}

function renderHistoryAnalysis(history) {
  const completed = history.filter((h) => !h.abandoned && Number(h.words) > 0);
  const abandoned = history.filter((h) => h.abandoned);
  const attempts = completed.length + abandoned.length;
  const analysisEmpty = document.getElementById("analysisEmpty");
  const analysisContent = document.getElementById("analysisContent");
  const hasRecords = attempts > 0;
  analysisEmpty.hidden = hasRecords;
  analysisContent.hidden = !hasRecords;
  if (!hasRecords) return;

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const last7Days = completed
    .filter((h) => new Date(h.date).getTime() >= sevenDaysAgo)
    .reduce((sum, h) => sum + Number(h.words || 0), 0);
  const totalCompletedWords = completed.reduce((sum, h) => sum + Number(h.words || 0), 0);

  document.getElementById("analysisCompleted").textContent = fmt(completed.length);
  document.getElementById("analysisLast7Days").textContent = fmt(last7Days);
  document.getElementById("analysisAvgWords").textContent = completed.length
    ? fmt(Math.round(totalCompletedWords / completed.length))
    : "—";
  document.getElementById("analysisAbandonRate").textContent = attempts
    ? `${Math.round((abandoned.length / attempts) * 100)}%`
    : "0%";

  const validWpm = completed.filter((h) => h.wpm > 0 && h.wpmValid !== false);
  const currentWpm = combinedWpm(validWpm.slice(0, 5));
  const previousWpm = combinedWpm(validWpm.slice(5, 10));
  let trendText = "WPMの有効な記録はまだありません。";
  if (currentWpm !== null && previousWpm === null) {
    trendText = `最近の読む速さは ${currentWpm} WPMです。比較には10回分の有効記録が必要です。`;
  } else if (currentWpm !== null && previousWpm !== null) {
    const change = currentWpm - previousWpm;
    const direction = Math.abs(change) < 5 ? "ほぼ安定" : change > 0 ? `${change} WPM上昇` : `${Math.abs(change)} WPM低下`;
    trendText = `最近5回は ${currentWpm} WPM、その前の5回は ${previousWpm} WPMで、${direction}しています。`;
  }
  document.getElementById("analysisWpmTrend").textContent = trendText;

  const topicWords = new Map();
  const levelCounts = new Map();
  completed.forEach((h) => {
    const topic = cleanHistoryText(h.topic, "Unknown") || "Unknown";
    topicWords.set(topic, (topicWords.get(topic) || 0) + Number(h.words || 0));
    const level = Math.min(10, Math.max(1, Math.round(Number(h.level) || 1)));
    levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
  });
  const reasonCounts = new Map();
  abandoned.forEach((h) => {
    const key = hasOwn(ABANDON_REASONS, h.abandonReason) ? h.abandonReason : "other";
    reasonCounts.set(key, (reasonCounts.get(key) || 0) + 1);
  });

  const sortedTopics = [...topicWords].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const sortedLevels = [...levelCounts].map(([level, value]) => ({ label: `レベル ${level}`, value })).sort((a, b) => Number(a.label.split(" ")[1]) - Number(b.label.split(" ")[1]));
  const sortedReasons = [...reasonCounts].map(([reason, value]) => ({ label: ABANDON_REASONS[reason], value })).sort((a, b) => b.value - a.value);
  renderAnalysisBars(document.getElementById("analysisTopics"), sortedTopics, (value) => `${fmt(value)}語`);
  renderAnalysisBars(document.getElementById("analysisLevels"), sortedLevels, (value) => `${fmt(value)}篇`);
  renderAnalysisBars(document.getElementById("analysisAbandonReasons"), sortedReasons, (value) => `${fmt(value)}回`);
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

  const useBank = usingOfflineBank();
  syncTopicMode(useBank);
  document.getElementById("modeNote").textContent = useBank
    ? "オフライン文章バンク ・ APIキー不要"
    : `AI生成 ・ 1篇 約${fmt(getNum(LS.wordCount, 800))}語`;
  document.getElementById("startBtn").textContent = useBank
    ? "文章バンクから読みはじめる"
    : "AIで文章を作って読む";

  const list = document.getElementById("historyList");
  list.innerHTML = "";
  const history = getHistory();
  renderHistoryAnalysis(history);
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
        ? `途中終了・${ABANDON_REASONS[h.abandonReason] || "理由未記録"}`
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
const readingClock = { activeMs: 0, startedAt: 0, running: false };

function clockNow() {
  return window.performance && typeof window.performance.now === "function"
    ? window.performance.now()
    : Date.now();
}

function startReadingTimer() {
  readingClock.activeMs = 0;
  readingClock.running = !document.hidden;
  readingClock.startedAt = readingClock.running ? clockNow() : 0;
}

function pauseReadingTimer() {
  if (!readingClock.running) return;
  readingClock.activeMs += Math.max(0, clockNow() - readingClock.startedAt);
  readingClock.running = false;
  readingClock.startedAt = 0;
}

function resumeReadingTimer() {
  if (readingClock.running || document.hidden || views.reading.hidden || activeModalElement) return;
  readingClock.startedAt = clockNow();
  readingClock.running = true;
}

function finishReadingTimer() {
  pauseReadingTimer();
  return Math.max(0, readingClock.activeMs / 1000);
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseReadingTimer();
  else resumeReadingTimer();
});
window.addEventListener("pagehide", pauseReadingTimer);
window.addEventListener("pageshow", resumeReadingTimer);

document.getElementById("startBtn").addEventListener("click", startSession);
document.getElementById("anotherBtn").addEventListener("click", startSession);
document.getElementById("homeBtn").addEventListener("click", () => { renderHome(); showView("home"); });

async function startSession() {
  const useBank = usingOfflineBank();

  if (useBank) {
    return startOfflineSession();
  }

  const apiKey = getSessionApiKey();
  if (!apiKey) {
    openSettings();
    showError("AI生成を使うにはAnthropic APIキーが必要です。設定でオフライン文章バンクへ戻すこともできます。");
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
    startReadingTimer();
  } catch (err) {
    stopLoading();
    console.error(err);
    if (/API error (401|403)/.test(String(err && err.message))) clearSessionApiKey();
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

  const byTopic = bank.filter(matchesTopic);
  const pool = byTopic.length ? byTopic : [...bank]; // fall back to any topic

  // Stay at the requested level while that level still has stock for this
  // topic. Only fan out to nearby levels if this level has nothing at all.
  const atLevel = pool.filter((s) => s.level === level);
  const levelPool = atLevel.length
    ? atLevel
    : [...pool].sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level))
        .filter((s, _, arr) => Math.abs(s.level - level) === Math.abs(arr[0].level - level));

  let unseen = levelPool.filter((s) => !seen.has(s.id));

  if (unseen.length === 0) {
    // Every story at this level and topic has been read. Start a fresh cycle
    // here rather than drifting permanently to a different reading level:
    // clear the "seen" record for just this group, excluding whichever story
    // was offered last so it isn't immediately handed back again.
    clearSeenForPool(levelPool.map((s) => s.id));
    unseen = levelPool.filter((s) => s.id !== lastBankStoryId);
    if (unseen.length === 0) unseen = levelPool; // group has only one story
  }

  return unseen[Math.floor(Math.random() * unseen.length)];
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

  const story = pickStory(bank, topicSelect.value, getLevel());

  session = { topic: story.topic, title: story.title, text: story.text, _bankId: story.id };
  markSeen(story.id);
  lastBankStoryId = story.id;

  renderReading(session);
  showView("reading");
  startReadingTimer();
}

function readableError(err) {
  const m = String((err && err.message) || err);
  if (m.includes("401") || m.includes("403") || /authentication/i.test(m)) return "APIキーが正しくないか、利用権限がありません。キーを消去したため、設定から再入力してください。";
  if (m.includes("429")) return "リクエストが混み合っています。少し待ってから再試行してください。";
  if (m.includes("400")) return "リクエストが受け付けられませんでした。設定の語数を減らして試してみてください。";
  if (/timed out|AbortError/i.test(m)) return "APIから時間内に応答がありませんでした。通信状況を確認して、もう一度お試しください。";
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  let res;

  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
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
  } catch (err) {
    if (err && err.name === "AbortError") throw new Error("API request timed out");
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    // Do not surface or log a provider response body. It can contain request
    // details that are unnecessary for a reader-facing error message.
    throw new Error(`API error ${res.status}`);
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
  session._elapsedSec = finishReadingTimer();
  showView("calibrate");
});

const abandonModal = document.getElementById("abandonModal");
const cancelAbandonBtn = document.getElementById("cancelAbandonBtn");
const abandonReasonButtons = [...document.querySelectorAll("[data-abandon-reason]")];

function cancelAbandon() {
  closeAccessibleModal();
}

document.getElementById("abandonBtn").addEventListener("click", () => {
  openAccessibleModal(abandonModal, abandonReasonButtons[0], cancelAbandon);
});

cancelAbandonBtn.addEventListener("click", cancelAbandon);
abandonModal.addEventListener("click", (e) => {
  if (e.target === abandonModal) cancelAbandon();
});

abandonReasonButtons.forEach((btn) => btn.addEventListener("click", () => {
  const activeSeconds = finishReadingTimer();
  const abandonReason = btn.dataset.abandonReason;
  const levelBefore = getLevel();
  const adjustment = abandonReason === "too-hard"
    ? adjustLevelFromFeedback("hard", levelBefore)
    : { before: levelBefore, after: levelBefore };
  if (abandonReason !== "too-hard") saveLevelSignals(levelBefore, 0);

  pushHistory({
    date: new Date().toISOString(),
    topic: session.topic,
    title: session.title,
    words: 0,
    wpm: 0,
    activeSeconds: Math.round(activeSeconds),
    level: adjustment.before,
    levelAfter: adjustment.after,
    abandonReason,
    abandoned: true,
  });
  closeAccessibleModal({ restoreFocus: false, resumeReading: false });
  startSession();
}));

// ---------------------- Calibration ----------------------

document.querySelectorAll(".calibrate-btn").forEach((btn) => {
  btn.addEventListener("click", () => finishSession(btn.dataset.fb));
});

function finishSession(feedback) {
  const words = session._words;
  const activeSeconds = Math.max(0, session._elapsedSec || 0);
  const rawWpm = activeSeconds > 0 ? Math.round(words / (activeSeconds / 60)) : 0;
  const wpmInvalidReason = activeSeconds < 10
    ? "too-short"
    : rawWpm < 10
      ? "too-slow"
      : rawWpm > 600
        ? "too-fast"
        : null;
  const wpmIsValid = wpmInvalidReason === null;
  const wpm = wpmIsValid ? rawWpm : 0;

  // Hard feedback lowers the level immediately. Easy feedback must be
  // repeated three times at the same level before moving up.
  const before = getLevel();
  const adjustment = adjustLevelFromFeedback(feedback, before);

  pushHistory({
    date: new Date().toISOString(),
    topic: session.topic,
    title: session.title,
    words,
    wpm,
    activeSeconds: Math.round(activeSeconds),
    wpmValid: wpmIsValid,
    wpmInvalidReason,
    level: adjustment.before,
    levelAfter: adjustment.after,
    feedback,
    abandoned: false,
  });

  renderSummary(words, wpm, adjustment, wpmInvalidReason);
  showView("summary");
}

// ---------------------- Summary ----------------------

function renderSummary(words, wpm, adjustment, wpmInvalidReason) {
  const total = totalWordsRead();

  document.getElementById("summaryHeadline").textContent = `${fmt(words)} 語を読みました`;
  document.getElementById("summaryWords").textContent = fmt(words);
  document.getElementById("summaryWpm").textContent = wpm || "—";
  document.getElementById("summaryTotal").textContent = fmt(total);

  const notes = [];
  if (adjustment.note) notes.push(adjustment.note);
  const goal = getNum(LS.dailyGoal, 1500);
  const today = wordsToday();
  if (today >= goal) notes.push(`今日の目標 ${fmt(goal)} 語を達成しました。`);

  const crossed = MILESTONES.find((m) => total >= m && total - words < m);
  if (crossed) notes.push(`累計 ${fmt(crossed)} 語に到達しました。`);

  if (wpmInvalidReason === "too-short") {
    notes.push("読書時間が10秒未満だったため、読む速さは記録しませんでした。");
  } else if (wpmInvalidReason) {
    notes.push("計測値が通常範囲外だったため、読む速さは記録しませんでした。");
  }

  document.getElementById("summaryNote").textContent = notes.join(" ");
}

// ---------------------- Init ----------------------

renderHome();
showView("home");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    const updateToast = document.getElementById("updateToast");
    const applyUpdateBtn = document.getElementById("applyUpdateBtn");
    const dismissUpdateBtn = document.getElementById("dismissUpdateBtn");
    let waitingWorker = null;
    let reloadingForUpdate = false;

    const showUpdateNotice = (worker) => {
      waitingWorker = worker;
      updateToast.hidden = false;
    };

    applyUpdateBtn.addEventListener("click", () => {
      if (!waitingWorker) return;
      applyUpdateBtn.disabled = true;
      applyUpdateBtn.textContent = "更新中…";
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    });

    dismissUpdateBtn.addEventListener("click", () => {
      updateToast.hidden = true;
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadingForUpdate) return;
      reloadingForUpdate = true;
      window.location.reload();
    });

    navigator.serviceWorker.register("sw.js").then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdateNotice(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateNotice(installingWorker);
          }
        });
      });

      // Installed PWAs can stay open for days. Check again whenever the user
      // returns to the app instead of waiting for the next full navigation.
      window.addEventListener("focus", () => registration.update().catch(() => {}));
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) registration.update().catch(() => {});
      });
    }).catch(() => {});
  });
}
