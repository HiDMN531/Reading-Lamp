// =====================================================================

const APP_VERSION = "1.3.0";
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
  levelSignals: "rl_level_signals",
  readingFontSize: "rl_reading_font_size",
  readingLineHeight: "rl_reading_line_height",
  readingFontFamily: "rl_reading_font_family",
  readingTheme: "rl_reading_theme",
  onboardingDone: "rl_onboarding_done_v1",
  preferredTopic: "rl_preferred_topic",
  favoriteStoryIds: "rl_favorite_story_ids",
  activeReading: "rl_active_reading_v1",
  historyRecovery: "rl_history_recovery_v1",
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
const getNum = (k, d) => {
  const parsed = Number(get(k, String(d)));
  return Number.isFinite(parsed) ? parsed : d;
};
const getBool = (k, d) => {
  const value = get(k, d ? "1" : "0");
  return value === "1" ? true : value === "0" ? false : d;
};

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

function removeStored(k) {
  let removed = true;
  try { localStorage.removeItem(k); } catch { removed = false; }
  delete memoryFallback[k];
  return removed;
}

// The API key is intentionally kept on this device so AI mode works again
// after a reload or app restart. localStorage is plain browser storage, not an
// encrypted vault, so the settings screen also provides an explicit erase
// action. If storage is blocked, the shared memory fallback lasts only until
// this page is closed.
function getSessionApiKey() {
  return String(get(LS.apiKey, "") || "").trim();
}
function setSessionApiKey(value) {
  const key = String(value || "").trim();
  return key ? set(LS.apiKey, key) : true;
}
function clearSessionApiKey() {
  let cleared = true;
  try { localStorage.removeItem(LS.apiKey); } catch { cleared = false; }
  try { sessionStorage.removeItem("rl_api_key_session"); } catch {}
  delete memoryFallback[LS.apiKey];
  delete memoryFallback.rl_api_key_session;
  return cleared;
}

// Migrate the short-lived key used by an earlier build when possible.
try {
  if (!getSessionApiKey()) {
    const legacySessionKey = sessionStorage.getItem("rl_api_key_session");
    if (legacySessionKey) setSessionApiKey(legacySessionKey);
  }
  sessionStorage.removeItem("rl_api_key_session");
} catch {}

