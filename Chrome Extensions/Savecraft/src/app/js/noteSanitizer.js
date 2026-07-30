// ===== NOTE RICH-TEXT SANITIZER =====
// Allow-list based: everything not explicitly allowed is unwrapped (its text/children are kept,
// spliced into its parent) rather than deleted outright, and every attribute is stripped off
// whatever survives — none of our allowed tags ever need one (no style=, class=, on*=, href=).
// Parsed via a disconnected <template> — its .content is an inert DocumentFragment, so a nested
// <script>/<img onerror>/etc. never executes or fetches even transiently during the walk.
const ALLOWED_TAGS = new Set(['B', 'MARK', 'UL', 'LI',
  // BR is a deliberate addition beyond the literal bold/highlight/bullet spec: Chrome's
  // contenteditable wraps every Enter-created line in a <div> (or <p>, from external paste) by
  // default. Without *some* surviving representation of "line break", a multi-line note collapses
  // into one run-on line the first time it round-trips through save -> reload.
  'BR']);
// Block-level wrappers get unwrapped like anything else disallowed, but with a trailing <br>
// inserted first so the line break they represented isn't silently lost.
const BLOCK_TAGS_UNWRAP_TO_BR = new Set(['DIV', 'P']);
// Their text content was never meant to be visible note text (a script body, CSS rules) — delete
// the whole subtree rather than unwrapping it, or that text would leak into the note as if the
// user had typed it.
const DELETE_TAGS = new Set(['SCRIPT', 'STYLE']);

function _walk(parent) {
  Array.from(parent.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) { parent.removeChild(node); return; } // comments etc.
    if (DELETE_TAGS.has(node.tagName)) { parent.removeChild(node); return; }
    _walk(node); // clean children first, whether this node survives or gets unwrapped
    if (ALLOWED_TAGS.has(node.tagName)) {
      Array.from(node.attributes).forEach(a => node.removeAttribute(a.name));
      return;
    }
    const addBreak = BLOCK_TAGS_UNWRAP_TO_BR.has(node.tagName) && node.nextSibling;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    if (addBreak) parent.insertBefore(document.createElement('br'), node);
    parent.removeChild(node);
  });
}

export function sanitizeNoteHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  _walk(template.content);
  return template.innerHTML;
}

// Visible-text-only view of a (possibly-HTML) note, for "does this row have a note" checks —
// reads through tags rather than trusting a raw string's .trim() (a raw string like
// "<ul><li></li></ul>" isn't empty as a string but has no visible content).
export function plainTextFromNoteHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  return (template.content.textContent || '').trim();
}
