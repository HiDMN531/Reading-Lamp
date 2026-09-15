// =====================================================================

const APP_VERSION = "2.9.4";
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
  // Exception messages may contain URL parameters or user input. Keep the
  // on-screen report useful without exposing those values to a bystander.
  const file = (e.filename || "").split("/").pop();
  alert(`処理を続けられませんでした。アプリを開き直してください。\n${file ? `場所：${file}:${Number(e.lineno) || 0}` : ""}`);
});
window.addEventListener("unhandledrejection", (e) => {
  alert("処理を続けられませんでした。通信状態を確認して、もう一度試してください。");
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
  weeklyGoalDays: "rl_weekly_goal_days",
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
  rewards: "rl_rewards_v1",
  rewardFilter: "rl_reward_filter_v2",
  rewardSort: "rl_reward_sort_v1",
  pinnedReward: "rl_pinned_reward_v1",
  showRewardGoals: "rl_show_reward_goals_v1",
  rewardNotifications: "rl_reward_notifications_v1",
  personalizedSuggestions: "rl_personalized_suggestions_v1",
  lastBackupAt: "rl_last_backup_at_v1",
  firstCompletionGuideSeen: "rl_first_completion_guide_seen_v1",
  anonymousUsageConsent: "rl_anonymous_usage_consent_v1",
  anonymousUsage: "rl_anonymous_usage_v1",
  anonymousInstallId: "rl_anonymous_install_id_v1",
  reportQueue: "rl_story_report_queue_v1",
};
const HISTORY_LIMIT = 2000;
const REPORT_QUEUE_LIMIT = 100;
const ANALYTICS_DAY_LIMIT = 90;
let serviceWorkerRegistration = null;
let offlinePreparing = false;

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

// Optional same-origin collection endpoints are deployment settings. Empty
// values keep all analytics and report data on this device.
let runtimeConfigPromise = null;
function normalizeCollectionEndpoint(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value, window.location.href);
    return url.origin === window.location.origin ? url.href : "";
  } catch {
    return "";
  }
}

function normalizeSupportEmail(value) {
  const email = typeof value === "string" ? value.trim() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

function loadRuntimeConfig() {
  if (runtimeConfigPromise) return runtimeConfigPromise;
  runtimeConfigPromise = fetch("config.json")
    .then((response) => response.ok ? response.json() : {})
    .then((config) => ({
      analyticsEndpoint: normalizeCollectionEndpoint(config.analyticsEndpoint),
      storyReportEndpoint: normalizeCollectionEndpoint(config.storyReportEndpoint),
      supportEmail: normalizeSupportEmail(config.supportEmail),
    }))
    .catch(() => ({ analyticsEndpoint: "", storyReportEndpoint: "", supportEmail: "" }));
  return runtimeConfigPromise;
}

const ANONYMOUS_EVENTS = new Set([
  "app_open", "candidate_shown", "story_start", "story_complete",
  "story_abandon", "offline_ready", "level_sample_selected", "report_submitted",
]);

function getAnonymousInstallId() {
  let id = get(LS.anonymousInstallId, "");
  if (/^[a-z0-9-]{16,80}$/i.test(id)) return id;
  id = window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `anon-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  set(LS.anonymousInstallId, id);
  return id;
}

function getAnonymousUsage() {
  try {
    const parsed = JSON.parse(get(LS.anonymousUsage, "null"));
    if (parsed && parsed.version === 1 && parsed.days && typeof parsed.days === "object") return parsed;
  } catch {}
  return { version: 1, days: {} };
}

function removeSentAnonymousUsage(sentState) {
  const latest = getAnonymousUsage();
  Object.entries(sentState.days || {}).forEach(([date, sentDay]) => {
    const currentDay = latest.days[date];
    if (!currentDay) return;
    ["events", "levels", "topics"].forEach((group) => {
      const currentValues = currentDay[group] && typeof currentDay[group] === "object" ? currentDay[group] : {};
      Object.entries((sentDay && sentDay[group]) || {}).forEach(([key, sentCount]) => {
        const remaining = Math.max(0, Number(currentValues[key] || 0) - Number(sentCount || 0));
        if (remaining) currentValues[key] = remaining;
        else delete currentValues[key];
      });
      currentDay[group] = currentValues;
    });
    const hasValues = ["events", "levels", "topics"].some((group) => Object.keys(currentDay[group]).length);
    if (!hasValues) delete latest.days[date];
  });
  if (Object.keys(latest.days).length) set(LS.anonymousUsage, JSON.stringify(latest));
  else removeStored(LS.anonymousUsage);
}

function recordAnonymousEvent(name, details = {}) {
  if (!getBool(LS.anonymousUsageConsent, false) || !ANONYMOUS_EVENTS.has(name)) return;
  const state = getAnonymousUsage();
  const key = localDateKey(new Date());
  const savedDay = state.days[key] && typeof state.days[key] === "object" ? state.days[key] : {};
  const day = {
    events: savedDay.events && typeof savedDay.events === "object" ? savedDay.events : {},
    levels: savedDay.levels && typeof savedDay.levels === "object" ? savedDay.levels : {},
    topics: savedDay.topics && typeof savedDay.topics === "object" ? savedDay.topics : {},
  };
  day.events[name] = Math.min(100000, Number(day.events[name] || 0) + 1);
  const level = Math.round(Number(details.level));
  if (level >= 1 && level <= 10) day.levels[level] = Math.min(100000, Number(day.levels[level] || 0) + 1);
  if (TOPIC_POOL && TOPIC_POOL.includes(details.topic)) {
    day.topics[details.topic] = Math.min(100000, Number(day.topics[details.topic] || 0) + 1);
  }
  state.days[key] = day;
  const retained = Object.keys(state.days).sort().slice(-ANALYTICS_DAY_LIMIT);
  state.days = Object.fromEntries(retained.map((date) => [date, state.days[date]]));
  set(LS.anonymousUsage, JSON.stringify(state));
  scheduleAnonymousUsageFlush();
}

let anonymousUsageFlushTimer = null;
let anonymousUsageFlushPromise = null;
function scheduleAnonymousUsageFlush() {
  clearTimeout(anonymousUsageFlushTimer);
  anonymousUsageFlushTimer = setTimeout(() => flushAnonymousUsage().catch(() => {}), 2500);
}

async function flushAnonymousUsage() {
  if (anonymousUsageFlushPromise) return anonymousUsageFlushPromise;
  if (!getBool(LS.anonymousUsageConsent, false)) return { sent: false, reason: "disabled" };
  const state = getAnonymousUsage();
  if (!Object.keys(state.days).length) return { sent: false, reason: "empty" };
  anonymousUsageFlushPromise = (async () => {
    const config = await loadRuntimeConfig();
    if (!config.analyticsEndpoint) return { sent: false, reason: "unconfigured" };
    const response = await fetch(config.analyticsEndpoint, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schemaVersion: 1,
        anonymousInstallId: getAnonymousInstallId(),
        appVersion: APP_VERSION,
        days: state.days,
      }),
    });
    if (!response.ok) throw new Error(`analytics ${response.status}`);
    removeSentAnonymousUsage(state);
    return { sent: true };
  })().finally(() => { anonymousUsageFlushPromise = null; });
  return anonymousUsageFlushPromise;
}

function getStoryReportQueue() {
  try {
    const parsed = JSON.parse(get(LS.reportQueue, "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (!item || typeof item.queueId !== "string" || item.queueId.length > 100 || !item.report || typeof item.report !== "object") return null;
      const report = item.report;
      const createdAt = new Date(report.createdAt);
      const issueType = typeof report.issueType === "string" && hasOwn(REPORT_REASONS, report.issueType) ? report.issueType : "other";
      const level = Math.min(10, Math.max(1, Math.round(Number(report.level) || 5)));
      return {
        queueId: item.queueId,
        report: {
          app: "Reading Lamp",
          appVersion: String(report.appVersion || APP_VERSION).slice(0, 30),
          createdAt: Number.isFinite(createdAt.getTime()) ? createdAt.toISOString() : new Date().toISOString(),
          storyId: String(report.storyId || "AI-generated").slice(0, 80),
          title: String(report.title || "").slice(0, 300),
          topic: String(report.topic || "").slice(0, 100),
          level,
          issueType,
          issueLabel: REPORT_REASONS[issueType],
          note: String(report.note || "").slice(0, 500),
        },
      };
    }).filter(Boolean).slice(0, REPORT_QUEUE_LIMIT);
  } catch {
    return [];
  }
}

function saveStoryReportQueue(queue) {
  return set(LS.reportQueue, JSON.stringify(queue.slice(0, REPORT_QUEUE_LIMIT)));
}

function queueStoryReport(report) {
  const queue = getStoryReportQueue();
  const queueId = window.crypto && typeof window.crypto.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `report-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  queue.unshift({ queueId, report });
  return { saved: saveStoryReportQueue(queue), queueId };
}

let reportFlushPromise = null;
async function flushStoryReports() {
  if (reportFlushPromise) return reportFlushPromise;
  reportFlushPromise = (async () => {
    const config = await loadRuntimeConfig();
    let queue = getStoryReportQueue();
    if (!queue.length) return { sent: 0, pending: 0, reason: "empty" };
    if (!config.storyReportEndpoint) return { sent: 0, pending: queue.length, reason: "unconfigured" };
    let sent = 0;
    for (const item of [...queue].reverse()) {
      try {
        const response = await fetch(config.storyReportEndpoint, {
          method: "POST",
          credentials: "omit",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ schemaVersion: 1, queueId: item.queueId, report: item.report }),
        });
        if (!response.ok) break;
        queue = queue.filter((queued) => queued.queueId !== item.queueId);
        saveStoryReportQueue(queue);
        sent += 1;
      } catch {
        break;
      }
    }
    return { sent, pending: queue.length, reason: queue.length ? "network" : "sent" };
  })().finally(() => { reportFlushPromise = null; });
  return reportFlushPromise;
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
        ? `次からレベル ${after} に下げます。`
        : "現在はレベル1です。難しい文章は別の文章に替えてください。",
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
const weeklyGoalDaysInput = document.getElementById("weeklyGoalDaysInput");
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
const showRewardGoalsInput = document.getElementById("showRewardGoalsInput");
const rewardNotificationsInput = document.getElementById("rewardNotificationsInput");
const personalizedSuggestionsInput = document.getElementById("personalizedSuggestionsInput");
const anonymousUsageInput = document.getElementById("anonymousUsageInput");
const anonymousUsageStatus = document.getElementById("anonymousUsageStatus");

async function renderAnonymousUsageStatus() {
  if (!anonymousUsageInput.checked) {
    anonymousUsageStatus.textContent = "オフです。匿名IDや利用集計は保存・送信しません。";
    return;
  }
  const config = await loadRuntimeConfig();
  const days = Object.keys(getAnonymousUsage().days).length;
  anonymousUsageStatus.textContent = config.analyticsEndpoint
    ? `オンです。個人を特定しない日別集計を自動送信します${days ? `（未送信${days}日分）` : ""}。`
    : `オンです。現在は送信先未設定のため端末内だけに保存します${days ? `（${days}日分）` : ""}。`;
}

async function renderReportQueueStatus(lastResult = null) {
  const queue = getStoryReportQueue();
  const config = await loadRuntimeConfig();
  const status = document.getElementById("reportQueueStatus");
  const retry = document.getElementById("retryReportsBtn");
  const exportButton = document.getElementById("exportQueuedReportsBtn");
  retry.disabled = queue.length === 0 || !config.storyReportEndpoint;
  exportButton.disabled = queue.length === 0;
  if (!queue.length) {
    status.textContent = lastResult && lastResult.sent ? `${lastResult.sent}件を送信しました。未送信の報告はありません。` : "未送信の報告はありません。";
  } else if (!config.storyReportEndpoint) {
    status.textContent = `${queue.length}件を端末内に保存しています。公開時に送信先を設定すると再送できます。`;
  } else if (lastResult && lastResult.reason === "network") {
    status.textContent = `${queue.length}件が未送信です。オンライン時にもう一度送信します。`;
  } else {
    status.textContent = `${queue.length}件が送信待ちです。`;
  }
}

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
    ? "収録済みの文章を読みます。AIのAPI利用料はかかりません。端末に保存後はオフラインでも読めます。"
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
  weeklyGoalDaysInput.value = String(getWeeklyGoalDays());
  toggleOfflineBank.checked = usingOfflineBank();
  const displaySettings = getReadingDisplaySettings();
  readingFontSizeInput.value = String(displaySettings.fontSize);
  readingLineHeightInput.value = String(displaySettings.lineHeight);
  readingFontFamilyInput.value = displaySettings.fontFamily;
  readingThemeInput.value = displaySettings.theme;
  showRewardGoalsInput.checked = getBool(LS.showRewardGoals, true);
  rewardNotificationsInput.checked = getBool(LS.rewardNotifications, true);
  personalizedSuggestionsInput.checked = getBool(LS.personalizedSuggestions, true);
  anonymousUsageInput.checked = getBool(LS.anonymousUsageConsent, false);
  syncSettingsMode(toggleOfflineBank.checked);
  renderApiKeyStatus();
  renderHistoryRecovery();
  renderReportQueueStatus();
  renderBackupStatus();
  settingsStatus.textContent = "";
  updateRangeAccessibility();
  updateReadingDisplayPreview();
  renderAnonymousUsageStatus();
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
anonymousUsageInput.addEventListener("change", renderAnonymousUsageStatus);

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
  const okWeeklyGoal = set(LS.weeklyGoalDays, String(Math.min(7, Math.max(1, parseInt(weeklyGoalDaysInput.value, 10) || 3))));
  const ok8 = set(LS.offlineBank, toggleOfflineBank.checked ? "1" : "0");
  const displaySettings = displaySettingsFromControls();
  const ok9 = set(LS.readingFontSize, String(displaySettings.fontSize));
  const ok10 = set(LS.readingLineHeight, String(displaySettings.lineHeight));
  const ok11 = set(LS.readingFontFamily, displaySettings.fontFamily);
  const ok12 = set(LS.readingTheme, displaySettings.theme);
  const okRewardGoals = set(LS.showRewardGoals, showRewardGoalsInput.checked ? "1" : "0");
  const okRewardNotifications = set(LS.rewardNotifications, rewardNotificationsInput.checked ? "1" : "0");
  const okPersonalizedSuggestions = set(LS.personalizedSuggestions, personalizedSuggestionsInput.checked ? "1" : "0");
  const previousAnonymousUsage = getBool(LS.anonymousUsageConsent, false);
  const okAnonymousUsage = set(LS.anonymousUsageConsent, anonymousUsageInput.checked ? "1" : "0");

  if (!anonymousUsageInput.checked) {
    removeStored(LS.anonymousUsage);
    removeStored(LS.anonymousInstallId);
  } else if (!previousAnonymousUsage) {
    recordAnonymousEvent("app_open");
    flushAnonymousUsage().catch(() => {});
  }

  if (!rewardNotificationsInput.checked) {
    rewardNotificationQueue.length = 0;
    document.getElementById("rewardToast").hidden = true;
  }

  applyReadingDisplay(displaySettings);

  if (okApiKey && ok2 && okSignals && ok3 && ok4 && okWeeklyGoal && ok8 && ok9 && ok10 && ok11 && ok12 && okRewardGoals && okRewardNotifications && okPersonalizedSuggestions && okAnonymousUsage) {
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
  if (confirm("読書履歴と既読判定を消去します。お気に入りと獲得済みリワードは残ります。よろしいですか？")) {
    try { localStorage.removeItem(LS.history); } catch {}
    delete memoryFallback[LS.history];
    removeStored(LS.historyRecovery);
    removeStored(LS.seenStoryIds);
    removeStored(LS.lastBackupAt);
    removeStored(LS.firstCompletionGuideSeen);
    renderHome();
    closeSettings();
  }
});