function getHistory() {
  try {
    if (storageBlocked && memoryFallback[LS.history]) {
      const parsed = JSON.parse(memoryFallback[LS.history]);
      return Array.isArray(parsed)
        ? parsed.map(normalizeHistoryEntry).filter(Boolean).slice(0, HISTORY_LIMIT)
        : [];
    }
    const stored = localStorage.getItem(LS.history);
    const parsed = JSON.parse(stored === null ? (memoryFallback[LS.history] || "[]") : stored);
    return Array.isArray(parsed)
      ? parsed.map(normalizeHistoryEntry).filter(Boolean).slice(0, HISTORY_LIMIT)
      : [];
  }
  catch { return []; }
}
function writeHistory(entries) {
  const safeEntries = (Array.isArray(entries) ? entries : [])
    .map(normalizeHistoryEntry)
    .filter(Boolean)
    .slice(0, HISTORY_LIMIT);
  const payload = JSON.stringify(safeEntries);
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

const REPORT_REASONS = {
  typo: "誤字・文法がおかしい",
  level: "レベルが合っていない",
  unnatural: "内容が不自然",
  inappropriate: "不適切な内容がある",
  other: "その他",
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
const historyRecoverySection = document.getElementById("historyRecoverySection");
const historyRecoveryMessage = document.getElementById("historyRecoveryMessage");
const downloadHistoryRecoveryBtn = document.getElementById("downloadHistoryRecoveryBtn");
const dismissHistoryRecoveryBtn = document.getElementById("dismissHistoryRecoveryBtn");
const readingFontSizeInput = document.getElementById("readingFontSizeInput");
const readingFontSizeValue = document.getElementById("readingFontSizeValue");
const readingLineHeightInput = document.getElementById("readingLineHeightInput");
const readingLineHeightValue = document.getElementById("readingLineHeightValue");
const readingFontFamilyInput = document.getElementById("readingFontFamilyInput");
const readingThemeInput = document.getElementById("readingThemeInput");
const readingDisplayPreview = document.getElementById("readingDisplayPreview");

function clampDisplayNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function getReadingDisplaySettings() {
  const fontFamily = get(LS.readingFontFamily, "serif");
  const theme = get(LS.readingTheme, "night");
  return {
    fontSize: clampDisplayNumber(getNum(LS.readingFontSize, 18), 16, 26, 18),
    lineHeight: clampDisplayNumber(getNum(LS.readingLineHeight, 185), 150, 220, 185),
    fontFamily: ["serif", "sans"].includes(fontFamily) ? fontFamily : "serif",
    theme: ["night", "sepia", "contrast"].includes(theme) ? theme : "night",
  };
}

function displaySettingsFromControls() {
  return {
    fontSize: clampDisplayNumber(readingFontSizeInput.value, 16, 26, 18),
    lineHeight: clampDisplayNumber(readingLineHeightInput.value, 150, 220, 185),
    fontFamily: ["serif", "sans"].includes(readingFontFamilyInput.value) ? readingFontFamilyInput.value : "serif",
    theme: ["night", "sepia", "contrast"].includes(readingThemeInput.value) ? readingThemeInput.value : "night",
  };
}

function applyDisplayToElement(element, settings) {
  element.style.setProperty("--reader-font-size", `${settings.fontSize}px`);
  element.style.setProperty("--reader-line-height", String(settings.lineHeight / 100));
  element.style.setProperty("--reader-font-family", settings.fontFamily === "sans" ? "var(--sans)" : "var(--serif)");
  element.classList.remove("reading-theme-night", "reading-theme-sepia", "reading-theme-contrast");
  element.classList.add(`reading-theme-${settings.theme}`);
}

function updateReadingDisplayPreview() {
  const settings = displaySettingsFromControls();
  readingFontSizeValue.textContent = String(settings.fontSize);
  readingLineHeightValue.textContent = (settings.lineHeight / 100).toFixed(2).replace(/0$/, "");
  readingFontSizeInput.setAttribute("aria-valuetext", `${settings.fontSize}ピクセル`);
  readingLineHeightInput.setAttribute("aria-valuetext", `行間${settings.lineHeight / 100}`);
  applyDisplayToElement(readingDisplayPreview, settings);
}

function applyReadingDisplay(settings = getReadingDisplaySettings()) {
  applyDisplayToElement(views.reading, settings);
}

function renderApiKeyStatus() {
  const isSet = Boolean(getSessionApiKey());
  apiKeyStatus.textContent = isSet
    ? "この端末にAPIキーを保存済みです。"
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
    : "オフにするとAI生成モードになります。入力したAPIキーはこの端末に保存されます。";
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
  const displaySettings = getReadingDisplaySettings();
  readingFontSizeInput.value = String(displaySettings.fontSize);
  readingLineHeightInput.value = String(displaySettings.lineHeight);
  readingFontFamilyInput.value = displaySettings.fontFamily;
  readingThemeInput.value = displaySettings.theme;
  syncSettingsMode(toggleOfflineBank.checked);
  renderApiKeyStatus();
  renderHistoryRecovery();
  settingsStatus.textContent = "";
  updateRangeAccessibility();
  updateReadingDisplayPreview();
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
[readingFontSizeInput, readingLineHeightInput].forEach((input) => {
  input.addEventListener("input", updateReadingDisplayPreview);
});
[readingFontFamilyInput, readingThemeInput].forEach((input) => {
  input.addEventListener("change", updateReadingDisplayPreview);
});
toggleOfflineBank.addEventListener("change", () => {
  syncSettingsMode(toggleOfflineBank.checked);
});

document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  apiKeyInput.blur(); // dismiss the mobile keyboard so nothing hides feedback

  const typedApiKey = apiKeyInput.value.trim();
  const okApiKey = !typedApiKey || setSessionApiKey(typedApiKey);
  apiKeyInput.value = "";

  if (!toggleOfflineBank.checked && !getSessionApiKey()) {
    renderApiKeyStatus();
    showError("AI生成モードでは、Anthropic APIキーを入力してください。");
    apiKeyInput.focus();
    return;
  }

  const previousLevel = getLevel();
  const selectedLevel = Math.min(10, Math.max(1, parseInt(levelInput.value, 10)));
  const ok2 = set(LS.level, String(selectedLevel));
  const okSignals = selectedLevel === previousLevel ? true : saveLevelSignals(selectedLevel, 0);
  const ok3 = set(LS.wordCount, String(parseInt(wordCountInput.value, 10)));
  const ok4 = set(LS.dailyGoal, String(parseInt(dailyGoalInput.value, 10)));
  const ok8 = set(LS.offlineBank, toggleOfflineBank.checked ? "1" : "0");
  const displaySettings = displaySettingsFromControls();
  const ok9 = set(LS.readingFontSize, String(displaySettings.fontSize));
  const ok10 = set(LS.readingLineHeight, String(displaySettings.lineHeight));
  const ok11 = set(LS.readingFontFamily, displaySettings.fontFamily);
  const ok12 = set(LS.readingTheme, displaySettings.theme);

  applyReadingDisplay(displaySettings);

  if (okApiKey && ok2 && okSignals && ok3 && ok4 && ok8 && ok9 && ok10 && ok11 && ok12) {
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
    removeStored(LS.historyRecovery);
    renderHome();
    closeSettings();
  }
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const backup = {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    history: getHistory(),
    favoriteStoryIds: getFavoriteIds(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `reading-lamp-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
  if (typeof entry.storyId === "string" && /^s\d{3,}$/.test(entry.storyId)) {
    normalized.storyId = entry.storyId;
  }
  return normalized;
}

function historyFingerprint(entry) {
  return [entry.date, entry.topic, entry.title, entry.words, entry.level, entry.abandoned ? 1 : 0].join("|");
}

function readRawHistory() {
  try {
    const stored = localStorage.getItem(LS.history);
    return stored === null ? (memoryFallback[LS.history] || "[]") : stored;
  } catch {
    return memoryFallback[LS.history] || "[]";
  }
}

function getHistoryRecovery() {
  try {
    const recovery = JSON.parse(get(LS.historyRecovery, "null"));
    if (!recovery || recovery.schemaVersion !== 1 || typeof recovery.originalHistory !== "string") return null;
    const createdAt = new Date(recovery.createdAt);
    if (!Number.isFinite(createdAt.getTime())) return null;
    const allowedReasons = ["json-error", "not-array", "invalid-entries", "over-limit"];
    return {
      schemaVersion: 1,
      createdAt: createdAt.toISOString(),
      reason: allowedReasons.includes(recovery.reason) ? recovery.reason : "json-error",
      originalCount: Number.isInteger(recovery.originalCount) && recovery.originalCount >= 0 ? recovery.originalCount : null,
      retainedCount: Number.isInteger(recovery.retainedCount) && recovery.retainedCount >= 0 ? recovery.retainedCount : 0,
      removedCount: Number.isInteger(recovery.removedCount) && recovery.removedCount >= 0 ? recovery.removedCount : null,
      originalHistory: recovery.originalHistory,
    };
  } catch {
    return null;
  }
}

function prepareHistoryRecovery() {
  const raw = readRawHistory();
  let parsed;
  let reason = "";
  let originalCount = null;
  let validEntries = [];

  try {
    parsed = JSON.parse(raw);
  } catch {
    reason = "json-error";
  }

  if (!reason && !Array.isArray(parsed)) {
    reason = "not-array";
  } else if (!reason) {
    originalCount = parsed.length;
    validEntries = parsed.map(normalizeHistoryEntry).filter(Boolean);
    if (validEntries.length !== parsed.length) reason = "invalid-entries";
    else if (parsed.length > HISTORY_LIMIT) reason = "over-limit";
  }

  if (!reason) return { repaired: false };

  const retainedEntries = validEntries.slice(0, HISTORY_LIMIT);
  const recovery = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    reason,
    originalCount,
    retainedCount: retainedEntries.length,
    removedCount: originalCount === null ? null : Math.max(0, originalCount - retainedEntries.length),
    originalHistory: raw,
  };
  const backupSaved = set(LS.historyRecovery, JSON.stringify(recovery));
  const historySaved = writeHistory(retainedEntries);

  return {
    repaired: true,
    reason,
    retainedCount: retainedEntries.length,
    removedCount: recovery.removedCount,
    backupSaved,
    historySaved,
  };
}

function historyRecoverySummary(recovery) {
  if (recovery.reason === "invalid-entries") {
    return `読み取れない記録を${fmt(recovery.removedCount || 0)}件除外し、正常な${fmt(recovery.retainedCount || 0)}件を残しました。`;
  }
  if (recovery.reason === "over-limit") {
    return `保存上限を超えた記録を整理し、新しい${fmt(recovery.retainedCount || 0)}件を残しました。`;
  }
  return "保存形式を読み取れなかったため、安全な空の履歴で起動しました。";
}

function renderHistoryRecovery() {
  const recovery = getHistoryRecovery();
  historyRecoverySection.hidden = !recovery;
  if (!recovery) return;
  historyRecoveryMessage.textContent = `${historyRecoverySummary(recovery)} 修復前のデータはJSONで保存できます。`;
}

downloadHistoryRecoveryBtn.addEventListener("click", () => {
  const recovery = getHistoryRecovery();
  if (!recovery) {
    renderHistoryRecovery();
    return;
  }
  const blob = new Blob([JSON.stringify(recovery, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `reading-lamp-recovery-${recovery.createdAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  settingsStatus.textContent = "修復前データを保存しました。内容を確認後、不要なら下のボタンで削除できます。";
});

dismissHistoryRecoveryBtn.addEventListener("click", () => {
  removeStored(LS.historyRecovery);
  renderHistoryRecovery();
  settingsStatus.textContent = "修復前データを端末から削除しました。";
});

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
    const importedFavorites = parsed && !Array.isArray(parsed) && Array.isArray(parsed.favoriteStoryIds)
      ? [...new Set(parsed.favoriteStoryIds.filter((id) => typeof id === "string" && /^s\d{3,}$/.test(id)))].slice(0, 500)
      : [];
    if (!imported.length && !importedFavorites.length) throw new Error("no valid backup entries");
    const current = getHistory();
    const known = new Set(current.map(historyFingerprint));
    const additions = [];
    imported.forEach((entry) => {
      const fingerprint = historyFingerprint(entry);
      if (known.has(fingerprint)) return;
      known.add(fingerprint);
      additions.push(entry);
    });
    const merged = [...current, ...additions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, HISTORY_LIMIT);
    const retained = new Set(merged.map(historyFingerprint));
    const restoredCount = additions.filter((entry) => retained.has(historyFingerprint(entry))).length;
    const omittedCount = additions.length - restoredCount;
    const currentFavorites = getFavoriteIds();
    const mergedFavorites = [...new Set([...currentFavorites, ...importedFavorites])].slice(0, 500);
    const favoriteAddedCount = mergedFavorites.length - currentFavorites.length;
    if (!restoredCount && !favoriteAddedCount) {
      settingsStatus.textContent = "すべて既に復元済みです。重複するデータは追加しませんでした。";
      return;
    }
    const confirmationParts = [];
    if (restoredCount) confirmationParts.push(`記録${restoredCount}件`);
    if (favoriteAddedCount) confirmationParts.push(`お気に入り${favoriteAddedCount}篇`);
    if (!confirm(`${confirmationParts.join("と")}を、現在のデータに追加します。よろしいですか？`)) return;
    const historySaved = restoredCount ? writeHistory(merged) : true;
    const favoritesSaved = favoriteAddedCount ? saveFavoriteIds(mergedFavorites) : true;
    renderHome();
    const omittedNote = omittedCount ? ` 古い${omittedCount}件は保存上限のため除外しました。` : "";
    settingsStatus.textContent = historySaved && favoritesSaved
      ? `${confirmationParts.join("と")}を復元しました。${omittedNote}`
      : `${confirmationParts.join("と")}を今回のセッションへ復元しましたが、端末には保存できませんでした。${omittedNote}`;
  } catch (err) {
    showError("データを復元できませんでした。Reading Lampから書き出したJSONか確認してください。");
  } finally {
    restoreInput.value = "";
  }
});

// ---------------------- Home ----------------------

const topicSelect = document.getElementById("topicSelect");
const customTopicInput = document.getElementById("customTopicInput");
const customTopicOption = topicSelect.querySelector('option[value="custom"]');

const savedPreferredTopic = get(LS.preferredTopic, "random");
if ([...topicSelect.options].some((option) => option.value === savedPreferredTopic)) {
  topicSelect.value = savedPreferredTopic;
}

function syncTopicMode(useBank = usingOfflineBank()) {
  customTopicOption.disabled = useBank;
  customTopicOption.hidden = useBank;
  if (useBank && topicSelect.value === "custom") topicSelect.value = "random";
  customTopicInput.hidden = useBank || topicSelect.value !== "custom";
}

topicSelect.addEventListener("change", () => {
  syncTopicMode();
  if (topicSelect.value !== "custom") set(LS.preferredTopic, topicSelect.value);
});

const TOPIC_POOL = [
  "Fantasy/stories", "Famous books", "Nature and animals",
  "World affairs", "Everyday life", "History", "Science",
  "Mystery and adventure", "Travel and culture", "People and biography",
];

const TOPIC_LABELS = {
  "Fantasy/stories": "Fantasy",
  "Famous books": "Classics / Retellings",
  "Nature and animals": "Nature and animals",
  "World affairs": "Society / World",
  "Everyday life": "Everyday life",
  History: "History",
  Science: "Science / Technology",
  "Mystery and adventure": "Mystery / Adventure",
  "Travel and culture": "Travel / Culture",
  "People and biography": "People / Biography",
};

function topicLabel(topic) {
  return TOPIC_LABELS[topic] || topic || "Unknown";
}

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
    const topic = topicLabel(cleanHistoryText(h.topic, "Unknown") || "Unknown");
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
  renderFavorites();
  renderActiveReadingPanel();
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
const ACTIVE_READING_VERSION = 1;
const ACTIVE_READING_SAVE_INTERVAL_MS = 15000;
let activeReadingSaveTimer = null;
let activeReadingScrollTimer = null;

function clockNow() {
  return window.performance && typeof window.performance.now === "function"
    ? window.performance.now()
    : Date.now();
}

function startReadingTimer(initialSeconds = 0) {
  readingClock.activeMs = Math.max(0, Number(initialSeconds) || 0) * 1000;
  readingClock.running = !document.hidden;
  readingClock.startedAt = readingClock.running ? clockNow() : 0;
}

function readingSecondsSnapshot() {
  const runningMs = readingClock.running
    ? Math.max(0, clockNow() - readingClock.startedAt)
    : 0;
  return Math.max(0, (readingClock.activeMs + runningMs) / 1000);
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

function readingScrollRatio() {
  const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  return maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
}

function normalizeActiveReadingDraft(value) {
  if (!value || value.version !== ACTIVE_READING_VERSION) return null;
  if (!value.story || typeof value.story !== "object") return null;
  const story = value.story;
  if (typeof story.title !== "string" || !story.title.trim() || story.title.length > 300) return null;
  if (typeof story.text !== "string" || !story.text.trim() || story.text.length > 100000) return null;
  if (typeof story.topic !== "string" || story.topic.length > 300) return null;
  const level = Math.min(10, Math.max(1, Math.round(Number(story._level) || getLevel())));
  const bankId = typeof story._bankId === "string" && /^s\d{3,}$/.test(story._bankId)
    ? story._bankId
    : null;
  const editorialStatus = bankId && typeof story._editorialStatus === "string"
    ? story._editorialStatus
    : null;
  if (bankId && editorialStatus && editorialStatus !== "published") return null;
  return {
    version: ACTIVE_READING_VERSION,
    phase: value.phase === "calibrate" ? "calibrate" : "reading",
    savedAt: typeof value.savedAt === "string" ? value.savedAt : new Date().toISOString(),
    activeSeconds: Math.min(7 * 24 * 60 * 60, Math.max(0, Number(value.activeSeconds) || 0)),
    scrollRatio: Math.min(1, Math.max(0, Number(value.scrollRatio) || 0)),
    story: {
      topic: story.topic,
      title: story.title,
      text: story.text,
      _bankId: bankId,
      _level: level,
      _editorialStatus: editorialStatus,
    },
  };
}

function getActiveReadingDraft() {
  try {
    const parsed = JSON.parse(get(LS.activeReading, "null"));
    const normalized = normalizeActiveReadingDraft(parsed);
    if (!normalized && parsed) removeStored(LS.activeReading);
    return normalized;
  } catch {
    removeStored(LS.activeReading);
    return null;
  }
}

function clearActiveReadingDraft() {
  stopActiveReadingAutosave();
  return removeStored(LS.activeReading);
}

function persistActiveReading(phase = "reading") {
  if (!session || typeof session.text !== "string" || !session.text.trim()) return false;
  const activeSeconds = phase === "calibrate"
    ? Math.max(0, Number(session._elapsedSec) || 0)
    : readingSecondsSnapshot();
  return set(LS.activeReading, JSON.stringify({
    version: ACTIVE_READING_VERSION,
    phase,
    savedAt: new Date().toISOString(),
    activeSeconds,
    scrollRatio: phase === "reading" ? readingScrollRatio() : 1,
    story: {
      topic: String(session.topic || ""),
      title: String(session.title || ""),
      text: String(session.text || ""),
      _bankId: session._bankId || null,
      _level: Math.min(10, Math.max(1, Number(session._level) || getLevel())),
      _editorialStatus: session._bankId ? (session._editorialStatus || null) : null,
    },
  }));
}

function stopActiveReadingAutosave() {
  clearInterval(activeReadingSaveTimer);
  clearTimeout(activeReadingScrollTimer);
  activeReadingSaveTimer = null;
  activeReadingScrollTimer = null;
}

function startActiveReadingAutosave() {
  stopActiveReadingAutosave();
  persistActiveReading("reading");
  activeReadingSaveTimer = setInterval(() => {
    if (!views.reading.hidden) persistActiveReading("reading");
  }, ACTIVE_READING_SAVE_INTERVAL_MS);
}

function formatActiveReadingDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "保存済み";
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")} 保存`;
}

function renderActiveReadingPanel() {
  const panel = document.getElementById("resumeReadingPanel");
  const draft = getActiveReadingDraft();
  panel.hidden = !draft;
  if (!draft) return;
  document.getElementById("resumeReadingHeading").textContent = draft.story.title;
  const phaseText = draft.phase === "calibrate" ? "読後の感想を入力するところから" : "本文の続きから";
  document.getElementById("resumeReadingMeta").textContent =
    `Level ${draft.story._level} ・ ${topicLabel(draft.story.topic)} ・ ${phaseText} ・ ${formatActiveReadingDate(draft.savedAt)}`;
  document.getElementById("resumeReadingBtn").textContent =
    draft.phase === "calibrate" ? "読後の記録を続ける" : "途中から再開";
}

async function restoreActiveReading() {
  const draft = getActiveReadingDraft();
  if (!draft) {
    renderActiveReadingPanel();
    showError("再開できる読みかけの文章がありません。");
    return;
  }
  if (draft.story._bankId) {
    try {
      const publishedBank = await loadStoryBank();
      if (!publishedBank.some((story) => story.id === draft.story._bankId)) {
        clearActiveReadingDraft();
        renderActiveReadingPanel();
        showError("この読みかけ文章は公開対象から外れたため再開できません。別の文章を選んでください。");
        return;
      }
    } catch {
      showError("文章バンクを確認できませんでした。通信状態を確認して、もう一度お試しください。");
      return;
    }
  }
  session = { ...draft.story };
  renderReading(session);
  lastBankStoryId = session._bankId || lastBankStoryId;
  if (draft.phase === "calibrate") {
    readingClock.activeMs = draft.activeSeconds * 1000;
    readingClock.startedAt = 0;
    readingClock.running = false;
    session._elapsedSec = draft.activeSeconds;
    showView("calibrate");
    return;
  }
  showView("reading");
  startReadingTimer(draft.activeSeconds);
  startActiveReadingAutosave();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    window.scrollTo(0, Math.round(maxScroll * draft.scrollRatio));
  }));
}

