// ===== SHARED "YOU'RE OPENING X" CONFIRMATION POPUP =====
// A small transient confirm/cancel modal, reused wherever tapping something should pause for a
// lightweight confirmation before actually switching to it — sidebar Saved Lists/Curated Lists
// radio rows, Shared Saves cards — rather than each caller hand-rolling its own modal create/
// append/remove lifecycle. Modeled on profile.js's own _openTransientModal/VC Connector popup
// (same visual language, white modal-actions row, Cancel/primary-action pair); kept as its own
// small file rather than importing profile.js's private copy, so files outside the Profile page
// (renderSidebar.js, sharedSaves.js) don't need a cross-feature import just for this.

import { escapeHtml } from './utils.js';

// icon/iconColor: optional — a small circle (matching the vertical-card avatar circles on Shared
// Saves, or a list's own purple icon badge in the sidebar) shown below the title, so the popup
// carries some visual identity for what's being opened rather than just its name. iconColor
// defaults to SaveCraft purple (var(--primary)) — the same default the sidebar's own list-icon
// badges use — when a caller has no more specific color of its own (e.g. a sidebar list, which
// isn't independently colored the way a Shared Saves card's avatar already is).
// leadText: the small line above the name — defaults to "You're opening" (matches the sidebar's
// own Saved Lists popup and VC Connector's separate hardcoded one); Shared Saves' cards pass
// "Opening saves by:" instead, per direct request, since "opening" a person/group there reads
// better as "opening saves BY that person/group" than "opening [a name]" on its own.
// leadColor: optional override for that same line's color (defaults to the shared dark #111827) —
// Shared Saves' cards pass SaveCraft purple, per direct request, without changing the sidebar's
// own "You're opening"/VC Connector's existing color.
// openLabel: the primary button's text — defaults to "Open" (sidebar Saved Lists); Shared Saves'
// cards pass "Explore" instead, per direct request.
// name: optional — omit for a plain message-only confirm (no title/icon at all), e.g. "return to
// Dashboard?" style prompts that aren't about opening a specific named thing.
// leadText: pass '' (not just omit — the default is "You're opening", not empty) to show name
// alone as a plain title with no lead line above it at all, e.g. "Entering Dashboard" — the
// h2's own flex-column layout (profile.css) would otherwise leave a stray empty line/gap where
// the lead span used to be.
export function openSwitchConfirm({ name, subtitle, icon, iconColor, leadText = "You're opening", leadColor, openLabel = 'Open', onConfirm }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  const leadHtml = leadText
    ? `<span class="vc-wallet-modal-title-lead"${leadColor ? ` style="color:${escapeHtml(leadColor)}"` : ''}>${escapeHtml(leadText)}</span>`
    : '';
  overlay.innerHTML = `
    <div class="modal vc-wallet-modal" style="position:relative; width:360px;">
      ${name ? `<div class="modal-header"><h2>${leadHtml}<span class="vc-wallet-modal-title-emphasis">${escapeHtml(name)}</span></h2></div>` : ''}
      ${icon ? `<div class="switch-confirm-icon" style="background:${escapeHtml(iconColor || 'var(--primary)')}">${icon}</div>` : ''}
      <div class="modal-body">
        <p>${escapeHtml(subtitle)}</p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-cancel" id="switch-confirm-cancel">Cancel</button>
        <button type="button" class="btn-primary" id="switch-confirm-open">${escapeHtml(openLabel)}</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#switch-confirm-cancel').addEventListener('click', close);
  overlay.querySelector('#switch-confirm-open').addEventListener('click', () => { close(); onConfirm(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

// ===== SHARED "ARE YOU SURE?" YES/NO CONFIRM (replaces native confirm()) =====
// Per direct request ("make it so these types of popup messages always appear in the center of
// the screen") — a native window.confirm() is positioned entirely by the browser/OS, not by this
// page's CSS, so it can't be guaranteed centered (some browser chrome/embedded-webview contexts
// anchor it elsewhere, e.g. top-left, or show it as a thin OS-level bar rather than a real centered
// dialog). This reuses the exact same .modal-overlay (position: fixed; inset: 0; display: flex;
// align-items/justify-content: center — addEditModal.css) every other modal in the app already
// centers itself with, so it's guaranteed to sit in the middle of the viewport regardless of page
// scroll position or where on the page the triggering button was.
// Returns a Promise<boolean> — every call site awaits it exactly where it used to check confirm()'s
// own return value, so `if (!(await confirmDialog(...))) return;` is a drop-in replacement.
export function confirmDialog(message, { title = 'Are you sure?', confirmLabel = 'Delete', cancelLabel = 'Cancel' } = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay open';
    overlay.innerHTML = `
      <div class="modal confirm-dialog-modal" style="position:relative;">
        <div class="modal-header"><h2>${escapeHtml(title)}</h2></div>
        <div class="modal-body">
          <p>${escapeHtml(message)}</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-cancel" id="confirm-dialog-cancel">${escapeHtml(cancelLabel)}</button>
          <button type="button" class="btn-primary btn-danger" id="confirm-dialog-ok">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const finish = result => { overlay.remove(); resolve(result); };
    overlay.querySelector('#confirm-dialog-cancel').addEventListener('click', () => finish(false));
    overlay.querySelector('#confirm-dialog-ok').addEventListener('click', () => finish(true));
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(false); });
    // Esc cancels, matching a native confirm()'s own Esc-to-dismiss behavior. One-shot listener
    // (not removed on Enter/click-away) is harmless — the overlay is already gone by the time a
    // second Escape could ever reach this handler, and finish() only resolves the promise once
    // (the caller's own subsequent code path, not this listener, decides what happens next).
    document.addEventListener('keydown', function onKey(e) {
      if (e.key !== 'Escape') return;
      document.removeEventListener('keydown', onKey);
      if (document.body.contains(overlay)) finish(false);
    });
  });
}