function lastBackupDate() {
  const date = new Date(get(LS.lastBackupAt, ""));
  return Number.isFinite(date.getTime()) ? date : null;
}

function backupReminderState(history = getHistory(), now = new Date(), lastBackup = lastBackupDate()) {
  const completed = history.filter((entry) => !entry.abandoned && Number(entry.words) > 0);
  if (!completed.length) return { due: false, lastBackup, message: "読書記録はまだありません。" };
  if (lastBackup) {
    const daysAgo = Math.max(0, Math.floor((now - lastBackup) / 86400000));
    const newReadings = completed.filter((entry) => new Date(entry.date) > lastBackup).length;
    return {
      due: daysAgo >= 30 || newReadings >= 10,
      lastBackup,
      message: `${daysAgo === 0 ? "今日バックアップしました" : `最終バックアップ：${daysAgo}日前`}${newReadings ? `・その後${newReadings}篇を読了` : ""}。`,
    };
  }
  const oldest = completed.reduce((earliest, entry) => {
    const time = new Date(entry.date).getTime();
    return Number.isFinite(time) ? Math.min(earliest, time) : earliest;
  }, now.getTime());
  const readingSpanDays = Math.max(0, Math.floor((now.getTime() - oldest) / 86400000));
  return {
    due: completed.length >= 10 || (completed.length >= 3 && readingSpanDays >= 14),
    lastBackup: null,
    message: "バックアップはまだありません。JSONを保存すると、別の端末でも記録を復元できます。",
  };
}

function returningReaderState(history = getHistory(), now = new Date()) {
  const thresholdDays = 14;
  const completedTimes = history
    .filter((entry) => !entry.abandoned && Number(entry.words) > 0)
    .map((entry) => new Date(entry.date).getTime())
    .filter(Number.isFinite);
  if (!completedTimes.length) return { returning: false, daysAway: 0, thresholdDays };
  const latestCompletedAt = Math.max(...completedTimes);
  const daysAway = Math.max(0, Math.floor((now.getTime() - latestCompletedAt) / 86400000));
  return { returning: daysAway >= thresholdDays, daysAway, thresholdDays };
}

function renderBackupStatus(history = getHistory()) {
  const backup = backupReminderState(history);
  const status = document.getElementById("backupStatus");
  const reminder = document.getElementById("backupReminder");
  if (status) status.textContent = backup.message;
  if (reminder) {
    reminder.hidden = !backup.due;
    document.getElementById("backupReminderMessage").textContent = backup.lastBackup
      ? `${backup.message} 追加した記録を含めて再保存できます。`
      : "読書記録、お気に入り、リワードをJSONとして保存できます。";
  }
}

document.getElementById("openBackupSettingsBtn").addEventListener("click", () => {
  openSettings();
  requestAnimationFrame(() => {
    const exportButton = document.getElementById("exportBtn");
    exportButton.focus();
    exportButton.scrollIntoView({ block: "center" });
  });
});

function beginFileDownload(blob, filename) {
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } catch (error) {
    link.remove();
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
  // Give mobile browsers time to consume the Blob URL before releasing it.
  setTimeout(() => { link.remove(); URL.revokeObjectURL(objectUrl); }, 60000);
}

let pendingBackupAt = null;
const confirmBackupBtn = document.getElementById("confirmBackupBtn");
const shareBackupBtn = document.getElementById("shareBackupBtn");

function createBackupPackage() {
  const exportedAt = new Date().toISOString();
  return {
    schemaVersion: 5,
    exportedAt,
    history: getHistory(),
    favoriteStoryIds: getFavoriteIds(),
    seenStoryIds: [...getSeenIds()],
    rewardState: getRewardState(),
  };
}

function backupFilename(backup) {
  return `reading-lamp-backup-${backup.exportedAt.slice(0, 10)}.json`;
}

function offerBackupConfirmation(exportedAt) {
  pendingBackupAt = exportedAt;
  confirmBackupBtn.hidden = false;
  settingsStatus.textContent = "ファイルへの保存を確認したら、下のボタンを押してください。";
}

document.getElementById("exportBtn").addEventListener("click", () => {
  const backup = createBackupPackage();
  try {
    beginFileDownload(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }), backupFilename(backup));
    offerBackupConfirmation(backup.exportedAt);
  } catch {
    settingsStatus.textContent = "ダウンロードを開始できませんでした。共有を試してください。";
  }
});

function canShareBackupFile() {
  if (typeof File === "undefined" || typeof navigator.canShare !== "function" || typeof navigator.share !== "function") return false;
  try {
    return navigator.canShare({ files: [new File(["{}"], "reading-lamp-test.json", { type: "application/json" })] });
  } catch { return false; }
}

shareBackupBtn.hidden = !canShareBackupFile();
shareBackupBtn.addEventListener("click", async () => {
  const backup = createBackupPackage();
  const file = new File([JSON.stringify(backup, null, 2)], backupFilename(backup), { type: "application/json" });
  try {
    // Called immediately from the click handler so Web Share retains user activation.
    await navigator.share({ files: [file], title: "Reading Lampのバックアップ" });
    offerBackupConfirmation(backup.exportedAt);
  } catch {
    settingsStatus.textContent = "ファイルを共有できませんでした。ダウンロードを試してください。";
  }
});

confirmBackupBtn.addEventListener("click", () => {
  if (!pendingBackupAt) return;
  const saved = set(LS.lastBackupAt, pendingBackupAt);
  pendingBackupAt = null;
  confirmBackupBtn.hidden = true;
  renderBackupStatus();
  settingsStatus.textContent = saved
    ? "ファイルを確認しました。端末の外にも保管してください。"
    : "保存時刻を端末に記録できませんでした。ファイルは保管してください。";
});

document.getElementById("exportRewardDiagnosticsBtn").addEventListener("click", async () => {
  try {
    const definitions = await loadRewards();
    const state = getRewardState();
    const metrics = rewardMetrics();
    const categories = Object.keys(REWARD_CATEGORY_LABELS).map((category) => {
      const categoryRewards = definitions.filter((reward) => reward.category === category);
      return {
        category,
        total: categoryRewards.length,
        earned: categoryRewards.filter((reward) => hasOwn(state.earned, reward.id)).length,
      };
    });
    const diagnostic = {
      schemaVersion: 1,
      appVersion: APP_VERSION,
      generatedAt: new Date().toISOString(),
      privacy: "No story titles, story IDs, reading timestamps, notes, or API keys are included.",
      corpus: { stories: 2000, rewardDefinitions: definitions.length },
      preferences: {
        goalsVisible: getBool(LS.showRewardGoals, true),
        notificationsEnabled: getBool(LS.rewardNotifications, true),
        hasPinnedGoal: Boolean(validPinnedReward(definitions, state)),
      },
      totals: {
        words: metrics.totalWords,
        completedStories: metrics.completedStories,
        readingDays: metrics.readingDays,
        topicsExplored: metrics.topicsExplored,
        levelsExplored: metrics.levelsExplored,
        healthySkips: metrics.healthySkips,
        favorites: metrics.favorites,
        rewardsEarned: definitions.filter((reward) => hasOwn(state.earned, reward.id)).length,
      },
      categories,
      rewards: definitions.map((reward) => ({
        id: reward.id,
        category: reward.category,
        earned: hasOwn(state.earned, reward.id),
        suppressed: state.suppressed.includes(reward.id),
        progressPercent: Math.min(100, Math.round((Number(metrics[reward.metric] || 0) / Number(reward.threshold)) * 100)),
      })),
    };
    const blob = new Blob([JSON.stringify(diagnostic, null, 2)], { type: "application/json" });
    beginFileDownload(blob, `reading-lamp-reward-diagnostic-${new Date().toISOString().slice(0, 10)}.json`);
    settingsStatus.textContent = "匿名のリワード診断のダウンロードを開始しました。自動送信はしていません。";
  } catch {
    showError("リワード診断を作成できませんでした。アプリを更新して、もう一度お試しください。");
  }
});

document.getElementById("retryReportsBtn").addEventListener("click", async () => {
  settingsStatus.textContent = "文章報告を送信しています…";
  try {
    const result = await flushStoryReports();
    await renderReportQueueStatus(result);
    settingsStatus.textContent = result.sent
      ? `${result.sent}件の文章報告を送信しました。`
      : result.reason === "unconfigured"
        ? "自動送信先は未設定です。必要なら「報告を保存」を利用してください。"
        : "送信できませんでした。未送信データは端末内に残しています。";
  } catch {
    settingsStatus.textContent = "送信を確認できませんでした。未送信データは端末内に残しています。";
  }
});

document.getElementById("exportQueuedReportsBtn").addEventListener("click", () => {
  const reports = getStoryReportQueue();
  if (!reports.length) return;
  const blob = new Blob([JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), reports }, null, 2)], { type: "application/json" });
  beginFileDownload(blob, `reading-lamp-pending-reports-${new Date().toISOString().slice(0, 10)}.json`);
  settingsStatus.textContent = `${reports.length}件の未送信報告のダウンロードを開始しました。`;
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