function unmarkSeen(id) {
  if (!id) return;
  const seen = getSeenIds();
  seen.delete(id);
  set(LS.seenStoryIds, JSON.stringify([...seen]));
}

function blockNewReadingWhenDraftExists() {
  if (!getActiveReadingDraft()) return false;
  showError("読みかけの文章があります。先に「途中から再開」または「今回は再開しない」を選んでください。");
  document.getElementById("resumeReadingBtn").focus();
  return true;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseReadingTimer();
    if (!views.reading.hidden) persistActiveReading("reading");
  } else {
    resumeReadingTimer();
  }
});
window.addEventListener("pagehide", () => {
  pauseReadingTimer();
  if (!views.reading.hidden) persistActiveReading("reading");
});
window.addEventListener("pageshow", resumeReadingTimer);
window.addEventListener("scroll", () => {
  if (views.reading.hidden || !session) return;
  clearTimeout(activeReadingScrollTimer);
  activeReadingScrollTimer = setTimeout(() => persistActiveReading("reading"), 1200);
}, { passive: true });

document.getElementById("startBtn").addEventListener("click", () => {
  if (!blockNewReadingWhenDraftExists()) startSession();
});
document.getElementById("anotherBtn").addEventListener("click", startSession);
document.getElementById("homeBtn").addEventListener("click", () => { renderHome(); showView("home"); });
document.getElementById("resumeReadingBtn").addEventListener("click", restoreActiveReading);
document.getElementById("discardReadingBtn").addEventListener("click", () => {
  const draft = getActiveReadingDraft();
  if (draft && draft.story._bankId) unmarkSeen(draft.story._bankId);
  clearActiveReadingDraft();
  renderActiveReadingPanel();
  document.getElementById("startBtn").focus();
});

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
    session._level = getLevel();
    stopLoading();
    renderReading(session);
    showView("reading");
    startReadingTimer();
    startActiveReadingAutosave();
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
    const storedStories = await res.json();
    if (!Array.isArray(storedStories)) throw new Error("stories.json is not an array");
    STORY_BANK = storedStories.filter((story) =>
      story &&
      story.editorialStatus === "published" &&
      typeof story.id === "string" &&
      typeof story.title === "string" && story.title.trim() &&
      typeof story.text === "string" && story.text.trim() &&
      Number.isInteger(story.level) && story.level >= 1 && story.level <= 10
    );
    if (!STORY_BANK.length) throw new Error("stories.json has no published stories");
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

