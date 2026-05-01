const _state = {
  screen: 'onboarding',
  scenario: null,
  step: 0,
  answers: ['', '', '', '', '', ''],
  suggestionIndex: -1,
  audioStep: 0,
  audioScenario: null,
  activeSession: null,
};

const listeners = new Set();

export function getState() {
  return { ..._state, answers: [..._state.answers] };
}

export function setState(patch) {
  Object.assign(_state, patch);
  const snap = getState();
  listeners.forEach(fn => fn(snap));
}

export function subscribe(fn) {
  listeners.add(fn);
}
