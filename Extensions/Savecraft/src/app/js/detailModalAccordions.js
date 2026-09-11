// ===== DETAIL MODAL: SHARED ACCORDION REGISTRY =====
// Replaces the ~7 near-duplicated "close every other accordion" blocks that used to be scattered
// across the detail modal's Summary/Notes/Tracklist/Streaming/Queue sections, each hand-listing
// every OTHER section's header/body elements. Every section registers itself once during setup;
// closeAccordionsExcept() then closes whatever's currently registered except the one named.

const registry = new Map();

// Must run at the top of every openDetailModal() call, not just for hygiene — openDetailModal()
// can be re-entered while already open (e.g. clicking a related-album row), and a stale registry
// entry from the previous item would otherwise still be closed/left alone incorrectly.
export function resetAccordions() {
  registry.clear();
}

// Streaming/Queue register with header === body (they're single elements, no separate header
// node) — closeAccordionsExcept() still works fine, since removing a class twice from the same
// element is a no-op.
export function registerAccordion(name, header, body) {
  registry.set(name, { header, body });
}

export function closeAccordionsExcept(name) {
  for (const [key, { header, body }] of registry) {
    if (key === name) continue;
    header.classList.remove('open');
    body.classList.remove('open');
  }
}