function seenIdsFromBackup(parsed, importedHistory) {
  if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.seenStoryIds)) {
    return validSeenStoryIds(parsed.seenStoryIds);
  }
  // Older backups contained history but not the independent per-pool seen state.
  return validSeenStoryIds(importedHistory.filter((entry) => !entry.abandoned).map((entry) => entry.storyId));
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
  beginFileDownload(blob, `reading-lamp-recovery-${recovery.createdAt.slice(0, 10)}.json`);
  settingsStatus.textContent = "修復前データのダウンロードを開始しました。ファイルを確認してから削除してください。";
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
    const importedSeen = seenIdsFromBackup(parsed, imported);
    const importedFavorites = parsed && !Array.isArray(parsed) && Array.isArray(parsed.favoriteStoryIds)
      ? [...new Set(parsed.favoriteStoryIds.filter((id) => typeof id === "string" && /^s\d{3,}$/.test(id)))].slice(0, 500)
      : [];
    const rewardDefinitions = await loadRewards().catch(() => []);
    const validRewardIds = new Set(rewardDefinitions.map((reward) => reward.id));
    const importedRewardState = parsed && !Array.isArray(parsed) && parsed.rewardState && typeof parsed.rewardState === "object"
      ? parsed.rewardState
      : null;
    const importedEarned = {};
    if (importedRewardState && importedRewardState.earned && typeof importedRewardState.earned === "object") {
      Object.entries(importedRewardState.earned).forEach(([id, timestamp]) => {
        const normalized = normalizeRewardTimestamp(timestamp);
        if (validRewardIds.has(id) && normalized) importedEarned[id] = normalized;
      });
    }
    const importedSuppressed = importedRewardState && Array.isArray(importedRewardState.suppressed)
      ? [...new Set(importedRewardState.suppressed.filter((id) => validRewardIds.has(id)))].slice(0, 200)
      : [];
    const importedSeenPrizes = importedRewardState && Array.isArray(importedRewardState.seenPrizes)
      ? [...new Set(importedRewardState.seenPrizes.filter((styleId) => hasOwn(LAMP_STYLES, styleId) && styleId !== "classic"))]
      : Object.entries(LAMP_STYLES)
          .filter(([, style]) => style.rewardId && hasOwn(importedEarned, style.rewardId))
          .map(([styleId]) => styleId);
    if (!imported.length && !importedFavorites.length && !importedSeen.length && !Object.keys(importedEarned).length) throw new Error("no valid backup entries");
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
    const currentSeen = getSeenIds();
    const mergedSeen = validSeenStoryIds([...currentSeen, ...importedSeen]);
    const seenAddedCount = mergedSeen.filter((id) => !currentSeen.has(id)).length;
    const currentRewardState = getRewardState();
    const rewardAddedIds = Object.keys(importedEarned).filter((id) => !hasOwn(currentRewardState.earned, id));
    const mergedEarned = { ...importedEarned, ...currentRewardState.earned };
    const mergedSuppressed = [...new Set([...currentRewardState.suppressed, ...importedSuppressed])]
      .filter((id) => !hasOwn(mergedEarned, id))
      .slice(0, 200);
    const suppressionChanged = mergedSuppressed.length !== currentRewardState.suppressed.length ||
      mergedSuppressed.some((id) => !currentRewardState.suppressed.includes(id));
    const importedLamp = importedRewardState && hasOwn(LAMP_STYLES, importedRewardState.equippedLamp)
      ? importedRewardState.equippedLamp
      : "classic";
    const mergedRewardState = {
      ...currentRewardState,
      initialized: true,
      earned: mergedEarned,
      suppressed: mergedSuppressed,
      equippedLamp: isLampStyleUnlocked(importedLamp, { ...currentRewardState, earned: mergedEarned })
        ? importedLamp
        : currentRewardState.equippedLamp,
      seenPrizes: [...new Set([...(currentRewardState.seenPrizes || []), ...importedSeenPrizes])],
    };
    const lampChanged = mergedRewardState.equippedLamp !== currentRewardState.equippedLamp;
    if (!restoredCount && !favoriteAddedCount && !seenAddedCount && !rewardAddedIds.length && !lampChanged && !suppressionChanged) {
      settingsStatus.textContent = "すべて既に復元済みです。重複するデータは追加しませんでした。";
      return;
    }
    const confirmationParts = [];
    if (restoredCount) confirmationParts.push(`記録${restoredCount}件`);
    if (favoriteAddedCount) confirmationParts.push(`お気に入り${favoriteAddedCount}篇`);
    if (seenAddedCount) confirmationParts.push(`既読判定${seenAddedCount}篇`);
    if (rewardAddedIds.length) confirmationParts.push(`リワード${rewardAddedIds.length}個`);
    if (lampChanged) confirmationParts.push("灯りカラー");
    if (suppressionChanged) confirmationParts.push("リワード設定");
    if (!confirm(`${confirmationParts.join("と")}を、現在のデータに追加します。よろしいですか？`)) return;
    const historySaved = restoredCount ? writeHistory(merged) : true;
    const favoritesSaved = favoriteAddedCount ? saveFavoriteIds(mergedFavorites) : true;
    const seenSaved = seenAddedCount ? set(LS.seenStoryIds, JSON.stringify(mergedSeen)) : true;
    const rewardsSaved = rewardAddedIds.length || lampChanged || suppressionChanged ? saveRewardState(mergedRewardState) : true;
    if (rewardAddedIds.length || lampChanged || suppressionChanged) applyEquippedLampStyle(mergedRewardState);
    renderHome();
    evaluateRewards({ notify: false });
    const omittedNote = omittedCount ? ` 古い${omittedCount}件は保存上限のため除外しました。` : "";
    settingsStatus.textContent = historySaved && favoritesSaved && seenSaved && rewardsSaved
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
  renderStoryCandidates();
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

function isValidWpmEntry(h) {
  const wpm = Number(h.wpm);
  if (h.abandoned || h.wpmValid === false || wpm < 10 || wpm > 600 || !Number.isFinite(wpm)) return false;
  if (!Object.prototype.hasOwnProperty.call(h, "activeSeconds")) return true;
  const seconds = Number(h.activeSeconds);
  const words = Number(h.words);
  const measured = words / (seconds / 60);
  return seconds >= 10 && Number.isFinite(measured) && measured >= 10 && measured <= 600;
}

function combinedWpm(entries) {
  const withWpm = entries.filter(isValidWpmEntry);
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
    getHistory().filter(isValidWpmEntry).slice(0, 5)
  );
}

function computeStreak(history = getHistory(), now = new Date()) {
  const days = new Set(history.map((h) => new Date(h.date).toDateString()));
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date(now);
  // Today not yet read still keeps yesterday's streak alive.
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function wordsToday(history = getHistory(), now = new Date()) {
  const today = new Date(now).toDateString();
  return history
    .filter((h) => new Date(h.date).toDateString() === today)
    .reduce((s, h) => s + (h.words || 0), 0);
}

function getWeeklyGoalDays() {
  return Math.min(7, Math.max(1, Math.round(getNum(LS.weeklyGoalDays, 3))));
}

function localDateKey(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function weeklyReadingRhythm(history = getHistory(), now = new Date(), goal = getWeeklyGoalDays()) {
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const monday = new Date(today);
  const dayIndex = (today.getDay() + 6) % 7;
  monday.setDate(today.getDate() - dayIndex);

  const completedDays = new Set(
    history
      .filter((entry) => !entry.abandoned && Number(entry.words) > 0)
      .map((entry) => localDateKey(entry.date))
  );
  const labels = ["月", "火", "水", "木", "金", "土", "日"];
  const days = labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const key = localDateKey(date);
    return {
      label,
      key,
      date,
      read: completedDays.has(key),
      today: index === dayIndex,
      future: index > dayIndex,
    };
  });
  const completed = days.filter((day) => day.read).length;
  return {
    goal: Math.min(7, Math.max(1, Math.round(Number(goal) || 3))),
    completed,
    remaining: Math.max(0, Math.min(7, Math.round(Number(goal) || 3)) - completed),
    daysLeft: 7 - dayIndex,
    todayRead: days[dayIndex].read,
    days,
  };
}

function weeklyRhythmMessage(rhythm) {
  if (rhythm.completed >= rhythm.goal) {
    return "今週の目標日数を達成しました。";
  }
  if (rhythm.todayRead) {
    return `今日は読了済みです。目標まであと${rhythm.remaining}日。`;
  }
  if (rhythm.daysLeft < rhythm.remaining) {
    return "今週の残り日数では目標に届きません。来週からまた数えます。";
  }
  if (rhythm.completed === 0) {
    return "今週はまだ読了記録がありません。";
  }
  return `目標まであと${rhythm.remaining}日。日曜までの都合のよい日に読めます。`;
}

function renderWeeklyRhythm(history) {
  const rhythm = weeklyReadingRhythm(history);
  const container = document.getElementById("weeklyRhythmDays");
  document.getElementById("weeklyRhythmCount").textContent = `${rhythm.completed} / ${rhythm.goal}日`;
  document.getElementById("weeklyRhythmMessage").textContent = weeklyRhythmMessage(rhythm);
  container.innerHTML = "";

  rhythm.days.forEach((day) => {
    const item = document.createElement("span");
    item.className = `weekly-rhythm-day${day.read ? " is-read" : ""}${day.today ? " is-today" : ""}${day.future ? " is-future" : ""}`;
    item.setAttribute("role", "listitem");
    item.setAttribute("aria-label", `${day.label}曜日、${day.read ? "読書済み" : day.future ? "これから" : "記録なし"}${day.today ? "、今日" : ""}`);

    const label = document.createElement("span");
    label.textContent = day.label;
    const dot = document.createElement("span");
    dot.className = "weekly-rhythm-dot";
    dot.textContent = day.read ? "✓" : "·";
    dot.setAttribute("aria-hidden", "true");
    item.append(label, dot);
    container.appendChild(item);
  });
}

// ---------------------- Rewards ----------------------

const REWARD_STATE_VERSION = 1;
const REWARD_CATEGORY_LABELS = {
  words: "累計語数",
  stories: "読了篇数",
  rhythm: "読書リズム",
  exploration: "ジャンル・レベル",
  comeback: "再開",
  habits: "読書スタイル",
  collection: "お気に入り",
};
const LAMP_STYLES = {
  classic: { label: "Classic", color: "#E3A857", rewardId: null },
  ember: { label: "Ember", color: "#F08A5D", rewardId: "words-5000" },
  ocean: { label: "Ocean", color: "#67C4D8", rewardId: "words-25000" },
  forest: { label: "Forest", color: "#8FC08A", rewardId: "words-100000" },
  violet: { label: "Violet", color: "#B39DDB", rewardId: "words-200000" },
  dawn: { label: "Dawn", color: "#F1B2A0", rewardId: "words-500000" },
  moon: { label: "Moon", color: "#C5D5F2", rewardId: "words-1000000" },
  prism: { label: "Prism", color: "#D6B4F0", rewardId: "topics-10" },
  rose: { label: "Rose", color: "#E89AAA", rewardId: "stories-10" },
  mint: { label: "Mint", color: "#8FD8C2", rewardId: "days-7" },
  gold: { label: "Gold", color: "#F2C35B", rewardId: "weeks-4" },
  sky: { label: "Sky", color: "#82B8E8", rewardId: "levels-5" },
  copper: { label: "Copper", color: "#D18D64", rewardId: "stories-100" },
  sakura: { label: "Sakura", color: "#F3B6C6", rewardId: "favorites-10" },
  teal: { label: "Teal", color: "#55B6AC", rewardId: "short-reads-5" },
  silver: { label: "Silver", color: "#B8C2D1", rewardId: "days-100" },
};
let REWARD_DEFINITIONS = null;
let rewardLoadPromise = null;
let rewardEvaluationChain = Promise.resolve();
const rewardNotificationQueue = [];

function normalizeRewardTimestamp(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function getRewardState() {
  const empty = { version: REWARD_STATE_VERSION, initialized: false, earned: {}, suppressed: [], equippedLamp: "classic", seenPrizes: [] };
  try {
    const parsed = JSON.parse(get(LS.rewards, "null"));
    if (!parsed || parsed.version !== REWARD_STATE_VERSION || typeof parsed !== "object") return empty;
    const earned = {};
    if (parsed.earned && typeof parsed.earned === "object" && !Array.isArray(parsed.earned)) {
      Object.entries(parsed.earned).forEach(([id, timestamp]) => {
        if (!/^[a-z0-9-]{1,80}$/.test(id)) return;
        const normalized = normalizeRewardTimestamp(timestamp);
        if (normalized) earned[id] = normalized;
      });
    }
    const suppressed = Array.isArray(parsed.suppressed)
      ? [...new Set(parsed.suppressed.filter((id) => typeof id === "string" && /^[a-z0-9-]{1,80}$/.test(id)))].slice(0, 200)
      : [];
    const equippedLamp = hasOwn(LAMP_STYLES, parsed.equippedLamp) ? parsed.equippedLamp : "classic";
    const earnedStyleIds = Object.entries(LAMP_STYLES)
      .filter(([, style]) => style.rewardId && hasOwn(earned, style.rewardId))
      .map(([styleId]) => styleId);
    const seenPrizes = Array.isArray(parsed.seenPrizes)
      ? [...new Set(parsed.seenPrizes.filter((styleId) => hasOwn(LAMP_STYLES, styleId) && styleId !== "classic"))]
      : earnedStyleIds;
    return { version: REWARD_STATE_VERSION, initialized: parsed.initialized === true, earned, suppressed, equippedLamp, seenPrizes };
  } catch {
    return empty;
  }
}

function saveRewardState(state) {
  return set(LS.rewards, JSON.stringify({
    version: REWARD_STATE_VERSION,
    initialized: state.initialized === true,
    earned: state.earned || {},
    suppressed: Array.isArray(state.suppressed) ? state.suppressed.slice(0, 200) : [],
    equippedLamp: hasOwn(LAMP_STYLES, state.equippedLamp) ? state.equippedLamp : "classic",
    seenPrizes: Array.isArray(state.seenPrizes)
      ? [...new Set(state.seenPrizes.filter((styleId) => hasOwn(LAMP_STYLES, styleId) && styleId !== "classic"))]
      : [],
  }));
}

function isLampStyleUnlocked(styleId, state = getRewardState()) {
  const style = LAMP_STYLES[styleId];
  return Boolean(style && (!style.rewardId || hasOwn(state.earned, style.rewardId)));
}

function applyEquippedLampStyle(state = getRewardState()) {
  const styleId = isLampStyleUnlocked(state.equippedLamp, state) ? state.equippedLamp : "classic";
  if (styleId === "classic") document.body.removeAttribute("data-lamp-style");
  else document.body.setAttribute("data-lamp-style", styleId);
  if (state.equippedLamp !== styleId) {
    state.equippedLamp = styleId;
    saveRewardState(state);
  }
}

async function loadRewards() {
  if (REWARD_DEFINITIONS) return REWARD_DEFINITIONS;
  if (rewardLoadPromise) return rewardLoadPromise;
  rewardLoadPromise = fetch("rewards.json")
    .then((response) => {
      if (!response.ok) throw new Error("rewards.json " + response.status);
      return response.json();
    })
    .then((definitions) => {
      if (!Array.isArray(definitions) || !definitions.length) throw new Error("rewards.json is empty");
      const seen = new Set();
      REWARD_DEFINITIONS = definitions.map((reward) => {
        if (!reward || typeof reward.id !== "string" || !/^[a-z0-9-]{1,80}$/.test(reward.id) || seen.has(reward.id)) {
          throw new Error("invalid reward id");
        }
        if (!hasOwn(REWARD_CATEGORY_LABELS, reward.category) || typeof reward.metric !== "string") throw new Error("invalid reward category");
        if (!Number.isFinite(Number(reward.threshold)) || Number(reward.threshold) <= 0) throw new Error("invalid reward threshold");
        if (typeof reward.title !== "string" || !reward.title.trim() || typeof reward.description !== "string") throw new Error("invalid reward text");
        seen.add(reward.id);
        return reward;
      });
      return REWARD_DEFINITIONS;
    })
    .catch((error) => {
      rewardLoadPromise = null;
      throw error;
    });
  return rewardLoadPromise;
}

function rewardWeekKey(value) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  const dayIndex = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayIndex);
  return localDateKey(date);
}

