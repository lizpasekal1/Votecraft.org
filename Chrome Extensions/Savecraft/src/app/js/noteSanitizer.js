// ===== NOTE RICH-TEXT SANITIZER =====
// Allow-list based: everything not explicitly allowed is unwrapped (its text/children are kept,
// spliced into its parent) rather than deleted outright, and every attribute is stripped off
// whatever survives — none of our allowed tags need one, EXCEPT IMG (below), which needs a real
// `src` to be anything but a broken image — everything else about it (style=, class=, on*=) is
// still stripped like every other tag.
// Parsed via a disconnected <template> — its .content is an inert DocumentFragment, so a nested
// <script>/<img onerror>/etc. never executes or fetches even transiently during the walk.
const ALLOWED_TAGS = new Set(['B', 'MARK', 'UL', 'LI',
  // BR is a deliberate addition beyond the literal bold/highlight/bullet spec: Chrome's
  // contenteditable wraps every Enter-created line in a <div> (or <p>, from external paste) by
  // default. Without *some* surviving representation of "line break", a multi-line note collapses
  // into one run-on line the first time it round-trips through save -> reload.
  'BR',
  // User-pasted image links (My Notes toolbar's image button) — see ALLOWED_ATTRS/src validation
  // below for why this doesn't just open up an XSS hole the other allowed tags don't have.
  'IMG',
  // Real hyperlinks — survives a rich-text paste that already contains an <a> (e.g. a link copied
  // off a webpage), and _linkifyTextNodes below also creates these from plain-text URLs the user
  // types or pastes as text. See ALLOWED_ATTRS/SAFE_LINK_HREF for the same "only a safe scheme
  // survives" treatment IMG's src gets.
  'A']);
// Only IMG/A need an attribute to survive at all; every other allowed tag still gets every
// attribute stripped, same as before.
// data-audio-id/data-duration: an inline voice-note marker (voiceNotes.js) is just an IMG whose
// src is a small fixed SVG icon (see MARKER_ICON_SRC there) — these two are what actually
// identify which IndexedDB-stored clip it points to and how long it runs. Neither is ever
// rendered/executed as anything but a plain string read back off the element, so there's no new
// XSS surface from letting them survive — same reasoning as src/alt above.
const ALLOWED_ATTRS = { IMG: new Set(['src', 'alt', 'data-audio-id', 'data-duration']), A: new Set(['href']) };
// http(s)/data:image only — rules out `javascript:`/`vbscript:`/bare `on*=`-style payloads riding
// in through what's supposed to be a plain image URL. Browsers don't execute `src="javascript:"`
// on an <img> the way they would on an <a href>, but this is cheap insurance against a browser
// quirk or a future refactor that renders the src somewhere less safe (e.g. as a link too).
const SAFE_IMG_SRC = /^(https?:|data:image\/)/i;
// http(s) only for links — stricter than SAFE_IMG_SRC (no data:), since a clicked <a href> can
// navigate/execute in a way an <img src> can't; javascript:/data:text-html/vbscript: etc. all fail
// this and get the tag unwrapped (see _walk below).
const SAFE_LINK_HREF = /^https?:/i;
// Auto-linkify plain-text URLs the user types or pastes as text (not already-real <a> tags from
// rich-text paste, which _walk lets straight through) — run once per sanitize, after _walk, so it
// only ever sees text that's already survived every other allow-list check.
const URL_RE = /\bhttps?:\/\/[^\s<>"']+/gi;
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
      const keepAttrs = ALLOWED_ATTRS[node.tagName];
      Array.from(node.attributes).forEach(a => {
        if (!keepAttrs || !keepAttrs.has(a.name.toLowerCase())) node.removeAttribute(a.name);
      });
      // No valid src left (never had one, or it failed the scheme check) — a bare, broken <img>
      // isn't useful note content, so drop it entirely rather than leaving a broken-image icon.
      if (node.tagName === 'IMG' && !SAFE_IMG_SRC.test(node.getAttribute('src') || '')) {
        parent.removeChild(node);
        return;
      }
      // Unsafe/missing href — unlike IMG, unwrap rather than delete: the link's visible text is
      // still real note content even once the (unsafe) tag itself is gone.
      if (node.tagName === 'A' && !SAFE_LINK_HREF.test(node.getAttribute('href') || '')) {
        while (node.firstChild) parent.insertBefore(node.firstChild, node);
        parent.removeChild(node);
        return;
      }
      return;
    }
    const addBreak = BLOCK_TAGS_UNWRAP_TO_BR.has(node.tagName) && node.nextSibling;
    while (node.firstChild) parent.insertBefore(node.firstChild, node);
    if (addBreak) parent.insertBefore(document.createElement('br'), node);
    parent.removeChild(node);
  });
}

