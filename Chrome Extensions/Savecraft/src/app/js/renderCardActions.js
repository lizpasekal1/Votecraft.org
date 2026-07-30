// ===== QUICK "ADD TO QUEUE" CARD BUTTON (grid, author page, curated landing rows) =====

import { state, CURATED_ITEMS, BOOKMARK_OUTLINE_SVG, BOOKMARK_FILLED_SVG } from './state.js';
import { persistItem } from './storage.js';
import { ensureLiveItem } from './authors.js';

// Quick "add to queue" button on curated cards (see renderCard()) — promotes the curated item
// into a real personal one via the shared ensureLiveItem() and queues it immediately, without
// opening the detail modal; tapping it again un-queues it (queueStatus back to null — same as
// the Kanban board's own remove-from-queue, doesn't delete the now-personal item entirely).
// Live-patches just this button afterward (icon + active state) rather than a full re-render,
// same technique patchCardImage() already uses elsewhere.
export function wireQuickQueueButtons(container) {
  // The Top 100 landing page's rows triple every item for the carousel's infinite-scroll
  // illusion (renderCuratedGenreLanding()), so the same item's bookmark can appear more than
  // once in the same container — patch every matching copy, not just the one actually clicked,
  // so they never fall out of sync with each other. A no-op generalization for every other
  // caller, where an item only ever appears once.
  function setButtonState(matchBtn, active) {
    container.querySelectorAll(`.card-quick-queue-btn[data-id="${matchBtn.dataset.id}"]`).forEach(b => {
      b.classList.toggle('card-quick-queue-btn--active', active);
      b.title = active ? 'In your queue' : 'Add to queue';
      b.innerHTML = active ? BOOKMARK_FILLED_SVG : BOOKMARK_OUTLINE_SVG;
    });
  }

  container.querySelectorAll('.card-quick-queue-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const isActive = btn.classList.contains('card-quick-queue-btn--active');
      if (isActive) {
        const liveItem = state.items.find(i => i.id === btn.dataset.id);
        if (!liveItem) return;
        liveItem.queueStatus = null;
        await persistItem(liveItem);
        setButtonState(btn, false);
        return;
      }
      let item = state.items.find(i => i.id === btn.dataset.id);
      if (!item) {
        for (const genre of Object.keys(CURATED_ITEMS)) {
          for (const cat of Object.keys(CURATED_ITEMS[genre])) {
            const found = CURATED_ITEMS[genre][cat].find(i => i.id === btn.dataset.id);
            if (found) { item = { ...found, category: cat, curated: true }; break; }
          }
          if (item) break;
        }
      }
      if (!item) return;
      const liveItem = await ensureLiveItem(item);
      liveItem.queueStatus = 'in-queue';
      await persistItem(liveItem);
      setButtonState(btn, true);
    });
  });
}