function rewardMetrics(history = getHistory()) {
  const completed = history.filter((entry) => !entry.abandoned && Number(entry.words) > 0);
  const readingDayKeys = [...new Set(completed.map((entry) => localDateKey(entry.date)))].sort();
  let longestStreak = 0;
  let currentStreak = 0;
  let previousDay = null;
  let returnGapDays = 0;
  readingDayKeys.forEach((key) => {
    const day = new Date(`${key}T12:00:00`);
    if (!previousDay) {
      currentStreak = 1;
    } else {
      const gap = Math.round((day - previousDay) / 86400000);
      currentStreak = gap === 1 ? currentStreak + 1 : 1;
      returnGapDays = Math.max(returnGapDays, gap);
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    previousDay = day;
  });

  const weekDays = new Map();
  completed.forEach((entry) => {
    const week = rewardWeekKey(entry.date);
    if (!weekDays.has(week)) weekDays.set(week, new Set());
    weekDays.get(week).add(localDateKey(entry.date));
  });
  const knownTopics = new Set(completed.map((entry) => entry.topic).filter((topic) => TOPIC_POOL.includes(topic)));
  const levels = new Set(completed.map((entry) => Math.round(Number(entry.level))).filter((level) => level >= 1 && level <= 10));
  const metrics = {
    totalWords: completed.reduce((sum, entry) => sum + Number(entry.words || 0), 0),
    completedStories: completed.length,
    readingDays: readingDayKeys.length,
    longestStreak,
    threeDayWeeks: [...weekDays.values()].filter((days) => days.size >= 3).length,
    sevenDayWeeks: [...weekDays.values()].filter((days) => days.size >= 7).length,
    topicsExplored: knownTopics.size,
    levelsExplored: levels.size,
    returnGapDays,
    shortReads: completed.filter((entry) => Number(entry.words) <= 120).length,
    earlyReads: completed.filter((entry) => { const hour = new Date(entry.date).getHours(); return hour >= 4 && hour < 10; }).length,
    nightReads: completed.filter((entry) => { const hour = new Date(entry.date).getHours(); return hour >= 21 || hour < 4; }).length,
    weekendReads: completed.filter((entry) => { const day = new Date(entry.date).getDay(); return day === 0 || day === 6; }).length,
    healthySkips: history.filter((entry) => entry.abandoned).length,
    favorites: getFavoriteIds().length,
  };
  TOPIC_POOL.forEach((topic) => { metrics[`topic:${topic}`] = knownTopics.has(topic) ? 1 : 0; });
  return metrics;
}

function weeklySummaryData(history = getHistory(), state = getRewardState(), now = new Date()) {
  const rhythm = weeklyReadingRhythm(history, now);
  const weekStart = new Date(rhythm.days[0].date);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);
  const isThisWeek = (value) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date >= weekStart && date < weekEnd;
  };
  const weekEntries = history.filter((entry) => isThisWeek(entry.date));
  const completed = weekEntries.filter((entry) => !entry.abandoned && Number(entry.words) > 0);
  const previousCompleted = history.filter((entry) => {
    const date = new Date(entry.date);
    return !entry.abandoned && Number(entry.words) > 0 && date >= previousWeekStart && date < weekStart;
  });
  const readingDays = new Set(completed.map((entry) => localDateKey(entry.date))).size;
  const topics = new Set(completed.map((entry) => entry.topic).filter(Boolean));
  const previousTopics = new Set(
    history
      .filter((entry) => !entry.abandoned && Number(entry.words) > 0 && new Date(entry.date) < weekStart)
      .map((entry) => entry.topic)
      .filter(Boolean)
  );
  const rewardCount = Object.values(state.earned).filter(isThisWeek).length;
  return {
    readingDays,
    stories: completed.length,
    words: completed.reduce((sum, entry) => sum + Number(entry.words || 0), 0),
    rewards: rewardCount,
    topics: topics.size,
    newTopics: [...topics].filter((topic) => !previousTopics.has(topic)).length,
    skips: weekEntries.filter((entry) => entry.abandoned).length,
    previous: {
      readingDays: new Set(previousCompleted.map((entry) => localDateKey(entry.date))).size,
      stories: previousCompleted.length,
      words: previousCompleted.reduce((sum, entry) => sum + Number(entry.words || 0), 0),
    },
  };
}

function signedDifference(value) {
  return value > 0 ? `+${fmt(value)}` : fmt(value);
}

function renderWeeklySummary(history = getHistory(), state = getRewardState()) {
  const summary = weeklySummaryData(history, state);
  document.getElementById("weeklySummaryDays").textContent = fmt(summary.readingDays);
  document.getElementById("weeklySummaryStories").textContent = fmt(summary.stories);
  document.getElementById("weeklySummaryWords").textContent = fmt(summary.words);
  document.getElementById("weeklySummaryRewards").textContent = fmt(summary.rewards);
  const message = document.getElementById("weeklySummaryMessage");
  const comparison = document.getElementById("weeklySummaryComparison");
  const dayDifference = summary.readingDays - summary.previous.readingDays;
  const wordDifference = summary.words - summary.previous.words;
  comparison.textContent = summary.previous.readingDays || summary.previous.words
    ? `先週との差：読書日 ${signedDifference(dayDifference)}日・語数 ${signedDifference(wordDifference)}語。`
    : "先週の読了記録はありません。";
  if (!summary.stories) {
    message.textContent = summary.skips
      ? `今週は文章を${summary.skips}回替えました。`
      : "今週はまだ読了記録がありません。";
    return;
  }
  const parts = [`${summary.topics}ジャンルを読みました`];
  if (summary.newTopics) parts.push(`新しいジャンルは${summary.newTopics}つです`);
  if (summary.skips) parts.push(`合わない文章は${summary.skips}回替えました`);
  message.textContent = `${parts.join("。")}。`;
}

function monthlySummaryData(history = getHistory(), state = getRewardState(), now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const inMonth = (value) => {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date >= monthStart && date < monthEnd;
  };
  const entries = history.filter((entry) => inMonth(entry.date));
  const completed = entries.filter((entry) => !entry.abandoned && Number(entry.words) > 0);
  return {
    label: `${now.getFullYear()}年${now.getMonth() + 1}月のまとめ`,
    readingDays: new Set(completed.map((entry) => localDateKey(entry.date))).size,
    stories: completed.length,
    words: completed.reduce((sum, entry) => sum + Number(entry.words || 0), 0),
    rewards: Object.values(state.earned).filter(inMonth).length,
    topics: new Set(completed.map((entry) => entry.topic).filter(Boolean)).size,
    skips: entries.filter((entry) => entry.abandoned).length,
    wpm: combinedWpm(completed),
  };
}

function renderMonthlySummary(history = getHistory(), state = getRewardState()) {
  const summary = monthlySummaryData(history, state);
  document.getElementById("monthlySummaryTitle").textContent = summary.label;
  document.getElementById("monthlySummaryDays").textContent = fmt(summary.readingDays);
  document.getElementById("monthlySummaryStories").textContent = fmt(summary.stories);
  document.getElementById("monthlySummaryWords").textContent = fmt(summary.words);
  document.getElementById("monthlySummaryRewards").textContent = fmt(summary.rewards);
  const parts = [];
  if (summary.topics) parts.push(`${summary.topics}ジャンル`);
  if (summary.wpm) parts.push(`平均${summary.wpm}語/分`);
  if (summary.skips) parts.push(`文章を替えた回数${summary.skips}回`);
  document.getElementById("monthlySummaryMessage").textContent = parts.length
    ? `${parts.join("・")}。`
    : "今月はまだ読了記録がありません。";
}

function rewardCandidates(definitions, state, metrics) {
  const suppressed = new Set(state.suppressed);
  const progression = rewardProgression(definitions, state);
  return definitions
    .map((reward, index) => {
      const current = Math.max(0, Number(metrics[reward.metric] || 0));
      const threshold = Number(reward.threshold);
      return {
        reward,
        index,
        current,
        threshold,
        ratio: Math.min(1, current / threshold),
      };
    })
    .filter((item) =>
      progression.currentIds.has(item.reward.id) &&
      !hasOwn(state.earned, item.reward.id) &&
      !suppressed.has(item.reward.id)
    );
}

function rewardProgression(definitions, state, pinnedId = "") {
  const sequences = new Map();
  definitions.forEach((reward, index) => {
    if (!sequences.has(reward.metric)) sequences.set(reward.metric, []);
    sequences.get(reward.metric).push({ reward, index });
  });
  sequences.forEach((items) => items.sort((a, b) =>
    Number(a.reward.threshold) - Number(b.reward.threshold) || a.index - b.index
  ));

  const suppressed = new Set(state.suppressed);
  const revealedIds = new Set();
  const currentIds = new Set();
  const hiddenIds = new Set();
  const discoveryIds = new Set();

  sequences.forEach((items) => {
    if (items.length === 1) {
      const id = items[0].reward.id;
      if (hasOwn(state.earned, id)) revealedIds.add(id);
      else if (!suppressed.has(id)) discoveryIds.add(id);
      return;
    }

    items.forEach(({ reward }) => {
      if (hasOwn(state.earned, reward.id)) revealedIds.add(reward.id);
    });
    const nextIndex = items.findIndex(({ reward }) =>
      !hasOwn(state.earned, reward.id) && !suppressed.has(reward.id)
    );
    if (nextIndex >= 0) {
      const nextId = items[nextIndex].reward.id;
      revealedIds.add(nextId);
      currentIds.add(nextId);
      items.slice(nextIndex + 1).forEach(({ reward }) => {
        if (!hasOwn(state.earned, reward.id) && !suppressed.has(reward.id)) hiddenIds.add(reward.id);
      });
    }
  });

  const pinned = definitions.find((reward) => reward.id === pinnedId);
  if (pinned && !hasOwn(state.earned, pinned.id) && !suppressed.has(pinned.id)) {
    revealedIds.add(pinned.id);
    currentIds.add(pinned.id);
    discoveryIds.delete(pinned.id);
    hiddenIds.delete(pinned.id);
  }

  return { sequences, revealedIds, currentIds, hiddenIds, discoveryIds };
}

function nextRewardInChain(reward, definitions, state) {
  if (!reward || !reward.metric) return null;
  const progression = rewardProgression(definitions, state);
  const sequence = progression.sequences.get(reward.metric) || [];
  if (sequence.length < 2) return null;
  const rewardIndex = sequence.findIndex((item) => item.reward.id === reward.id);
  if (rewardIndex < 0) return null;
  const nextIndex = sequence.findIndex((item, index) =>
    index > rewardIndex && progression.currentIds.has(item.reward.id)
  );
  if (nextIndex < 0) return null;
  const laterEarnedExists = sequence.slice(rewardIndex + 1, nextIndex)
    .some((item) => hasOwn(state.earned, item.reward.id));
  return laterEarnedExists ? null : sequence[nextIndex].reward;
}

function selectRewardTargets(definitions, state, metrics) {
  const candidates = rewardCandidates(definitions, state, metrics);
  if (!candidates.length) return [];
  const byNearness = (a, b) => b.ratio - a.ratio || a.threshold - b.threshold || a.index - b.index;
  const selected = [];
  const soon = [...candidates].sort(byNearness)[0];
  if (soon) selected.push({ ...soon, kind: "もうすぐ" });

  const weeklyCategories = new Set(["rhythm", "habits", "exploration", "collection"]);
  const weekly = candidates
    .filter((item) => item.reward.id !== soon?.reward.id && weeklyCategories.has(item.reward.category))
    .sort(byNearness)[0];
  if (weekly) selected.push({ ...weekly, kind: "今週できそう" });

  const nextDifferentCategory = candidates
    .filter((item) => !selected.some((chosen) => chosen.reward.id === item.reward.id))
    .sort((a, b) => {
      const aUsed = selected.some((chosen) => chosen.reward.category === a.reward.category) ? 1 : 0;
      const bUsed = selected.some((chosen) => chosen.reward.category === b.reward.category) ? 1 : 0;
      return aUsed - bUsed || byNearness(a, b);
    })[0];
  if (nextDifferentCategory) selected.push({ ...nextDifferentCategory, kind: "次の候補" });
  return selected;
}

function validPinnedReward(definitions, state) {
  const pinnedId = get(LS.pinnedReward, "");
  if (!pinnedId) return null;
  const reward = definitions.find((item) => item.id === pinnedId);
  if (!reward || hasOwn(state.earned, pinnedId) || state.suppressed.includes(pinnedId)) {
    removeStored(LS.pinnedReward);
    return null;
  }
  return reward;
}

function pinReward(rewardId) {
  set(LS.pinnedReward, rewardId);
  if (REWARD_DEFINITIONS) {
    const state = getRewardState();
    const metrics = rewardMetrics();
    renderPinnedReward(REWARD_DEFINITIONS, state, metrics);
    renderRewardTargets(REWARD_DEFINITIONS, state, metrics);
  }
}

