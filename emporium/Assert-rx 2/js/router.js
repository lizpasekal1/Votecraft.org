import { subscribe } from './state.js';

const FLOW = new Set(['prompt', 'response', 'timeline', 'audio', 'completion']);
const NO_BACK = new Set(['onboarding', 'grid']);

export function initRouter() {
  subscribe(state => {
    // Show active screen
    document.querySelectorAll('[data-screen]').forEach(el => {
      el.classList.toggle('active', el.dataset.screen === state.screen);
    });

    // Progress bar (only during prompt/response)
    const bar = document.getElementById('progress-bar');
    const fill = document.getElementById('progress-fill');
    if (bar && fill) {
      const inFlow = state.screen === 'prompt' || state.screen === 'response';
      bar.hidden = !inFlow;
      if (inFlow) {
        const pct = ((state.step + (state.screen === 'response' ? 0.5 : 0)) / 6) * 100;
        fill.style.width = pct + '%';
      }
    }

    // Back button
    const back = document.getElementById('btn-back');
    if (back) back.hidden = NO_BACK.has(state.screen);

    // Exit button
    const exit = document.getElementById('btn-exit');
    if (exit) exit.hidden = !FLOW.has(state.screen);

    // Bottom nav
    const nav = document.getElementById('bottom-nav');
    if (nav) nav.hidden = FLOW.has(state.screen) || state.screen === 'onboarding';
  });
}