// Wraps plain-text http(s) URLs in a real <a href> — text nodes only, and skipped inside an
// existing <a> (rich-text paste already produced a real link there; don't double-wrap it).
// Trims common trailing sentence punctuation (".", ")", etc.) off the match so "see example.com."
// or "(example.com)" doesn't pull it into the link.
function _linkifyTextNodes(parent) {
  Array.from(parent.childNodes).forEach(node => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.tagName !== 'A') _linkifyTextNodes(node);
      return;
    }
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent;
    URL_RE.lastIndex = 0;
    if (!URL_RE.test(text)) return;
    URL_RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIndex = 0, match;
    while ((match = URL_RE.exec(text))) {
      let url = match[0];
      const trailing = url.match(/[.,;:!?)\]}'"]+$/);
      if (trailing) url = url.slice(0, -trailing[0].length);
      if (!url) continue;
      if (match.index > lastIndex) frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.textContent = url;
      frag.appendChild(a);
      lastIndex = match.index + url.length;
    }
    if (lastIndex < text.length) frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    if (frag.childNodes.length) node.parentNode.replaceChild(frag, node);
  });
}

export function sanitizeNoteHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  _walk(template.content);
  _linkifyTextNodes(template.content);
  return template.innerHTML;
}

// Visible-text-only view of a (possibly-HTML) note, for "does this row have a note" checks —
// reads through tags rather than trusting a raw string's .trim() (a raw string like
// "<ul><li></li></ul>" isn't empty as a string but has no visible content).
// NOTE: blind to <img> — an image-only note has real visible content but no text, so callers
// that need a true "is this row empty" check should use noteHtmlHasContent below instead.
export function plainTextFromNoteHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  return (template.content.textContent || '').trim();
}

// "Does this note have anything worth keeping" — true visible text OR an inserted image (My
// Notes toolbar's image button). Used wherever plainTextFromNoteHtml's result was only ever
// checked for truthiness (has-note styling, whether to persist vs. delete a row's saved text) —
// an image-only note is real content and shouldn't be treated as empty just because it has no text.
// Parses `html` once (not via plainTextFromNoteHtml + a second parse) since both checks need the
// same parsed tree anyway.
export function noteHtmlHasContent(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  return !!(template.content.textContent || '').trim() || !!template.content.querySelector('img');
}

// Everything a note-listing UI (Profile page's My Notes widget) needs to know about one note's
// content, in a single parse — the three content types a sanitized note can hold are each
// unambiguous to detect given ALLOWED_TAGS/ALLOWED_ATTRS above: a voice-note marker is an IMG
// with data-audio-id (see voiceNotes.js), a plain pasted image is any other IMG (only ever
// produced by the toolbar's insert-image-link button), and a link is any A (sanitizeNoteHtml
// strips every other attribute off A, so href presence alone is sufficient).
export function inspectNoteHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html || '';
  const content = template.content;
  return {
    hasContent: !!(content.textContent || '').trim() || !!content.querySelector('img'),
    hasVoice: !!content.querySelector('img[data-audio-id]'),
    hasImage: !!content.querySelector('img:not([data-audio-id])'),
    hasLink: !!content.querySelector('a[href]'),
  };
}