function getFavoriteIds() {
  try {
    const parsed = JSON.parse(get(LS.favoriteStoryIds, "[]"));
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.filter((id) => typeof id === "string" && /^s\d{3,}$/.test(id)))].slice(0, 500);
  } catch {
    return [];
  }
}

function saveFavoriteIds(ids) {
  return set(LS.favoriteStoryIds, JSON.stringify([...new Set(ids)].slice(0, 500)));
}

function isFavoriteStory(id) {
  return Boolean(id) && getFavoriteIds().includes(id);
}

function renderFavoriteButton() {
  const button = document.getElementById("favoriteBtn");
  const label = document.getElementById("favoriteBtnLabel");
  const icon = button.querySelector(".favorite-icon");
  const storyId = session && session._bankId;
  button.hidden = !storyId;
  if (!storyId) return;
  const active = isFavoriteStory(storyId);
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.classList.toggle("is-favorite", active);
  label.textContent = active ? "お気に入りから外す" : "お気に入りに追加";
  icon.textContent = active ? "★" : "☆";
}

async function renderFavorites() {
  const panel = document.getElementById("favoritesPanel");
  const count = document.getElementById("favoriteCount");
  const list = document.getElementById("favoriteList");
  const favoriteIds = getFavoriteIds();
  count.textContent = `${fmt(favoriteIds.length)}篇`;
  panel.hidden = favoriteIds.length === 0;
  list.innerHTML = "";
  if (!favoriteIds.length) return;

  try {
    const bank = await loadStoryBank();
    const storiesById = new Map(bank.map((story) => [story.id, story]));
    favoriteIds.forEach((id) => {
      const story = storiesById.get(id);
      if (!story) return;
      const row = document.createElement("li");
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "favorite-open";
      openButton.innerHTML = `<span>${esc(story.title)}</span><small>Level ${story.level} ・ ${esc(topicLabel(story.topic))}</small>`;
      openButton.addEventListener("click", () => startFavoriteSession(story.id));

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "favorite-remove";
      removeButton.setAttribute("aria-label", `${story.title}をお気に入りから外す`);
      removeButton.textContent = "×";
      removeButton.addEventListener("click", () => {
        saveFavoriteIds(getFavoriteIds().filter((favoriteId) => favoriteId !== story.id));
        renderFavorites();
      });
      row.append(openButton, removeButton);
      list.appendChild(row);
    });
  } catch {
    list.innerHTML = '<li class="favorites-error">お気に入りを読み込めませんでした。</li>';
  }
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

  session = { topic: story.topic, title: story.title, text: story.text, _bankId: story.id, _level: story.level, _editorialStatus: story.editorialStatus };
  markSeen(story.id);
  lastBankStoryId = story.id;

  renderReading(session);
  showView("reading");
  startReadingTimer();
  startActiveReadingAutosave();
}

