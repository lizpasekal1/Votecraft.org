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
export function openSwitchConfirm({ name, subtitle, icon, iconColor, leadText = "You're opening", leadColor, openLabel = 'Open', onConfirm }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal vc-wallet-modal" style="position:relative; width:360px;">
      ${name ? `<div class="modal-header"><h2><span class="vc-wallet-modal-title-lead"${leadColor ? ` style="color:${escapeHtml(leadColor)}"` : ''}>${escapeHtml(leadText)}</span><span class="vc-wallet-modal-title-emphasis">${escapeHtml(name)}</span></h2></div>` : ''}
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