function renderPinnedReward(definitions, state, metrics) {
  const panel = document.getElementById("pinnedRewardPanel");
  if (!getBool(LS.showRewardGoals, true)) {
    panel.hidden = true;
    return;
  }
  const reward = validPinnedReward(definitions, state);
  panel.hidden = !reward;
  if (!reward) return;
  const current = Math.max(0, Number(metrics[reward.metric] || 0));
  const threshold = Number(reward.threshold);
  const percent = Math.min(100, Math.round((current / threshold) * 100));
  document.getElementById("pinnedRewardTitle").textContent = reward.title;
  document.getElementById("pinnedRewardDescription").textContent = reward.description;
  const progress = document.getElementById("pinnedRewardProgress");
  progress.setAttribute("aria-valuenow", String(percent));
  progress.querySelector("span").style.width = `${percent}%`;
  document.getElementById("pinnedRewardValue").textContent = `${fmt(Math.min(current, threshold))} / ${fmt(threshold)} ・ ${percent}%`;
}

function renderRewardTargets(definitions, state, metrics) {
  const section = document.getElementById("rewardTargets");
  const container = document.getElementById("rewardTargetList");
  if (!definitions || !getBool(LS.showRewardGoals, true)) {
    section.hidden = true;
    document.getElementById("pinnedRewardPanel").hidden = true;
    return;
  }
  renderPinnedReward(definitions, state, metrics);
  if (validPinnedReward(definitions, state)) {
    section.hidden = true;
    container.innerHTML = "";
    return;
  }
  const targets = selectRewardTargets(definitions, state, metrics).slice(0, 1);
  section.hidden = targets.length === 0;
  container.innerHTML = "";
  targets.forEach((target) => {
    const percent = Math.round(target.ratio * 100);
    const card = document.createElement("article");
    card.className = "reward-target-card";
    const kind = document.createElement("span");
    kind.className = "reward-target-kind";
    kind.textContent = target.kind;
    const title = document.createElement("strong");
    title.textContent = target.reward.title;
    const description = document.createElement("span");
    description.className = "reward-target-description";
    description.textContent = target.reward.description;
    const progress = document.createElement("span");
    progress.className = "reward-target-progress";
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", `${target.reward.title}の進捗`);
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", String(percent));
    const fill = document.createElement("span");
    fill.style.width = `${percent}%`;
    progress.appendChild(fill);
    const value = document.createElement("span");
    value.className = "reward-target-value";
    value.textContent = `${fmt(Math.min(target.current, target.threshold))} / ${fmt(target.threshold)} ・ ${percent}%`;
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "reward-target-pin";
    pin.textContent = get(LS.pinnedReward, "") === target.reward.id ? "目標に設定中" : "この目標にする";
    pin.setAttribute("aria-pressed", get(LS.pinnedReward, "") === target.reward.id ? "true" : "false");
    pin.addEventListener("click", () => pinReward(target.reward.id));
    card.append(kind, title, description, progress, value, pin);
    container.appendChild(card);
  });
}

document.getElementById("unpinRewardBtn").addEventListener("click", () => {
  removeStored(LS.pinnedReward);
  if (!REWARD_DEFINITIONS) return;
  const state = getRewardState();
  const metrics = rewardMetrics();
  renderPinnedReward(REWARD_DEFINITIONS, state, metrics);
  renderRewardTargets(REWARD_DEFINITIONS, state, metrics);
});

function renderRewardHome(state = getRewardState(), definitions = REWARD_DEFINITIONS) {
  const status = document.getElementById("rewardHomeStatus");
  const icon = document.querySelector(".reward-home-icon");
  const earnedIds = definitions
    ? definitions.filter((reward) => hasOwn(state.earned, reward.id)).map((reward) => reward.id)
    : Object.keys(state.earned);
  if (!definitions) {
    renderRewardTargets(null, state, null);
    icon.style.setProperty("--reward-progress", "0deg");
    status.textContent = earnedIds.length
      ? `${earnedIds.length}個の灯りを獲得 ・ 続きを確認できます`
      : "獲得済みのリワードはありません";
    return;
  }
  const metrics = rewardMetrics();
  renderRewardTargets(definitions, state, metrics);
  const next = rewardCandidates(definitions, state, metrics)
    .map((item) => ({ reward: item.reward, ratio: item.ratio }))
    .sort((a, b) => b.ratio - a.ratio || Number(a.reward.threshold) - Number(b.reward.threshold))[0];
  icon.style.setProperty("--reward-progress", `${next ? Math.round(next.ratio * 360) : 360}deg`);
  status.textContent = next
    ? `${earnedIds.length}個獲得 ・ 次：${next.reward.title} ${Math.round(next.ratio * 100)}%`
    : `${earnedIds.length}個獲得`;
}

function showNextRewardNotification() {
  const toast = document.getElementById("rewardToast");
  if (!toast.hidden || !rewardNotificationQueue.length) return;
  const reward = rewardNotificationQueue[0];
  document.getElementById("rewardToastIcon").textContent = reward.icon || "✦";
  document.getElementById("rewardToastTitle").textContent = reward.title;
  const state = getRewardState();
  const nextStage = REWARD_DEFINITIONS ? nextRewardInChain(reward, REWARD_DEFINITIONS, state) : null;
  const details = [];
  if (reward.unlock && reward.unlock.label) details.push(reward.unlock.label);
  if (nextStage) details.push(`次の段階「${nextStage.title}」を公開しました`);
  if (!details.length && reward.description) details.push(reward.description);
  document.getElementById("rewardToastUnlock").textContent = details.join(" ・ ");
  document.getElementById("rewardToastNextBtn").textContent = rewardNotificationQueue.length > 1 ? `次へ（残り${rewardNotificationQueue.length - 1}）` : "確認";
  document.getElementById("rewardToastLampBtn").hidden = !(reward.unlock && reward.unlock.type === "lamp-style");
  const canStartNext = !views.home.hidden || !views.summary.hidden;
  document.getElementById("rewardToastReadBtn").hidden = !canStartNext || !usingOfflineBank();
  toast.hidden = false;
}

function queueRewardNotifications(rewards) {
  if (!getBool(LS.rewardNotifications, true)) return;
  rewardNotificationQueue.push(...rewards);
  showNextRewardNotification();
}

function dismissRewardNotifications() {
  document.getElementById("rewardToast").hidden = true;
  rewardNotificationQueue.length = 0;
}

document.getElementById("rewardToastNextBtn").addEventListener("click", () => {
  document.getElementById("rewardToast").hidden = true;
  rewardNotificationQueue.shift();
  requestAnimationFrame(showNextRewardNotification);
});

document.getElementById("rewardToastCollectionBtn").addEventListener("click", () => {
  dismissRewardNotifications();
  openRewards();
});

document.getElementById("rewardToastLampBtn").addEventListener("click", () => {
  dismissRewardNotifications();
  openRewards({ focusLamp: true });
});

document.getElementById("rewardToastReadBtn").addEventListener("click", () => {
  dismissRewardNotifications();
  if ((!views.home.hidden || !views.summary.hidden) && !blockNewReadingWhenDraftExists()) startSession();
});

async function evaluateRewardsNow({ notify = true } = {}) {
  const definitions = await loadRewards();
  const metrics = rewardMetrics();
  const state = getRewardState();
  const suppressed = new Set(state.suppressed);
  const newlyEarned = definitions.filter((reward) =>
    !hasOwn(state.earned, reward.id) &&
    !suppressed.has(reward.id) &&
    Number(metrics[reward.metric] || 0) >= Number(reward.threshold)
  );
  const wasInitialized = state.initialized;
  if (newlyEarned.length) {
    const earnedAt = new Date().toISOString();
    newlyEarned.forEach((reward) => { state.earned[reward.id] = earnedAt; });
  }
  state.initialized = true;
  saveRewardState(state);
  applyEquippedLampStyle(state);
  renderWeeklySummary(getHistory(), state);
  renderMonthlySummary(getHistory(), state);
  renderRewardHome(state, definitions);
  if (newlyEarned.length && notify && getBool(LS.rewardNotifications, true)) {
    if (wasInitialized) {
      queueRewardNotifications(newlyEarned.length > 3 ? [{
        icon: "✦",
        title: `${newlyEarned.length}個のリワードを獲得しました`,
        description: "これまでの記録からまとめて獲得しました。コレクションで確認できます。",
      }] : newlyEarned);
    } else {
      queueRewardNotifications([{
        icon: "✦",
        title: `これまでの記録から${newlyEarned.length}個獲得しました`,
        description: "コレクションで確認できます。",
      }]);
    }
  }
  return newlyEarned;
}

function evaluateRewards(options) {
  rewardEvaluationChain = rewardEvaluationChain
    .then(() => evaluateRewardsNow(options))
    .catch((error) => {
      console.error("reward evaluation failed", error);
      document.getElementById("rewardHomeStatus").textContent = "リワードを読み込めませんでした。次回もう一度確認します。";
      return [];
    });
  return rewardEvaluationChain;
}

const rewardsModal = document.getElementById("rewardsModal");
const closeRewardsIconBtn = document.getElementById("closeRewardsIconBtn");
const rewardCategoryFilter = document.getElementById("rewardCategoryFilter");
const rewardSort = document.getElementById("rewardSort");
const rewardSortControl = document.getElementById("rewardSortControl");

function closeRewards() {
  closeAccessibleModal();
}

function formatRewardDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} 獲得` : "獲得済み";
}

function earnedPrizeStyles(state) {
  return Object.entries(LAMP_STYLES)
    .filter(([, style]) => style.rewardId && hasOwn(state.earned, style.rewardId))
    .map(([styleId, style]) => ({ styleId, style, earnedAt: state.earned[style.rewardId] }))
    .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt));
}

function renderRecentPrizes(state) {
  const section = document.getElementById("recentPrizeSection");
  const list = document.getElementById("recentPrizeList");
  const prizes = earnedPrizeStyles(state).slice(0, 3);
  section.hidden = prizes.length === 0;
  list.innerHTML = "";
  prizes.forEach(({ styleId, style, earnedAt }) => {
    const item = document.createElement("li");
    item.style.setProperty("--style-color", style.color);
    const light = document.createElement("span");
    light.className = "recent-prize-light";
    light.setAttribute("aria-hidden", "true");
    const copy = document.createElement("span");
    copy.className = "recent-prize-copy";
    const name = document.createElement("strong");
    name.textContent = style.label;
    const date = document.createElement("span");
    date.textContent = formatRewardDate(earnedAt);
    copy.append(name, date);
    item.append(light, copy);
    if (!state.seenPrizes.includes(styleId)) {
      const badge = document.createElement("span");
      badge.className = "prize-new-badge";
      badge.textContent = "NEW";
      item.appendChild(badge);
      item.setAttribute("aria-label", `${style.label}、新しいプライズ、${formatRewardDate(earnedAt)}`);
    }
    list.appendChild(item);
  });
}

function markDisplayedPrizesSeen(state = getRewardState()) {
  const displayed = [...document.querySelectorAll("#lampStyleChoices [data-style-id]")]
    .map((button) => button.dataset.styleId)
    .filter((styleId) => styleId && styleId !== "classic" && isLampStyleUnlocked(styleId, state));
  const nextSeen = [...new Set([...(state.seenPrizes || []), ...displayed])];
  if (nextSeen.length === (state.seenPrizes || []).length) return;
  state.seenPrizes = nextSeen;
  saveRewardState(state);
}

function renderLampStyleChoices(state, definitions = REWARD_DEFINITIONS) {
  const section = document.getElementById("lampStyleSection");
  const container = document.getElementById("lampStyleChoices");
  const styles = Object.entries(LAMP_STYLES);
  const rewardById = new Map((definitions || []).map((reward) => [reward.id, reward]));
  const progression = definitions ? rewardProgression(definitions, state, get(LS.pinnedReward, "")) : null;
  const visibleStyles = styles.filter(([styleId, style]) =>
    styleId === "classic" ||
    isLampStyleUnlocked(styleId, state) ||
    (style.rewardId && progression?.currentIds.has(style.rewardId))
  );
  section.hidden = visibleStyles.length === 0;
  container.innerHTML = "";
  visibleStyles.forEach(([styleId, style]) => {
    const unlocked = isLampStyleUnlocked(styleId, state);
    const equipped = unlocked && state.equippedLamp === styleId;
    const isNewPrize = unlocked && Boolean(style.rewardId) && !(state.seenPrizes || []).includes(styleId);
    const unlockReward = style.rewardId ? rewardById.get(style.rewardId) : null;
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.styleId = styleId;
    button.className = `lamp-style-choice${unlocked ? "" : " is-locked"}`;
    button.style.setProperty("--style-color", style.color);
    button.setAttribute("aria-pressed", equipped ? "true" : "false");
    button.setAttribute("aria-disabled", unlocked ? "false" : "true");
    const copy = document.createElement("span");
    copy.className = "lamp-style-choice-copy";
    const name = document.createElement("strong");
    name.textContent = style.label;
    const condition = document.createElement("span");
    condition.className = "lamp-style-choice-state";
    condition.textContent = equipped
      ? "使用中"
      : unlocked
        ? style.rewardId ? "獲得済み" : "標準"
        : unlockReward?.description || "未解放";
    copy.append(name, condition);
    button.appendChild(copy);
    if (isNewPrize) {
      const badge = document.createElement("span");
      badge.className = "prize-new-badge";
      badge.textContent = "NEW";
      button.appendChild(badge);
    }
    button.setAttribute("aria-label", unlocked
      ? `${style.label}、${isNewPrize ? "新しいプライズ、" : ""}${equipped ? "使用中" : style.rewardId ? "獲得済み" : "標準"}`
      : `${style.label}、未解放、${condition.textContent}`);
    button.addEventListener("click", () => {
      const latest = getRewardState();
      if (!isLampStyleUnlocked(styleId, latest)) return;
      latest.equippedLamp = styleId;
      latest.seenPrizes = [...new Set([...(latest.seenPrizes || []), styleId])];
      saveRewardState(latest);
      applyEquippedLampStyle(latest);
      renderLampStyleChoices(latest);
      renderRecentPrizes(latest);
      document.getElementById("rewardCollectionStatus").textContent = `${style.label}の灯りに変更しました。`;
    });
    container.appendChild(button);
  });
  const hiddenStyleCount = styles.length - visibleStyles.length;
  if (hiddenStyleCount > 0) {
    const more = document.createElement("p");
    more.className = "lamp-style-more";
    more.textContent = "ほかの灯りカラーは、関連するリワードの段階を進めると公開されます。";
    container.appendChild(more);
  }
  renderRecentPrizes(state);
}

function selectNearestRewardItems(items, limit = 4) {
  const ranked = [...items].sort((a, b) => b.progress - a.progress || a.threshold - b.threshold || a.index - b.index);
  const selected = [];
  const selectedIds = new Set();
  const categories = new Set();
  ranked.forEach((item) => {
    if (selected.length >= limit || categories.has(item.reward.category)) return;
    selected.push(item);
    selectedIds.add(item.reward.id);
    categories.add(item.reward.category);
  });
  ranked.forEach((item) => {
    if (selected.length >= limit || selectedIds.has(item.reward.id)) return;
    selected.push(item);
    selectedIds.add(item.reward.id);
  });
  return selected;
}

const REWARD_CHAINS = [
  { metric: "totalWords", label: "累計語数" },
  { metric: "completedStories", label: "読了篇数" },
  { metric: "readingDays", label: "読書日" },
  { metric: "longestStreak", label: "連続日数" },
  { metric: "threeDayWeeks", label: "週3日の達成" },
  { metric: "sevenDayWeeks", label: "週7日の達成" },
  { metric: "topicsExplored", label: "ジャンル探索" },
  { metric: "levelsExplored", label: "レベル探索" },
  { metric: "returnGapDays", label: "久しぶりの再開" },
  { metric: "shortReads", label: "短い一篇" },
  { metric: "earlyReads", label: "朝の読書" },
  { metric: "nightReads", label: "夜の読書" },
  { metric: "weekendReads", label: "週末の読書" },
  { metric: "healthySkips", label: "文章を替える選択" },
  { metric: "favorites", label: "お気に入り" },
];

function compactRewardThreshold(value) {
  if (value >= 1000000) return `${value / 1000000}M`;
  if (value >= 1000) return `${value / 1000}k`;
  return fmt(value);
}

function setRewardStepCopy(step, titleText, detailText) {
  const title = document.createElement("strong");
  title.textContent = titleText;
  const detail = document.createElement("small");
  detail.textContent = detailText;
  step.append(title, detail);
}

function renderRewardChains(definitions, state, metrics) {
  const container = document.getElementById("rewardChainList");
  container.innerHTML = "";
  const progression = rewardProgression(definitions, state, get(LS.pinnedReward, ""));
  REWARD_CHAINS.forEach((chain) => {
    const rewards = (progression.sequences.get(chain.metric) || []).map((item) => item.reward);
    if (rewards.length < 2) return;
    const row = document.createElement("section");
    row.className = "reward-chain";
    const heading = document.createElement("div");
    heading.className = "reward-chain-heading";
    const label = document.createElement("strong");
    label.textContent = chain.label;
    const current = document.createElement("span");
    current.textContent = `現在 ${fmt(Number(metrics[chain.metric] || 0))}`;
    heading.append(label, current);
    const steps = document.createElement("div");
    steps.className = "reward-chain-steps";
    steps.setAttribute("role", "list");
    const earnedRewards = rewards.filter((reward) => hasOwn(state.earned, reward.id));
    const currentReward = rewards.find((reward) => progression.currentIds.has(reward.id));
    const hiddenRemain = rewards.some((reward) => progression.hiddenIds.has(reward.id));

    if (earnedRewards.length) {
      const latest = earnedRewards[earnedRewards.length - 1];
      const earned = document.createElement("span");
      earned.className = "reward-chain-step is-earned";
      earned.setAttribute("role", "listitem");
      earned.setAttribute("aria-label", `${chain.label}は${earnedRewards.length}段階達成済み。直近は${latest.title}`);
      setRewardStepCopy(earned, `✓ ${earnedRewards.length}段階達成`, `直近：${latest.title}`);
      steps.appendChild(earned);
    }

    if (currentReward) {
      const currentValue = Math.max(0, Number(metrics[currentReward.metric] || 0));
      const threshold = Number(currentReward.threshold);
      const percent = Math.min(100, Math.round((currentValue / threshold) * 100));
      const currentStep = document.createElement("span");
      currentStep.className = "reward-chain-step is-current";
      currentStep.setAttribute("role", "listitem");
      currentStep.setAttribute("aria-label", `現在の段階、${currentReward.title}、進捗${percent}%`);
      setRewardStepCopy(currentStep, `次：${currentReward.title}`, `${fmt(Math.min(currentValue, threshold))} / ${fmt(threshold)}・${percent}%`);
      steps.appendChild(currentStep);
    } else {
      const complete = document.createElement("span");
      complete.className = "reward-chain-step is-complete";
      complete.setAttribute("role", "listitem");
      complete.textContent = "この系列を達成しました";
      steps.appendChild(complete);
    }

    if (hiddenRemain) {
      const hidden = document.createElement("span");
      hidden.className = "reward-chain-step is-hidden";
      hidden.setAttribute("role", "listitem");
      hidden.setAttribute("aria-label", "未公開の次段階。現在の段階を達成すると公開されます");
      setRewardStepCopy(hidden, "🔒 未公開", "達成後に続きを公開");
      steps.appendChild(hidden);
    }
    row.append(heading, steps);
    container.appendChild(row);
  });

  const discoveryRewards = [...progression.sequences.values()]
    .filter((items) => items.length === 1)
    .map((items) => items[0].reward);
  const discoveryEarned = discoveryRewards.filter((reward) => hasOwn(state.earned, reward.id)).length;
  const discovery = document.createElement("section");
  discovery.className = "reward-discovery";
  const discoveryTitle = document.createElement("strong");
  discoveryTitle.textContent = "発見型リワード";
  const discoveryCopy = document.createElement("span");
  discoveryCopy.textContent = `${discoveryEarned ? `${discoveryEarned}件獲得済み。` : ""}条件は非公開です。獲得したリワードはコレクションに追加されます。`;
  discovery.append(discoveryTitle, discoveryCopy);
  container.appendChild(discovery);
}

function renderRewardCollection(definitions = REWARD_DEFINITIONS, state = getRewardState()) {
  if (!definitions) return;
  const filter = rewardCategoryFilter.value || "nearest";
  const earnedCount = definitions.filter((reward) => hasOwn(state.earned, reward.id)).length;
  const metrics = rewardMetrics();
  const suppressed = new Set(state.suppressed);
  const progression = rewardProgression(definitions, state, get(LS.pinnedReward, ""));
  const newestEarnedAt = definitions
    .map((reward) => state.earned[reward.id])
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;
  const allItems = definitions.map((reward, index) => {
      const earnedAt = state.earned[reward.id] || null;
      const isSuppressed = !earnedAt && suppressed.has(reward.id);
      const current = Math.max(0, Number(metrics[reward.metric] || 0));
      const threshold = Number(reward.threshold);
      return {
        reward,
        index,
        earnedAt,
        isSuppressed,
        isCurrent: progression.currentIds.has(reward.id),
        current,
        threshold,
        progress: earnedAt ? 100 : Math.min(100, Math.round((current / threshold) * 100)),
      };
    });
  const activeRank = (item) => item.isSuppressed ? 2 : item.earnedAt ? 1 : 0;
  const selectedSort = rewardSort.value || "progress";
  const sortVisible = (visible) => visible.sort((a, b) => {
    if (selectedSort === "earned") {
      const group = (item) => item.earnedAt ? 0 : item.isSuppressed ? 2 : 1;
      return group(a) - group(b) || a.index - b.index;
    }
    if (selectedSort === "newest") {
      const group = (item) => item.earnedAt ? 0 : item.isSuppressed ? 2 : 1;
      return group(a) - group(b) || new Date(b.earnedAt || 0) - new Date(a.earnedAt || 0) || b.progress - a.progress || a.index - b.index;
    }
    if (selectedSort === "unearned") {
      return activeRank(a) - activeRank(b) || b.progress - a.progress || a.index - b.index;
    }
    return activeRank(a) - activeRank(b) || b.progress - a.progress || a.threshold - b.threshold || a.index - b.index;
  });
  let visible;
  if (filter === "nearest") {
    const active = allItems
      .filter((item) => item.isCurrent && !item.earnedAt && !item.isSuppressed);
    visible = active.length
      ? selectNearestRewardItems(active, 4)
      : allItems.filter((item) => item.earnedAt).sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt)).slice(0, 4);
  } else if (filter === "current") {
    visible = sortVisible(allItems.filter((item) => item.isCurrent && !item.earnedAt && !item.isSuppressed));
  } else if (filter === "earned") {
    visible = sortVisible(allItems.filter((item) => item.earnedAt));
  } else {
    visible = sortVisible(allItems.filter((item) =>
      item.reward.category === filter &&
      (item.earnedAt || item.isCurrent) &&
      !item.isSuppressed
    ));
  }
  rewardSortControl.hidden = filter === "nearest" || filter === "current";
  rewardSortControl.parentElement.classList.toggle("is-simple", rewardSortControl.hidden);
  const visibleLabel = filter === "nearest" ? "達成に近い" : filter === "current" ? "現在公開中" : filter === "earned" ? "獲得済み" : "このカテゴリで公開中";
  document.getElementById("rewardVisibleCount").textContent = `${visibleLabel} ${visible.length}件`;
  document.getElementById("rewardCollectionCount").textContent = fmt(earnedCount);
  renderLampStyleChoices(state, definitions);
  renderRewardChains(definitions, state, metrics);

  const grid = document.getElementById("rewardGrid");
  grid.innerHTML = "";
  visible.forEach(({ reward, earnedAt, isSuppressed, isCurrent, current, threshold, progress }) => {
    const card = document.createElement("article");
    card.className = `reward-card${earnedAt ? " is-earned" : " is-current"}${earnedAt === newestEarnedAt ? " is-newest" : ""}${isSuppressed ? " is-suppressed" : ""}`;
    card.setAttribute("aria-label", `${reward.title}、${earnedAt ? "獲得済み" : isSuppressed ? "記録消去済み" : `現在の段階、進捗${progress}%`}`);

    const icon = document.createElement("span");
    icon.className = "reward-card-icon";
    icon.textContent = reward.icon || "✦";
    icon.setAttribute("aria-hidden", "true");
    const title = document.createElement("strong");
    title.className = "reward-card-title";
    title.textContent = reward.title;
    const description = document.createElement("span");
    description.className = "reward-card-description";
    description.textContent = reward.description;
    card.append(icon, title, description);

    if (!earnedAt && isCurrent) {
      const stage = document.createElement("span");
      stage.className = "reward-card-stage";
      stage.textContent = "現在の段階";
      card.appendChild(stage);
    }

    const progressRow = document.createElement("span");
    progressRow.className = "reward-card-progress-row";
    const progressLabel = document.createElement("span");
    progressLabel.className = "reward-card-progress-label";
    progressLabel.textContent = earnedAt
      ? "達成"
      : isSuppressed
        ? "記録消去済み"
        : `${fmt(Math.min(current, threshold))} / ${fmt(threshold)}`;
    const progressTrack = document.createElement("span");
    progressTrack.className = "reward-card-progress";
    progressTrack.setAttribute("role", "progressbar");
    progressTrack.setAttribute("aria-label", `${reward.title}の進捗`);
    progressTrack.setAttribute("aria-valuemin", "0");
    progressTrack.setAttribute("aria-valuemax", "100");
    progressTrack.setAttribute("aria-valuenow", String(isSuppressed ? 0 : progress));
    const progressFill = document.createElement("span");
    progressFill.className = "reward-card-progress-fill";
    progressFill.style.width = `${isSuppressed ? 0 : progress}%`;
    progressTrack.appendChild(progressFill);
    progressRow.append(progressLabel, progressTrack);
    card.appendChild(progressRow);

    if (earnedAt) {
      const date = document.createElement("span");
      date.className = "reward-card-date";
      date.textContent = formatRewardDate(earnedAt);
      card.appendChild(date);
    }
    if (reward.unlock && reward.unlock.label) {
      const unlock = document.createElement("span");
      unlock.className = "reward-card-unlock";
      unlock.textContent = reward.unlock.label;
      card.appendChild(unlock);
    }
    if (!earnedAt && isCurrent && !isSuppressed && getBool(LS.showRewardGoals, true)) {
      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = "reward-card-pin";
      const isPinned = get(LS.pinnedReward, "") === reward.id;
      pin.textContent = isPinned ? "目標に設定中" : "目標にする";
      pin.setAttribute("aria-pressed", isPinned ? "true" : "false");
      pin.addEventListener("click", () => {
        pinReward(reward.id);
        renderRewardCollection(definitions, getRewardState());
        document.getElementById("rewardCollectionStatus").textContent = `${reward.title}をホームの目標に設定しました。`;
      });
      card.appendChild(pin);
    }
    grid.appendChild(card);
  });
}

async function openRewards(options = {}) {
  const savedFilter = get(LS.rewardFilter, "nearest");
  const normalizedFilter = savedFilter === "recommended"
    ? "nearest"
    : savedFilter === "all"
      ? "current"
      : savedFilter;
  const savedSort = get(LS.rewardSort, "progress");
  rewardCategoryFilter.value = [...rewardCategoryFilter.options].some((option) => option.value === normalizedFilter) ? normalizedFilter : "nearest";
  rewardSort.value = [...rewardSort.options].some((option) => option.value === savedSort) ? savedSort : "progress";
  document.getElementById("rewardCollectionStatus").textContent = "";
  document.getElementById("rewardGrid").innerHTML = '<p class="modal-hint">コレクションを読み込んでいます…</p>';
  openAccessibleModal(rewardsModal, closeRewardsIconBtn, closeRewards);
  try {
    const definitions = await loadRewards();
    const state = getRewardState();
    renderRewardCollection(definitions, state);
    requestAnimationFrame(() => markDisplayedPrizesSeen(state));
    if (options.focusLamp === true) {
      const firstLamp = document.querySelector("#lampStyleChoices button");
      if (firstLamp) {
        firstLamp.focus();
        firstLamp.scrollIntoView({ block: "nearest" });
      }
    }
  } catch {
    document.getElementById("rewardGrid").innerHTML = '<p class="modal-hint">コレクションを読み込めませんでした。アプリを更新して、もう一度お試しください。</p>';
  }
}

document.getElementById("openRewardsBtn").addEventListener("click", openRewards);
document.getElementById("openRewardsTargetsBtn").addEventListener("click", openRewards);
closeRewardsIconBtn.addEventListener("click", closeRewards);
document.getElementById("closeRewardsBtn").addEventListener("click", closeRewards);
rewardsModal.addEventListener("click", (event) => { if (event.target === rewardsModal) closeRewards(); });
rewardCategoryFilter.addEventListener("change", () => {
  set(LS.rewardFilter, rewardCategoryFilter.value);
  renderRewardCollection();
});
rewardSort.addEventListener("change", () => {
  set(LS.rewardSort, rewardSort.value);
  renderRewardCollection();
});

document.getElementById("resetRewardsBtn").addEventListener("click", async () => {
  if (!confirm("獲得したリワードと選択中の灯りカラーを消去します。読書記録は残り、現在すでに達成しているリワードは再獲得しません。よろしいですか？")) return;
  try {
    const definitions = await loadRewards();
    const metrics = rewardMetrics();
    const suppressed = definitions
      .filter((reward) => Number(metrics[reward.metric] || 0) >= Number(reward.threshold))
      .map((reward) => reward.id);
    const state = { version: REWARD_STATE_VERSION, initialized: true, earned: {}, suppressed, equippedLamp: "classic", seenPrizes: [] };
    saveRewardState(state);
    rewardNotificationQueue.length = 0;
    document.getElementById("rewardToast").hidden = true;
    applyEquippedLampStyle(state);
    renderRewardHome(state, definitions);
    renderRewardCollection(definitions, state);
    document.getElementById("rewardCollectionStatus").textContent = "リワード記録を消去しました。現在の記録で達成済みのものは再表示せず、まだ未達のリワードは今後獲得できます。";
  } catch {
    document.getElementById("rewardCollectionStatus").textContent = "リワード記録を消去できませんでした。";
  }
});

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

  const validWpm = completed.filter(isValidWpmEntry);
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
  const history = getHistory();
  const returning = returningReaderState(history);
  const total = history.reduce((sum, entry) => sum + Number(entry.words || 0), 0);
  document.getElementById("totalWords").textContent = fmt(total);

  const next = nextMilestone(total);
  const prev = prevMilestone(total);
  const pct = Math.max(2, Math.min(100, ((total - prev) / (next - prev)) * 100));
  document.getElementById("milestoneFill").style.width = pct + "%";

  const goal = getNum(LS.dailyGoal, 1500);
  const today = wordsToday(history);
  const caption = document.getElementById("milestoneCaption");
  if (today >= goal) {
    caption.textContent = `今日の目標 ${fmt(goal)} 語を達成 ・ 次の節目 ${fmt(next)} 語まであと ${fmt(next - total)} 語`;
  } else {
    caption.textContent = `今日 ${fmt(today)} / ${fmt(goal)} 語 ・ 次の節目 ${fmt(next)} 語まであと ${fmt(next - total)} 語`;
  }

  document.getElementById("statStreak").textContent = computeStreak(history);
  renderWeeklyRhythm(history);
  renderWeeklySummary(history);
  renderMonthlySummary(history);
  renderBackupStatus(history);
  renderRewardHome();
  const wpm = recentWpm();
  document.getElementById("statWpm").textContent = wpm === null ? "—" : wpm;
  document.getElementById("statLevel").textContent = getLevel();

  const info = levelInfo(getLevel());
  document.getElementById("levelNote").textContent =
    `レベル ${info.n}：${info.desc}`;

  const useBank = usingOfflineBank();
  syncTopicMode(useBank);
  document.getElementById("modeNote").textContent = useBank
    ? `オフライン文章バンク ・ APIキー不要${topicSelect.value === "random" && recommendationHasSignal(history) ? " ・ 最近の記録を候補に反映" : ""}${returning.returning ? " ・ 短めの文章を優先" : ""}`
    : `AI生成 ・ 1篇 約${fmt(getNum(LS.wordCount, 800))}語`;
  document.getElementById("startBtn").textContent = useBank
    ? "読みはじめる"
    : "AIで文章を作って読む";
  document.getElementById("quickStartBtn").hidden = !useBank;
  document.getElementById("quickStartHint").hidden = !useBank;
  document.getElementById("quickStartBtn").textContent = returning.returning
    ? "短い一篇から再開する"
    : "短い一篇から始める";
  document.getElementById("quickStartHint").textContent = returning.returning
    ? `最後の読了から${returning.daysAway}日。今のレベルとテーマから短めの文章を選びます。`
    : "今のレベルとテーマから、短めの文章を選びます。";
  renderStoryCandidates();
  renderOfflineStatus();

  const list = document.getElementById("historyList");
  list.innerHTML = "";
  renderHistoryAnalysis(history);
  renderFavorites();
  renderActiveReadingPanel();
  if (history.length === 0) {
    const li = document.createElement("li");
    li.className = "history-empty";
    li.textContent = "読書記録はまだありません。";
    list.appendChild(li);
  } else {
    history.slice(0, 3).forEach((h) => {
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
  "文章を作成しています…",
  "応答を待っています…",
  "文章を作成しています…",
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
  if (!blockNewReadingWhenDraftExists()) {
    startSession({ preferShort: usingOfflineBank() && returningReaderState().returning });
  }
});
document.getElementById("quickStartBtn").addEventListener("click", () => {
  if (!blockNewReadingWhenDraftExists()) startSession({ preferShort: true });
});
document.getElementById("anotherBtn").addEventListener("click", () => {
  dismissFirstCompletionGuide();
  startSession();
});
document.getElementById("homeBtn").addEventListener("click", () => {
  dismissFirstCompletionGuide();
  renderHome();
  showView("home");
});
document.getElementById("resumeReadingBtn").addEventListener("click", restoreActiveReading);
document.getElementById("discardReadingBtn").addEventListener("click", () => {
  const draft = getActiveReadingDraft();
  if (draft && draft.story._bankId) unmarkSeen(draft.story._bankId);
  clearActiveReadingDraft();
  renderActiveReadingPanel();
  document.getElementById("startBtn").focus();
});

async function startSession({ preferShort = false } = {}) {
  const useBank = usingOfflineBank();

  if (useBank) {
    return startOfflineSession({ preferShort });
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
    recordAnonymousEvent("story_start", { level: session._level });
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
let storyBankLoadPromise = null;
let storyBankLoadError = null;

async function loadStoryBank() {
  if (STORY_BANK) return STORY_BANK;
  if (storyBankLoadPromise) return storyBankLoadPromise;
  storyBankLoadPromise = (async () => {
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
  })().catch((err) => {
    storyBankLoadError = err;
    throw err;
  }).finally(() => { storyBankLoadPromise = null; });
  return storyBankLoadPromise;
}

function setOfflineStatus(state, message, action = "") {
  const panel = document.getElementById("offlineStatus");
  const button = document.getElementById("prepareOfflineBtn");
  panel.hidden = !usingOfflineBank();
  panel.classList.remove("is-ready", "is-working", "is-error");
  if (state) panel.classList.add(`is-${state}`);
  document.getElementById("offlineStatusText").textContent = message;
  button.hidden = !action;
  if (action) button.textContent = action;
}

function serviceWorkerMessage(type) {
  const worker = navigator.serviceWorker && (
    navigator.serviceWorker.controller ||
    (serviceWorkerRegistration && serviceWorkerRegistration.active)
  );
  if (!worker || typeof MessageChannel === "undefined") return Promise.reject(new Error("service worker unavailable"));
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => reject(new Error("service worker timeout")), 12000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      resolve(event.data || {});
    };
    worker.postMessage({ type }, [channel.port2]);
  });
}

async function renderOfflineStatus() {
  const panel = document.getElementById("offlineStatus");
  panel.hidden = !usingOfflineBank();
  if (!usingOfflineBank()) return;
  if (!("serviceWorker" in navigator)) {
    setOfflineStatus("error", "このブラウザではオフライン保存を利用できません。", "再試行");
    return;
  }
  if (!serviceWorkerRegistration) {
    setOfflineStatus("working", "オフライン準備を確認しています…");
    return;
  }
  try {
    const status = await serviceWorkerMessage("OFFLINE_STATUS");
    if (status.ready) {
      let persisted = false;
      if (navigator.storage && typeof navigator.storage.persisted === "function") {
        persisted = await navigator.storage.persisted().catch(() => false);
      }
      if (status.current || typeof status.current !== "boolean") {
        setOfflineStatus("ready", `2,000篇をオフラインで利用できます${persisted ? "（保存保護済み）" : ""}。`, persisted ? "" : "保存を保護");
      } else if (navigator.onLine) {
        setOfflineStatus("working", "以前の版を利用できます。更新版の文章を保存しています…");
        prepareOfflineContent(false);
      } else {
        setOfflineStatus("ready", "以前の版の2,000篇をオフラインで利用できます。", "");
      }
    } else if (!navigator.onLine) {
      setOfflineStatus("error", "準備が完了していません。オンライン時に保存してください。", "再試行");
    } else {
      setOfflineStatus("working", "2,000篇を端末に保存しています…");
      prepareOfflineContent(false);
    }
  } catch {
    setOfflineStatus("error", "オフライン準備を確認できませんでした。", "再試行");
  }
}

async function prepareOfflineContent(requestPersistence = false) {
  if (offlinePreparing || !usingOfflineBank()) return;
  offlinePreparing = true;
  setOfflineStatus("working", "2,000篇を端末に保存しています…");
  try {
    if (requestPersistence && navigator.storage && typeof navigator.storage.persist === "function") {
      await navigator.storage.persist().catch(() => false);
    }
    const result = await serviceWorkerMessage("PREPARE_OFFLINE");
    if (!result.ready) throw new Error("offline cache incomplete");
    recordAnonymousEvent("offline_ready");
    await renderOfflineStatus();
  } catch {
    const fallback = await serviceWorkerMessage("OFFLINE_STATUS").catch(() => ({ ready: false }));
    if (fallback.ready && !fallback.current) {
      setOfflineStatus("ready", "以前の版を利用できます。更新版の文章は保存できませんでした。", "再試行");
    } else {
      setOfflineStatus("error", navigator.onLine ? "保存に失敗しました。通信状態を確認して再試行してください。" : "オフラインのため保存を完了できません。", "再試行");
    }
  } finally {
    offlinePreparing = false;
  }
}

document.getElementById("prepareOfflineBtn").addEventListener("click", () => prepareOfflineContent(true));

function validSeenStoryIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === "string" && /^s\d{3,}$/.test(id)))].slice(0, 5000);
}
function getSeenIds() {
  try { return new Set(validSeenStoryIds(JSON.parse(get(LS.seenStoryIds, "[]")))); }
  catch { return new Set(); }
}
function markSeen(id) {
  if (typeof id !== "string" || !/^s\d{3,}$/.test(id)) return;
  const seen = getSeenIds();
  seen.add(id);
  set(LS.seenStoryIds, JSON.stringify(validSeenStoryIds([...seen])));
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

function topicRecommendationWeight(topic, history = getHistory()) {
  if (!getBool(LS.personalizedSuggestions, true)) return 1;
  let weight = 1;
  history.slice(0, 60).forEach((entry, index) => {
    if (entry.topic !== topic) return;
    const freshness = Math.max(0.2, 1 - index / 75);
    if (!entry.abandoned && Number(entry.words) > 0) {
      weight += 0.18 * freshness;
    } else if (entry.abandonReason === "not-interesting") {
      weight -= 0.55 * freshness;
    }
  });
  return Math.min(2.4, Math.max(0.35, weight));
}

function recommendationHasSignal(history = getHistory()) {
  return getBool(LS.personalizedSuggestions, true) && history.some((entry) =>
    (!entry.abandoned && Number(entry.words) > 0) || entry.abandonReason === "not-interesting"
  );
}

function rankStoriesForRecommendation(stories, history = getHistory(), random = Math.random) {
  return stories
    .map((story) => {
      const weight = topicRecommendationWeight(story.topic, history);
      const draw = Math.max(Number.EPSILON, Math.min(1, Number(random()) || 0));
      return { story, key: Math.pow(draw, 1 / weight) };
    })
    .sort((a, b) => b.key - a.key)
    .map((item) => item.story);
}

function pickStory(bank, topic, level, { preferShort = false } = {}) {
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

  const candidates = preferShort
    ? [...unseen]
        .sort((a, b) => (Number(a.wordCount) || countWords(a.text)) - (Number(b.wordCount) || countWords(b.text)))
        .slice(0, Math.max(1, Math.ceil(unseen.length * 0.35)))
    : unseen;
  if (topic === "random" && recommendationHasSignal()) {
    return rankStoriesForRecommendation(candidates)[0];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickStoryCandidates(bank, topic, level, count = 3, { preferShort = false } = {}) {
  const seen = getSeenIds();
  const byTopic = bank.filter((story) => topic === "random" || topic === "custom" || story.topic === topic);
  const topicPool = byTopic.length ? byTopic : [...bank];
  const atLevel = topicPool.filter((story) => story.level === level);
  const levelPool = atLevel.length
    ? atLevel
    : [...topicPool].sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level))
        .filter((story, index, sorted) => Math.abs(story.level - level) === Math.abs(sorted[0].level - level));
  let available = levelPool.filter((story) => !seen.has(story.id));
  if (available.length === 0) {
    clearSeenForPool(levelPool.map((story) => story.id));
    available = levelPool.filter((story) => story.id !== lastBankStoryId);
    if (!available.length) available = levelPool;
  }
  const candidatePool = preferShort
    ? [...available]
        .sort((a, b) => (Number(a.wordCount) || countWords(a.text)) - (Number(b.wordCount) || countWords(b.text)))
        .slice(0, Math.max(count, Math.ceil(available.length * 0.35)))
    : available;
  const shuffled = topic === "random" && recommendationHasSignal()
    ? rankStoriesForRecommendation(candidatePool)
    : [...candidatePool].sort(() => Math.random() - 0.5);
  const selected = [];
  const usedSubtopics = new Set();
  const usedTopics = new Set();
  shuffled.forEach((story) => {
    if (selected.length >= count) return;
    const subtopic = String(story.subtopic || "");
    if (topic === "random" && usedTopics.has(story.topic)) return;
    if (subtopic && usedSubtopics.has(subtopic)) return;
    selected.push(story);
    usedTopics.add(story.topic);
    if (subtopic) usedSubtopics.add(subtopic);
  });
  shuffled.forEach((story) => {
    if (selected.length < count && !selected.some((item) => item.id === story.id)) selected.push(story);
  });
  return selected.slice(0, count);
}

let storyCandidateRenderToken = 0;
async function renderStoryCandidates() {
  const section = document.getElementById("storyCandidates");
  const status = document.getElementById("storyCandidatesStatus");
  const list = document.getElementById("storyCandidateList");
  const useBank = usingOfflineBank();
  section.hidden = !useBank;
  if (!useBank) {
    list.innerHTML = "";
    return;
  }
  const token = ++storyCandidateRenderToken;
  status.hidden = false;
  status.textContent = "候補を選んでいます…";
  list.innerHTML = "";
  try {
    const bank = await loadStoryBank();
    if (token !== storyCandidateRenderToken || !usingOfflineBank()) return;
    const returning = returningReaderState();
    const candidates = pickStoryCandidates(bank, topicSelect.value, getLevel(), 3, { preferShort: returning.returning });
    const wpm = recentWpm() || 130;
    candidates.forEach((story) => {
      const words = Number(story.wordCount) || countWords(story.text);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "story-candidate";
      const subtopic = typeof story.subtopic === "string" && story.subtopic.trim() ? ` ・ ${story.subtopic.trim()}` : "";
      button.innerHTML = `<strong class="story-candidate-title">${esc(story.title)}</strong><span class="story-candidate-time">約${Math.max(1, Math.round(words / wpm))}分</span><span class="story-candidate-meta">Level ${story.level} ・ ${esc(topicLabel(story.topic))}${esc(subtopic)} ・ ${fmt(words)}語</span>`;
      button.addEventListener("click", () => {
        if (!blockNewReadingWhenDraftExists()) beginOfflineStory(story, "candidate");
      });
      list.appendChild(button);
    });
    status.hidden = candidates.length === 3 && !returning.returning;
    if (candidates.length && returning.returning) {
      status.textContent = `短めの候補を${candidates.length}篇表示しています。`;
    } else if (candidates.length < 3 && candidates.length > 0) {
      status.textContent = `未読の候補があと${candidates.length}篇あります。読み切ると次の周が始まります。`;
    }
    if (!candidates.length) status.textContent = "条件に合う候補がありません。テーマを変更してください。";
    if (candidates.length) recordAnonymousEvent("candidate_shown", { level: getLevel(), topic: topicSelect.value });
  } catch {
    if (token !== storyCandidateRenderToken) return;
    status.hidden = false;
    status.textContent = "候補を読み込めませんでした。「選び直す」で再試行できます。";
  }
}

function beginOfflineStory(story, source = "random") {
  session = { topic: story.topic, title: story.title, text: story.text, _bankId: story.id, _level: story.level, _editorialStatus: story.editorialStatus };
  markSeen(story.id);
  lastBankStoryId = story.id;
  recordAnonymousEvent("story_start", { level: story.level, topic: story.topic, source });
  renderReading(session);
  showView("reading");
  startReadingTimer();
  startActiveReadingAutosave();
}

document.getElementById("refreshCandidatesBtn").addEventListener("click", renderStoryCandidates);

async function startOfflineSession({ preferShort = false } = {}) {
  showView("loading");
  document.getElementById("loadingText").textContent = preferShort ? "短い文章を選んでいます…" : "文章を選んでいます…";

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

  const story = pickStory(bank, topicSelect.value, getLevel(), { preferShort });

  beginOfflineStory(story, preferShort ? "quick" : "random");
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
    beginOfflineStory(story, "favorite");
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
  evaluateRewards({ notify: true });
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
  const submitButton = document.getElementById("submitReportBtn");
  const shareButton = document.getElementById("shareReportBtn");
  submitButton.disabled = true;
  submitButton.textContent = "確認中…";
  shareButton.textContent = "ほかの方法で共有";
  document.getElementById("reportIntro").textContent = "報告方法を確認しています…";
  document.getElementById("reportStoryContext").textContent =
    `${session._bankId || "AI生成"} ・ ${session.title || "タイトルなし"} ・ Level ${getLevel()}`;
  openAccessibleModal(reportModal, firstReason, closeStoryReport);
  loadRuntimeConfig().then((config) => {
    submitButton.disabled = false;
    submitButton.textContent = config.storyReportEndpoint ? "報告を送信" : "端末に保存";
    shareButton.textContent = config.supportEmail ? "メールで送る" : "ほかの方法で共有";
    submitButton.classList.toggle("btn-primary", Boolean(config.storyReportEndpoint || !config.supportEmail));
    submitButton.classList.toggle("btn-ghost", Boolean(!config.storyReportEndpoint && config.supportEmail));
    shareButton.classList.toggle("btn-primary", Boolean(!config.storyReportEndpoint && config.supportEmail));
    shareButton.classList.toggle("btn-ghost", Boolean(config.storyReportEndpoint || !config.supportEmail));
    document.getElementById("reportIntro").textContent = config.storyReportEndpoint
      ? "送信できない場合は端末内に保存し、オンライン復帰時に再送します。"
      : config.supportEmail
        ? "メールアプリを開き、内容を確認して送信してください。自動送信はされません。送れない場合は端末に保存できます。"
        : "自動送信先は未設定です。端末に保存した後、共有またはJSON保存を利用できます。";
  });
});

closeReportIconBtn.addEventListener("click", closeStoryReport);
document.getElementById("closeReportBtn").addEventListener("click", closeStoryReport);
reportModal.addEventListener("click", (event) => {
  if (event.target === reportModal) closeStoryReport();
});

document.getElementById("submitReportBtn").addEventListener("click", async () => {
  const button = document.getElementById("submitReportBtn");
  const data = storyReportData();
  button.disabled = true;
  button.textContent = "送信中…";
  reportStatus.textContent = "";
  const queued = queueStoryReport(data);
  if (!queued.saved && storageBlocked) {
    reportStatus.textContent = "端末へ保存できないため、この画面を閉じる前に共有またはファイル保存をしてください。";
    button.disabled = false;
    button.textContent = "報告を送信";
    return;
  }
  recordAnonymousEvent("report_submitted");
  const result = await flushStoryReports();
  const config = await loadRuntimeConfig();
  if (result.sent && result.pending === 0) {
    reportStatus.textContent = "報告を送信しました。ご協力ありがとうございます。";
    button.textContent = "送信済み";
  } else if (!config.storyReportEndpoint) {
    reportStatus.textContent = config.supportEmail
      ? "報告を端末内に保存しました。運営者へ届けるには「メールで送る」から送信してください。"
      : "送信先が未設定のため、報告を端末内に保存しました。共有またはファイル保存も利用できます。";
    button.textContent = "端末に保存済み";
  } else {
    reportStatus.textContent = "現在送信できないため端末内に保存しました。オンライン時に自動で再送します。";
    button.textContent = "送信待ち";
  }
});

document.getElementById("shareReportBtn").addEventListener("click", async () => {
  const data = storyReportData();
  const text = storyReportText(data);
  reportStatus.textContent = "";
  try {
    const config = await loadRuntimeConfig();
    if (config.supportEmail) {
      const subject = encodeURIComponent(`Reading Lamp 文章問題報告：${data.storyId}`);
      const body = encodeURIComponent(text);
      window.location.href = `mailto:${config.supportEmail}?subject=${subject}&body=${body}`;
      reportStatus.textContent = "メールアプリを開きました。内容を確認して送信してください。";
      return;
    }
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
  beginFileDownload(blob, `reading-lamp-report-${data.storyId}-${new Date().toISOString().slice(0, 10)}.json`);
  reportStatus.textContent = "報告ファイルのダウンロードを開始しました。保存を確認してから添付してください。";
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
  recordAnonymousEvent("story_abandon", { level: adjustment.before, topic: session.topic });
  evaluateRewards({ notify: true });
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
  recordAnonymousEvent("story_complete", { level: adjustment.before, topic: session.topic });
  evaluateRewards({ notify: true });
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
  const weeklyRhythm = weeklyReadingRhythm();
  if (weeklyRhythm.completed >= weeklyRhythm.goal) {
    notes.push(`今週の読書目標 ${weeklyRhythm.goal}日を達成しました。`);
  } else {
    notes.push(`今週の読書：${weeklyRhythm.completed}/${weeklyRhythm.goal}日。`);
  }

  const crossed = MILESTONES.find((m) => total >= m && total - words < m);
  if (crossed) notes.push(`累計 ${fmt(crossed)} 語に到達しました。`);

  if (wpmInvalidReason === "too-short") {
    notes.push("読書時間が10秒未満だったため、読む速さは記録しませんでした。");
  } else if (wpmInvalidReason) {
    notes.push("計測値が通常範囲外だったため、読む速さは記録しませんでした。");
  }

  document.getElementById("summaryNote").textContent = notes.join(" ");

  const completedCount = getHistory().filter((entry) => !entry.abandoned && Number(entry.words) > 0).length;
  document.getElementById("firstCompletionGuide").hidden = !(
    completedCount === 1 && !getBool(LS.firstCompletionGuideSeen, false)
  );
}

function dismissFirstCompletionGuide() {
  const guide = document.getElementById("firstCompletionGuide");
  if (guide.hidden) return;
  set(LS.firstCompletionGuideSeen, "1");
  guide.hidden = true;
}

document.getElementById("dismissFirstCompletionGuideBtn").addEventListener("click", dismissFirstCompletionGuide);

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
const onboardingLevelSamples = [...document.querySelectorAll('input[name="onboardingLevelSample"]')];
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
  const closestSample = [...onboardingLevelSamples]
    .sort((a, b) => Math.abs(Number(a.value) - getLevel()) - Math.abs(Number(b.value) - getLevel()))[0];
  onboardingLevelSamples.forEach((sample) => { sample.checked = sample === closestSample; });
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

onboardingLevelInput.addEventListener("input", () => {
  onboardingLevelSamples.forEach((sample) => { sample.checked = false; });
  renderOnboardingLevel();
});
onboardingLevelSamples.forEach((sample) => sample.addEventListener("change", () => {
  if (!sample.checked) return;
  onboardingLevelInput.value = sample.value;
  renderOnboardingLevel();
  recordAnonymousEvent("level_sample_selected", { level: Number(sample.value) });
}));
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
applyEquippedLampStyle();
applyReadingDisplay();
renderHome();
showView("home");
recordAnonymousEvent("app_open");
flushAnonymousUsage().catch(() => {});
flushStoryReports().catch(() => {});
evaluateRewards({ notify: true });
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
      serviceWorkerRegistration = registration;
      renderOfflineStatus();
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
    }).catch(() => {
      setOfflineStatus("error", "オフライン保存を開始できませんでした。", "再試行");
    });
  });
}

window.addEventListener("online", () => {
  renderOfflineStatus();
  flushStoryReports().then(renderReportQueueStatus).catch(() => {});
  flushAnonymousUsage().then(renderAnonymousUsageStatus).catch(() => {});
});