async function startFavoriteSession(storyId) {
  if (blockNewReadingWhenDraftExists()) return;
  showView("loading");
  document.getElementById("loadingText").textContent = "お気に入りを開いています…";
  try {
    const bank = await loadStoryBank();
    const story = bank.find((candidate) => candidate.id === storyId);
    if (!story) throw new Error("favorite story not found");
    if (getLevel() !== story.level) {
      setLevel(story.level);
      saveLevelSignals(story.level, 0);
    }
    session = { topic: story.topic, title: story.title, text: story.text, _bankId: story.id, _level: story.level, _editorialStatus: story.editorialStatus };
    markSeen(story.id);
    lastBankStoryId = story.id;
    renderReading(session);
    showView("reading");
    startReadingTimer();
    startActiveReadingAutosave();
  } catch {
    showView("home");
    showError("お気に入りの文章を開けませんでした。アプリを更新してから、もう一度お試しください。");
  }
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
  document.getElementById("readingTopic").textContent = topicLabel(s.topic || "");
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
  renderFavoriteButton();
}

document.getElementById("favoriteBtn").addEventListener("click", () => {
  if (!session || !session._bankId) return;
  const ids = getFavoriteIds();
  const next = ids.includes(session._bankId)
    ? ids.filter((id) => id !== session._bankId)
    : [session._bankId, ...ids];
  if (!saveFavoriteIds(next)) {
    showError("お気に入りを端末に保存できませんでした。");
  }
  renderFavoriteButton();
});

