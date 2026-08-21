// ===== Save confirmation toast =====
// Shown once an item is actually saved (Add or Edit), reassuring the user where it landed and
// offering a one-tap way to go preview it, per direct request: "once the item is saved i want a
// confirmation state. something like 'Your save is in the (category)' 'preview it there'".
// Deliberately a self-dismissing toast, not a blocking popup like openSwitchConfirm (confirmModal.js)
// — a successful save should never require the user to dismiss anything before continuing.

import { state, CAT_LABEL } from './state.js';
import { escapeHtml } from './utils.js';
import { navigateToView } from './navigation.js';
import { openDetailModal } from './detailModal.js';

let _toastTimer = null;

export function showSaveConfirmationToast(item) {
  const el = document.getElementById('save-toast');
  if (!el) return;
  clearTimeout(_toastTimer);

  const catLabel = CAT_LABEL[item.category] || item.category;
  // A folder-filed item names its folder too (e.g. "Sources → Websites"), so "View" lands
  // somewhere specific rather than just the category's default/primary folder.
  const folder = item.folderId ? state.folders.find(f => f.id === item.folderId) : null;
  const locationLabel = folder ? `${catLabel} &rarr; ${escapeHtml(folder.name)}` : escapeHtml(catLabel);

  el.innerHTML = `
    <span class="save-toast-text">Your save is in <strong>${locationLabel}</strong>.</span>
    <button type="button" class="save-toast-action" id="save-toast-preview">View</button>
    <button type="button" class="save-toast-close" id="save-toast-close" aria-label="Dismiss">
      <svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
    </button>`;
  el.classList.add('open');

  // mousedown+preventDefault, same trick used throughout the Add/Edit modal's own result
  // rows/buttons — keeps whatever currently has focus from stealing it back and re-triggering a
  // blur handler before the click is handled. Navigates to the item's actual folder location
  // (falling back to the plain category view when unfoldered) so the grid behind the modal is
  // already showing where the card lives once the modal itself is closed.
  el.querySelector('#save-toast-preview').addEventListener('mousedown', e => {
    e.preventDefault();
    hideSaveConfirmationToast();
    navigateToView(item.folderId || item.category);
    openDetailModal(item);
  });
  el.querySelector('#save-toast-close').addEventListener('mousedown', e => {
    e.preventDefault();
    hideSaveConfirmationToast();
  });

  _toastTimer = setTimeout(hideSaveConfirmationToast, 5000);
}

export function hideSaveConfirmationToast() {
  const el = document.getElementById('save-toast');
  if (el) el.classList.remove('open');
  clearTimeout(_toastTimer);
}
