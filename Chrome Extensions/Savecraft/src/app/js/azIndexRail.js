// ===== A-Z JUMP INDEX (right-edge rail) =====
// A vertical A→Z (+ "#") index pinned to the right edge of the grid area, per direct request —
// tap or drag a letter to jump straight to that section of the current list, mirroring the
// familiar iOS Contacts / Spotify library pattern. Generic across every flat card-list view
// (categories, folders, Saved Lists, curated genres, Music genre buckets, search results, ...)
// rather than built per-page — updateAzIndexRail() is called once at the end of every
// renderGrid() (renderGrid.js), and just inspects the DOM afterward to decide whether to show
// itself, instead of threading a flag through each view branch. Shown only when the page actually
// has room to scroll, per direct follow-up ("i only want it to appear if the page scrolls") — a
// short list has nothing for a jump index to usefully do.

import { state } from './state.js';
import { handleSort } from './main.js';

const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#'];

// Reads the group letter straight off the rendered card (its .card-title/.card-author text)
// rather than looking the item up in state.items — this way it always matches exactly what's on
// screen (including author-link-styled cards, which use .card-author instead of .card-title),
// with no risk of drifting out of sync with whatever renderCard() actually produced.
function _cardGroupLetter(card) {
  const text = (card.querySelector('.card-title, .card-author')?.textContent || '').trim();
  const ch = text[0]?.toUpperCase() || '';
  return /[A-Z]/.test(ch) ? ch : '#';
}

function _positionRail(rail, gridArea) {
  // position: fixed, recomputed against .grid-area's own live rect, rather than position: sticky
  // — .grid-area's children (#grid-title/.grid-header/#cards-grid) are stacked block rows, not a
  // flex row the rail could sit beside, so sticky would just push in as its own full-width row
  // instead of hugging the right edge. A floating overlay recomputed on render/resize is the more
  // surgical fix here, same idea as this codebase's other floating-tooltip positioning.
  const rect = gridArea.getBoundingClientRect();
  rail.style.top = `${rect.top}px`;
  rail.style.height = `${rect.height}px`;
  rail.style.right = `${Math.max(0, window.innerWidth - rect.right) + 4}px`;
}

export function updateAzIndexRail() {
  const rail = document.getElementById('az-index-rail');
  const gridArea = document.querySelector('.grid-area');
  const container = document.getElementById('cards-grid');
  if (!rail || !gridArea || !container) return;

  // Only real item cards count — landing/hero pages (Music genre picker, curated hero, Dashboard,
  // Kanban, ...) never render .card elements into #cards-grid at all, so this alone already
  // excludes every one of those without needing to check state.view. Checked before the
  // scrollHeight/clientHeight read below (rather than in the same expression) since that read
  // forces a synchronous layout reflow — this function runs on every single renderGrid() call, so
  // skipping it outright on the many renders that can't possibly have cards (every non-list page)
  // avoids paying for a reflow whose result would just be discarded anyway.
  const hasCards = !!container.querySelector('.card');
  if (!hasCards) {
    rail.hidden = true;
    return;
  }
  const overflows = gridArea.scrollHeight > gridArea.clientHeight + 1;
  rail.hidden = !overflows;
  if (!rail.hidden) _positionRail(rail, gridArea);
}

function _jumpToLetter(letter, { smooth }) {
  const gridArea = document.querySelector('.grid-area');
  const container = document.getElementById('cards-grid');
  if (!gridArea || !container) return;

  // A letter jump only means something against an alphabetized list — same-lettered cards
  // wouldn't be contiguous under any other sort (newest/oldest/release date), so this switches to
  // A→Z first (updating the real #sort-select too, so it stays truthful, not just state) via the
  // same handleSort() the dropdown itself uses (main.js) — REAL BUG, found and fixed: this used to
  // hand-roll its own "set state.sort + renderGrid()" instead, which skipped handleSort's own
  // persistSort() call, so a letter-triggered switch to A→Z silently reverted to the previous sort
  // on reload instead of sticking the way choosing it from the dropdown does. Re-render is
  // synchronous enough that the fresh .card list is ready immediately after.
  if (state.sort !== 'az') {
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) sortSelect.value = 'az';
    handleSort('az');
  }

  const cards = [...container.querySelectorAll('.card')];
  if (!cards.length) return;
  const groups = cards.map(card => ({ card, letter: _cardGroupLetter(card) }));
  // Exact match first; otherwise the next available letter after it, then finally just the last
  // card — so tapping a letter nothing starts with (e.g. "Q" in a library with no Q artists)
  // still lands somewhere sensible instead of doing nothing.
  const target = groups.find(g => g.letter === letter)
    || groups.find(g => g.letter > letter)
    || groups[groups.length - 1];
  target.card.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' });
}

let _dragging = false;
export function initAzIndexRail() {
  const rail = document.getElementById('az-index-rail');
  if (!rail) return;
  rail.innerHTML = LETTERS.map(l => `<button type="button" class="az-index-letter" data-letter="${l}">${l}</button>`).join('');

  const letterAt = clientY => {
    const btn = [...rail.querySelectorAll('.az-index-letter')].find(b => {
      const r = b.getBoundingClientRect();
      return clientY >= r.top && clientY <= r.bottom;
    });
    return btn?.dataset.letter || null;
  };

  // pointerdown alone covers a plain tap; pointermove (while captured) turns that same gesture
  // into continuous drag-to-scrub across letters without lifting, matching the reference pattern.
  // Drag moves use behavior: 'auto' (instant) rather than 'smooth' — a smooth scroll re-triggered
  // on every pointermove fights its own prior animation and reads as janky; a single tap still
  // gets the smooth version since there's only one target to animate to.
  rail.addEventListener('pointerdown', e => {
    _dragging = true;
    rail.setPointerCapture(e.pointerId);
    const letter = letterAt(e.clientY);
    if (letter) _jumpToLetter(letter, { smooth: true });
  });
  rail.addEventListener('pointermove', e => {
    if (!_dragging) return;
    const letter = letterAt(e.clientY);
    if (letter) _jumpToLetter(letter, { smooth: false });
  });
  rail.addEventListener('pointerup', () => { _dragging = false; });
  rail.addEventListener('pointercancel', () => { _dragging = false; });

  window.addEventListener('resize', updateAzIndexRail);
}