const reportModal = document.getElementById("reportModal");
const closeReportIconBtn = document.getElementById("closeReportIconBtn");
const reportNoteInput = document.getElementById("reportNoteInput");
const reportStatus = document.getElementById("reportStatus");

function closeStoryReport() {
  closeAccessibleModal();
}

function storyReportData() {
  const selected = document.querySelector('input[name="reportReason"]:checked');
  const reason = selected && hasOwn(REPORT_REASONS, selected.value) ? selected.value : "other";
  return {
    app: "Reading Lamp",
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    storyId: session && session._bankId ? session._bankId : "AI-generated",
    title: session && session.title ? session.title : "",
    topic: session && session.topic ? session.topic : "",
    level: session && session._level ? session._level : getLevel(),
    issueType: reason,
    issueLabel: REPORT_REASONS[reason],
    note: reportNoteInput.value.trim().slice(0, 500),
  };
}

function storyReportText(data) {
  const lines = [
    "Reading Lamp 文章問題報告",
    `文章ID: ${data.storyId}`,
    `タイトル: ${data.title}`,
    `ジャンル: ${topicLabel(data.topic)}`,
    `レベル: ${data.level}`,
    `問題: ${data.issueLabel}`,
  ];
  if (data.note) lines.push(`補足: ${data.note}`);
  lines.push(`アプリ版: ${data.appVersion}`, `作成日時: ${data.createdAt}`);
  return lines.join("\n");
}

