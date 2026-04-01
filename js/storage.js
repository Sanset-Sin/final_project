
const PROFILE_KEY = "signal-js-profile";
const HISTORY_KEY = "signal-js-history";
const ACTIVE_SESSION_KEY = "signal-js-active-session";

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadProfile() {
  return read(PROFILE_KEY, null);
}

export function saveProfile(profile) {
  write(PROFILE_KEY, profile);
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

export function loadHistory() {
  return read(HISTORY_KEY, []);
}

export function saveHistory(history) {
  write(HISTORY_KEY, history);
}

export function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function loadActiveSession() {
  return read(ACTIVE_SESSION_KEY, null);
}

export function saveActiveSession(session) {
  write(ACTIVE_SESSION_KEY, session);
}

export function clearActiveSession() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}
