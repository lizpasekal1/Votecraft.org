export const VOICE_PROFILES = [
  { id: 'young-female', label: 'Young F', preferred: ['Ava (Enhanced)', 'Ava', 'Samantha (Enhanced)', 'Samantha', 'Zoe', 'Google US English'] },
  { id: 'mature-female', label: 'Mature F', preferred: ['Victoria', 'Karen (Enhanced)', 'Karen', 'Moira', 'Google UK English Female'] },
  { id: 'young-male', label: 'Young M', preferred: ['Daniel (Enhanced)', 'Daniel', 'Tom', 'Google UK English Male', 'Aaron'] },
  { id: 'mature-male', label: 'Mature M', preferred: ['Alex', 'Arthur (Enhanced)', 'Arthur', 'Gordon', 'Fred'] },
];

let _voices = [];
let _profile = localStorage.getItem('assertrx_voice') ?? 'young-female';
const _readyCbs = new Set();

function loadVoices() {
  const v = ('speechSynthesis' in window) ? window.speechSynthesis.getVoices() : [];
  if (v.length) { _voices = v; _readyCbs.forEach(fn => fn()); _readyCbs.clear(); }
}

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function onVoicesReady(fn) {
  if (_voices.length) fn(); else _readyCbs.add(fn);
}

function resolveVoice(id) {
  const profile = VOICE_PROFILES.find(p => p.id === id);
  if (!profile) return null;
  const en = _voices.filter(v => v.lang.startsWith('en'));
  for (const name of profile.preferred) {
    const v = en.find(v => v.name === name);
    if (v) return v;
  }
  return en[0] ?? null;
}

export function getProfile() { return _profile; }

export function setProfile(id) {
  _profile = id;
  localStorage.setItem('assertrx_voice', id);
}

export function isSupported() { return 'speechSynthesis' in window; }

export function stop() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function speak(text) {
  stop();
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.92;
  const voice = resolveVoice(_profile);
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}

export function preview(id) {
  stop();
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance('I hear you. Can we talk about this?');
  u.rate = 0.92;
  const voice = resolveVoice(id);
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
}