async function copyReportText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();
  const copied = document.execCommand("copy");
  helper.remove();
  if (!copied) throw new Error("copy unavailable");
}

document.getElementById("reportStoryBtn").addEventListener("click", () => {
  if (!session) return;
  reportNoteInput.value = "";
  reportStatus.textContent = "";
  const firstReason = document.querySelector('input[name="reportReason"]');
  firstReason.checked = true;
  document.getElementById("reportStoryContext").textContent =
    `${session._bankId || "AI生成"} ・ ${session.title || "タイトルなし"} ・ Level ${getLevel()}`;
  openAccessibleModal(reportModal, firstReason, closeStoryReport);
});

closeReportIconBtn.addEventListener("click", closeStoryReport);
document.getElementById("closeReportBtn").addEventListener("click", closeStoryReport);
reportModal.addEventListener("click", (event) => {
  if (event.target === reportModal) closeStoryReport();
});

document.getElementById("shareReportBtn").addEventListener("click", async () => {
  const data = storyReportData();
  const text = storyReportText(data);
  reportStatus.textContent = "";
  try {
    if (navigator.share) {
      await navigator.share({ title: `Reading Lamp: ${data.storyId}`, text });
      reportStatus.textContent = "共有画面へ報告内容を渡しました。";
    } else {
      await copyReportText(text);
      reportStatus.textContent = "報告内容をクリップボードへコピーしました。";
    }
  } catch (error) {
    if (error && error.name === "AbortError") return;
    try {
      await copyReportText(text);
      reportStatus.textContent = "共有できなかったため、報告内容をコピーしました。";
    } catch {
      showError("報告内容を共有できませんでした。「ファイルで保存」をお使いください。");
    }
  }
});

document.getElementById("downloadReportBtn").addEventListener("click", () => {
  const data = storyReportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reading-lamp-report-${data.storyId}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  reportStatus.textContent = "報告ファイルを保存しました。配布元への連絡時に添付してください。";
});

document.getElementById("finishReadingBtn").addEventListener("click", () => {
  session._elapsedSec = finishReadingTimer();
  stopActiveReadingAutosave();
  persistActiveReading("calibrate");
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
    storyId: session._bankId,
    words: 0,
    wpm: 0,
    activeSeconds: Math.round(activeSeconds),
    level: adjustment.before,
    levelAfter: adjustment.after,
    abandonReason,
    abandoned: true,
  });
  clearActiveReadingDraft();
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
    storyId: session._bankId,
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
  clearActiveReadingDraft();

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

// ---------------------- First-run onboarding ----------------------

