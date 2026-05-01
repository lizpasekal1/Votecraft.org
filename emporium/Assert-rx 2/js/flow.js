import { getState, setState } from './state.js';
import { saveSession } from './storage.js';

let _prevKey = null;

export function initFlow() {
  // Prompt screen: Answer button
  document.getElementById('btn-answer')?.addEventListener('click', () => {
    setState({ screen: 'response' });
  });

  // Response screen: Next button
  document.getElementById('btn-next-step')?.addEventListener('click', onNext);

  // Tone picker
  document.querySelector('.tone-picker')?.addEventListener('click', e => {
    const btn = e.target.closest('.tone-btn');
    if (!btn) return;
    onTone(Number(btn.dataset.tone));
  });

  // Textarea input (steps 1-5)
  document.getElementById('response-textarea')?.addEventListener('input', e => {
    const s = getState();
    if (s.step === 0) return;
    const answers = [...s.answers];
    answers[s.step] = e.target.value;
    setState({ answers });
  });

  // Sliders (step 0)
  document.querySelectorAll('.rating-slider').forEach(slider => {
    slider.value = 0;
    slider.addEventListener('input', () => {
      const group = slider.closest('.slider-group');
      const val = group?.querySelector('.slider-value');
      if (val) val.textContent = slider.value;
      const f = group?.dataset.field;
      if (f != null) document.querySelector(`.skill1-check[data-field="${f}"]`)?.classList.add('confirmed');
    });
  });

  // Check buttons (step 0)
  document.getElementById('skill1-fields')?.addEventListener('click', e => {
    const btn = e.target.closest('.skill1-check');
    if (btn) btn.classList.toggle('confirmed');
  });
}

export function renderPrompt(state) {
  if (!state.scenario) return;
  const skill = state.scenario.skills[state.step];
  const img = document.getElementById('prompt-image');
  if (img) { img.src = state.scenario.image; img.alt = state.scenario.name; }
  const lbl = document.getElementById('prompt-skill-label');
  if (lbl) lbl.textContent = `Skill ${state.step + 1} of 6  ·  ${state.scenario.name}`;
  const name = document.getElementById('prompt-skill-name');
  if (name) name.textContent = skill.name;
  const q = document.getElementById('prompt-question');
  if (q) q.textContent = skill.prompt;
}

export function renderResponse(state) {
  if (!state.scenario) return;
  const skill = state.scenario.skills[state.step];
  const isStep0 = state.step === 0;

  const lbl = document.getElementById('response-skill-label');
  if (lbl) lbl.textContent = `Skill ${state.step + 1} of 6`;
  const prmt = document.getElementById('response-prompt');
  if (prmt) prmt.textContent = skill.prompt;

  const fields = document.getElementById('skill1-fields');
  const textarea = document.getElementById('response-textarea');
  if (fields) fields.hidden = !isStep0;
  if (textarea) textarea.hidden = isStep0;

  if (isStep0) {
    const key = `r0-${state.scenario.id}`;
    if (_prevKey !== key) {
      _prevKey = key;
      if (state.answers[0]) _fillPriorityFromAnswer(state.answers[0]);
      else _resetPriority();
    }
  } else {
    _prevKey = `r${state.step}`;
    if (textarea && textarea.value !== state.answers[state.step]) {
      textarea.value = state.answers[state.step] ?? '';
    }
  }
  _syncTonePicker(state.suggestionIndex);
}

function onNext() {
  _prevKey = null;
  const s = getState();
  const answers = [...s.answers];

  if (s.step === 0) {
    answers[0] = _readPriority();
  } else {
    answers[s.step] = document.getElementById('response-textarea')?.value.trim() ?? '';
  }

  if (s.step < 5) {
    setState({ answers, screen: 'prompt', step: s.step + 1, suggestionIndex: -1 });
  } else {
    const session = {
      id: `${s.scenario.id}-${Date.now()}`,
      scenarioId: s.scenario.id,
      scenarioName: s.scenario.name,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      answers,
    };
    saveSession(session);
    setState({ answers, activeSession: session, screen: 'timeline' });
  }
}

function onTone(idx) {
  const s = getState();
  const answers = [...s.answers];
  const isSameActive = s.suggestionIndex === idx &&
    document.querySelector(`.tone-btn[data-tone="${idx}"]`)?.classList.contains('active');

  if (isSameActive) {
    if (s.step === 0) { _resetPriority(); answers[0] = ''; }
    else { const ta = document.getElementById('response-textarea'); if (ta) ta.value = ''; answers[s.step] = ''; }
    setState({ suggestionIndex: -1, answers });
    _syncTonePicker(-1);
    return;
  }

  const skill = s.scenario?.skills[s.step];
  if (!skill) return;
  const key = ['direct', 'gentle', 'firm'][idx];
  const sug = skill.suggestions[key];

  if (s.step === 0 && Array.isArray(sug)) {
    _fillPriorityFromSuggestion(sug);
    answers[0] = _readPriority();
  } else {
    const ta = document.getElementById('response-textarea');
    if (ta) ta.value = sug;
    answers[s.step] = sug;
  }
  setState({ suggestionIndex: idx, answers });
  _syncTonePicker(idx);
}

export function handleBack(state) {
  switch (state.screen) {
    case 'response':
      _prevKey = null;
      setState({ screen: 'prompt' });
      break;
    case 'prompt':
      if (state.step === 0) setState({ screen: 'grid', scenario: null, step: 0 });
      else setState({ screen: 'response', step: state.step - 1 });
      break;
    case 'timeline':
      setState({ screen: 'response', step: 5 });
      break;
    case 'audio':
      setState({ screen: 'timeline' });
      break;
    case 'completion':
      setState({ screen: 'timeline' });
      break;
  }
}

function _syncTonePicker(idx) {
  document.querySelectorAll('.tone-btn').forEach(btn => {
    btn.classList.toggle('active', Number(btn.dataset.tone) === idx);
  });
}

function _setSlider(f, v) {
  const sl = document.querySelector(`.slider-group[data-field="${f}"] .rating-slider`);
  const vl = document.querySelector(`.slider-group[data-field="${f}"] .slider-value`);
  if (sl) sl.value = v;
  if (vl) vl.textContent = String(v);
}

function _resetPriority() {
  [0, 1, 2].forEach(i => {
    const inp = document.getElementById(`s1-text-${i}`);
    if (inp) inp.value = '';
    _setSlider(i, 0);
    document.querySelector(`.skill1-check[data-field="${i}"]`)?.classList.remove('confirmed');
  });
}

function _readPriority() {
  return [0, 1, 2].map(i => {
    const text = document.getElementById(`s1-text-${i}`)?.value.trim() ?? '';
    const rating = document.querySelector(`.slider-group[data-field="${i}"] .rating-slider`)?.value ?? '0';
    return text ? `${text} — ${rating}/10` : '';
  }).filter(Boolean).join('\n');
}

function _fillPriorityFromAnswer(answer) {
  answer.split('\n').forEach((line, i) => {
    const m = line.match(/^(.+) — (\d+)\/\d+$/);
    const inp = document.getElementById(`s1-text-${i}`);
    if (inp) inp.value = m ? m[1] : line;
    if (m) _setSlider(i, m[2]);
  });
}

function _fillPriorityFromSuggestion(entries) {
  entries.forEach((entry, i) => {
    const locked = document.querySelector(`.skill1-check[data-field="${i}"]`)?.classList.contains('confirmed');
    if (locked) return;
    const inp = document.getElementById(`s1-text-${i}`);
    if (inp) inp.value = entry.text;
    _setSlider(i, entry.rating);
  });
}
