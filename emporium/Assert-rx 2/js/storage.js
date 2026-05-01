const SESSIONS_KEY = 'assertrx_sessions';
const ONBOARDING_KEY = 'assertrx_onboarded';

export function hasSeenOnboarding() {
  return !!localStorage.getItem(ONBOARDING_KEY);
}

export function markOnboardingSeen() {
  localStorage.setItem(ONBOARDING_KEY, '1');
}

export function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY)) ?? []; }
  catch { return []; }
}

export function saveSession(session) {
  const all = loadSessions();
  all.unshift(session);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
}

export function deleteSession(id) {
  const all = loadSessions().filter(s => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
}

export function updateSessionAnswers(id, answers) {
  const all = loadSessions();
  const s = all.find(s => s.id === id);
  if (s) {
    s.answers = answers;
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
  }
}