const onboardingModal = document.getElementById("onboardingModal");
const onboardingSteps = [...document.querySelectorAll("[data-onboarding-step]")];
const onboardingStepLabel = document.getElementById("onboardingStepLabel");
const onboardingLevelInput = document.getElementById("onboardingLevelInput");
const onboardingLevelDescription = document.getElementById("onboardingLevelDescription");
const onboardingTopicSelect = document.getElementById("onboardingTopicSelect");
const onboardingGoalSelect = document.getElementById("onboardingGoalSelect");
const onboardingBackBtn = document.getElementById("onboardingBackBtn");
const onboardingNextBtn = document.getElementById("onboardingNextBtn");
const onboardingFinishBtn = document.getElementById("onboardingFinishBtn");
const onboardingSkipBtn = document.getElementById("onboardingSkipBtn");
let onboardingStep = 0;

function renderOnboardingLevel() {
  const info = levelInfo(Number(onboardingLevelInput.value));
  onboardingLevelDescription.textContent = `レベル ${info.n} — ${info.label}：${info.desc}`;
  onboardingLevelInput.setAttribute("aria-valuetext", `レベル${info.n}、${info.label}`);
}

function renderOnboardingStep() {
  onboardingSteps.forEach((step, index) => { step.hidden = index !== onboardingStep; });
  onboardingStepLabel.textContent = `${onboardingStep + 1} / ${onboardingSteps.length}`;
  onboardingModal.querySelectorAll(".onboarding-dots i").forEach((dot, index) => {
    dot.classList.toggle("active", index === onboardingStep);
  });
  onboardingBackBtn.hidden = onboardingStep === 0;
  onboardingNextBtn.hidden = onboardingStep === onboardingSteps.length - 1;
  onboardingFinishBtn.hidden = onboardingStep !== onboardingSteps.length - 1;
  const focusTarget = onboardingStep === onboardingSteps.length - 1 ? onboardingFinishBtn : onboardingNextBtn;
  requestAnimationFrame(() => focusTarget.focus());
}

function openOnboarding() {
  onboardingStep = 0;
  onboardingLevelInput.value = String(getLevel());
  onboardingGoalSelect.value = String(getNum(LS.dailyGoal, 1500));
  if (![...onboardingGoalSelect.options].some((option) => option.value === onboardingGoalSelect.value)) {
    onboardingGoalSelect.value = "1500";
  }
  const preferred = get(LS.preferredTopic, topicSelect.value || "random");
  onboardingTopicSelect.value = [...onboardingTopicSelect.options].some((option) => option.value === preferred)
    ? preferred
    : "random";
  renderOnboardingLevel();
  renderOnboardingStep();
  openAccessibleModal(onboardingModal, onboardingNextBtn, () => completeOnboarding(false));
}

function completeOnboarding(savePreferences) {
  let saved = true;
  if (savePreferences) {
    const selectedLevel = Math.min(10, Math.max(1, Number(onboardingLevelInput.value)));
    const selectedTopic = onboardingTopicSelect.value;
    saved = set(LS.level, String(selectedLevel)) && saved;
    saved = saveLevelSignals(selectedLevel, 0) && saved;
    saved = set(LS.dailyGoal, onboardingGoalSelect.value) && saved;
    saved = set(LS.preferredTopic, selectedTopic) && saved;
    topicSelect.value = selectedTopic;
  }
  saved = set(LS.onboardingDone, "1") && saved;
  closeAccessibleModal({ restoreFocus: false });
  renderHome();
  document.getElementById("startBtn").focus();
  if (!saved) showError("設定を端末に保存できませんでした。このセッション中は設定を使えます。");
}

onboardingLevelInput.addEventListener("input", renderOnboardingLevel);
onboardingBackBtn.addEventListener("click", () => {
  onboardingStep = Math.max(0, onboardingStep - 1);
  renderOnboardingStep();
});
onboardingNextBtn.addEventListener("click", () => {
  onboardingStep = Math.min(onboardingSteps.length - 1, onboardingStep + 1);
  renderOnboardingStep();
});
onboardingFinishBtn.addEventListener("click", () => completeOnboarding(true));
onboardingSkipBtn.addEventListener("click", () => completeOnboarding(false));
document.getElementById("replayOnboardingBtn").addEventListener("click", () => {
  closeSettings();
  setTimeout(openOnboarding, 0);
});

// ---------------------- Init ----------------------

const startupHistoryRepair = prepareHistoryRecovery();
applyReadingDisplay();
renderHome();
showView("home");
if (startupHistoryRepair.repaired) {
  const repairMessage = startupHistoryRepair.backupSaved && startupHistoryRepair.historySaved
    ? "保存データの一部を安全に読み取れなかったため、有効な記録だけで起動しました。修復前データは設定から保存できます。"
    : "保存データの一部を安全に読み取れなかったため、有効な記録だけで起動しました。端末への保存が制限されているため、修復前データは今回のセッション中に設定から保存してください。";
  showError(repairMessage);
}
if (!getBool(LS.onboardingDone, false)) requestAnimationFrame(openOnboarding);

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
