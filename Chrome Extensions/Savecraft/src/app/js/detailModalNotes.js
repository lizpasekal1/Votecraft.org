// ===== DETAIL MODAL: MY NOTES + TRACKLIST/CHAPTERS ACCORDIONS =====
// Kept as one file/closure (not split further) because every category folds its numbered note
// list directly into the My Notes accordion — sharing its open/close state rather than being an
// independent accordion of their own.

import { state, CURATED_NOTES_CATEGORIES } from './state.js';
import { escapeHtml, debounce } from './utils.js';
import { persistItem } from './storage.js';
import { ensureAlbumTrackList, ensureLiveItem } from './authors.js';
import { getDetailItem } from './detailModal.js';
import { registerAccordion, closeAccordionsExcept } from './detailModalAccordions.js';
import { sanitizeNoteHtml, plainTextFromNoteHtml } from './noteSanitizer.js';

// Which note row (a .detail-tracklist-notes-input contenteditable) currently has focus, if any —
// drives the formatting toolbar's visibility/enabled state. _focusModeOn is an independent on/off
// toggle (survives a row blur) for hiding the image/website/bookmark/favorite/edit controls.
let _activeNoteRow = null;
let _focusModeOn = false;

// The browser's native "keep the focused/edited element visible" auto-scroll (fired by .focus()
// itself, or by typing into a growing contenteditable) has no idea the sticky title/toolbar
// re-covers #detail-body's top edge regardless of scroll position — it can happily land a row's
// top edge underneath it. Called after every .focus() on a note row (and after every height
// change in fitTracklistNote below) to nudge the scroll position back down whenever that happens.
function _correctScrollUnderToolbar(inputEl) {
  requestAnimationFrame(() => {
    const toolbarEl = document.getElementById('detail-note-toolbar');
    if (!inputEl || !toolbarEl || getComputedStyle(toolbarEl).display === 'none') return;
    const overlap = toolbarEl.getBoundingClientRect().bottom - inputEl.getBoundingClientRect().top;
    if (overlap > 0) document.getElementById('detail-body').scrollTop -= overlap;
  });
}

// "MY NOTES"/"SONG LIST" both use .detail-accordion-collapsible's shared max-height transition,
// which caps at a deliberately oversized value (320px/2000px, see detailModal.css) so open-ended
// content (more notes/chapters can always be added) never needs its own nested scrollbar. But a
// max-height transition always animates across its full numeric range regardless of how much of
// it the real content actually uses — so a short section reached its true size almost instantly
// while the (invisible) climb toward that cap kept the transition "running" for most of its
// stated duration, reading as a stall-then-jump rather than one continuous slide. Overriding
// max-height with the section's own real scrollHeight (measured while still collapsed —
// scrollHeight always reports the full content size regardless of the current
// max-height/overflow clipping) makes the transition animate exactly as far as it needs to, no
// further — the "sliding door" feel. Must be paired with clearing the inline override on close
// (see call sites below), or it'd permanently block the base rule's max-height: 0 from applying.
function _fitAccordionSection(el) {
  // Deferred a frame — same reasoning as fitTracklistNote below: measuring scrollHeight in the
  // exact same tick as the content/class change that triggered this can undercount it (mid-
  // layout), and, specifically for the track list, individual open rows' own heights (set via
  // fitTracklistNote, itself rAF-deferred) need to have already applied before this measures the
  // *section's* total height, or a previously-favorited track's expanded note gets missed.
  // Scheduling this rAF after theirs (call this after any per-row fitTracklistNote calls) is what
  // guarantees that ordering, since same-frame rAF callbacks run in the order they were queued.
  requestAnimationFrame(() => {
    el.style.maxHeight = `${el.scrollHeight}px`;
  });
}

// MY NOTES accordion icon: the plain notepad icon for every category, swapped for a book icon
// (matching the Chapters content it holds) on Book items only.
const NOTES_ICON_PATH = 'M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z';
const BOOK_NOTES_ICON_PATH = 'M560-564v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-600q-38 0-73 9.5T560-564Zm0 220v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-380q-38 0-73 9t-67 27Zm0-110v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-490q-38 0-73 9.5T560-454ZM260-320q47 0 91.5 10.5T440-278v-394q-41-24-87-36t-93-12q-36 0-71.5 7T120-692v396q35-12 69.5-18t70.5-6Zm260 42q44-21 88.5-31.5T700-320q36 0 70.5 6t69.5 18v-396q-33-14-68.5-21t-71.5-7q-47 0-93 12t-87 36v394Zm-40 118q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740q51-30 106.5-45T700-800q52 0 102 12t96 36q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59ZM280-494Z';
// Per-track/chapter/note/general "add a note" affordance — a pencil rather than a star, since
// clicking it opens a note-taking field, not a favorite. Single icon (color toggles via the
// shared --active class) since there's no separate outline/filled variant for it.
const NOTE_PENCIL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>`;

export function setupNotesAndTracklist(item, { isMusicAlbum, isMusicianItem, ctaAuthor }) {
  // Fresh state every time the modal opens on an item, so focus mode / an active row from a
  // previous item never leaks into this one.
  _activeNoteRow = null;
  _focusModeOn = false;
  document.querySelector('.modal.detail-modal').classList.remove('detail-modal--focus-mode', 'detail-modal--editing-note');
  document.getElementById('detail-body').classList.remove('detail-body--editing-note');

  const notesInputEl = document.getElementById('detail-notes-input');
  const notesAccordionHeaderEl = document.getElementById('detail-notes-accordion-header');
  const tracklistAccordionHeaderEl = document.getElementById('detail-tracklist-accordion-header');
  const tracklistEl = document.getElementById('detail-tracklist');
  // Every category's numbered "My Notes" list folds in here — separate from #detail-tracklist
  // (Music Album's own Song List, and Book's chapters, both still live there) since Music Album
  // needs both a Song List accordion *and* a numbered My Notes list at the same time.
  const notesListEl = document.getElementById('detail-notes-list');
  // Which element actually holds My Notes' visible content for this category — Book keeps using
  // #detail-tracklist (unchanged); every other category (including Music Album, alongside its
  // separate Song List) uses the new #detail-notes-list.
  const notesBodyEl = item.category === 'Book' ? tracklistEl : notesListEl;

  document.getElementById('detail-notes-accordion-icon').querySelector('path')
    .setAttribute('d', item.category === 'Book' ? BOOK_NOTES_ICON_PATH : NOTES_ICON_PATH);
  registerAccordion('notes', notesAccordionHeaderEl, notesBodyEl);
  // Curated (not-yet-saved) items in creator-linked categories stash the creator's name in
  // item.notes (see _detailAuthorName in detailModalHeader.js) — that's never real user notes, so
  // exclude it here or the row-0 fallback below would show the creator name instead of nothing.
  const _curatedNotesIsCreatorName = item.curated && CURATED_NOTES_CATEGORIES.includes(item.category);
  const text = (_curatedNotesIsCreatorName ? null : item.notes) || item.description || '';

  // The plain textarea is never shown anymore — every category now folds a numbered note list
  // (Chapter 0..N for Book, "Summary"/Note 1..N for everyone else) into this accordion instead.
  // Left in place (hidden, still debounce-saving to item.notes on the off chance anything else
  // still reads that field) rather than removed outright, same as Book's already did before this.
  notesInputEl.value = text;
  notesInputEl.style.display = 'none';
  notesAccordionHeaderEl.classList.remove('open');
  notesAccordionHeaderEl.style.display = '';
  notesAccordionHeaderEl.onclick = () => {
    const nowOpen = notesAccordionHeaderEl.classList.toggle('open');
    // The real content lives in notesBodyEl, not notesInputEl — folded into My Notes instead of
    // being its own accordion, so it opens/closes together with the header here rather than being
    // force-closed as an unrelated accordion like it is for other sections. (notesBodyEl is
    // registered above, but only so *other* sections' closeAccordionsExcept() calls can close it
    // — that mechanism doesn't fire for this header's own click, hence the explicit toggle here.)
    notesBodyEl.classList.toggle('open', nowOpen);
    if (nowOpen) {
      _fitAccordionSection(notesBodyEl);
    } else {
      notesBodyEl.style.maxHeight = '';
      _closeAllOpenRows(notesBodyEl, item.category === 'Book' ? 'chapterFavorites' : 'noteFavorites');
    }
    // The toggle above already changes notesBodyEl's 'open' class, which the MutationObserver set
    // up in initNoteToolbar() picks up and reacts to on its own (toolbar visibility, blurring any
    // focused row, exiting focus mode on close) — nothing further needed here for that.
    if (nowOpen) {
      closeAccordionsExcept('notes');
      const alreadyOpenRow = notesBodyEl.querySelector('.detail-tracklist-notes-input.open');
      alreadyOpenRow?.focus();
      _correctScrollUnderToolbar(alreadyOpenRow);
    }
  };

  const saveNotes = debounce(async () => {
    if (getDetailItem() !== item) return; // modal moved on to a different item before the debounce fired
    const newNotes = notesInputEl.value.trim() || null;
    let liveItem = state.items.find(i => i.id === item.id);
    if (!liveItem) liveItem = await ensureLiveItem(item);
    if (liveItem.notes === newNotes) return;
    liveItem.notes = newNotes;
    item.notes = newNotes;
    await persistItem(liveItem);
  }, 600);
  notesInputEl.oninput = saveNotes;

  tracklistAccordionHeaderEl.classList.remove('open');
  tracklistEl.classList.remove('open');
  notesListEl.classList.remove('open');

  // A <textarea> never auto-grows to fit its content — rows="2" always renders ~2 lines tall
  // and scrolls its own content internally, regardless of any max-height on the wrapper. Setting
  // an explicit height from scrollHeight is what actually makes it expand to fit each note.
  // .detail-body (flex: 1 + flex-shrink: 0 children) is the real scroll region now, so a note
  // that grows past the modal's available height scrolls the whole body instead of clipping.
  function fitTracklistNote(inputEl) {
    if (!inputEl) return;
    if (inputEl.classList.contains('open')) {
      // Deferred a frame — measuring scrollHeight in the exact same tick as the class/content
      // change that triggered this can catch the browser mid-layout (e.g. before the .open
      // padding or a not-yet-settled font metric applies), undercounting the height on the very
      // first open even though it then reads correctly on every subsequent call.
      requestAnimationFrame(() => {
        if (!inputEl.classList.contains('open')) return; // closed again before this frame ran
        inputEl.style.height = 'auto'; // reset first, or scrollHeight only ever grows, never shrinks
        // +2px buffer — scrollHeight rounds to a whole pixel, but line-height (1.4 * 13px =
        // 18.2px) isn't one, so that fractional rounding accumulates across several lines and
        // clips the descenders on the last line without a little slack.
        inputEl.style.height = `${inputEl.scrollHeight + 2}px`;
        _correctScrollUnderToolbar(inputEl);
      });
    } else {
      inputEl.style.height = '';
    }
  }

  // Closing "MY NOTES"/"SONG LIST" itself should reset any individual row left expanded inside
  // it — not just visually collapse it for now (the section's own max-height already does that),
  // but actually clear the persisted favorites too, so reopening later (this session or a future
  // one) starts fresh instead of that same row auto-reopening. favoritesField is whichever of
  // chapterFavorites/noteFavorites/favoriteTracks applies to this container.
  async function _closeAllOpenRows(container, favoritesField) {
    const openRows = container.querySelectorAll('.detail-tracklist-notes-input.open');
    if (openRows.length === 0) return;
    openRows.forEach(row => {
      row.classList.remove('open');
      fitTracklistNote(row);
      const hasNote = !!row.textContent.trim();
      row.closest('.detail-tracklist-item')?.querySelector('.detail-tracklist-favorite')
        ?.classList.toggle('detail-tracklist-favorite--active', hasNote);
    });
    const liveItem = await ensureLiveItem(item);
    liveItem[favoritesField] = [];
    await persistItem(liveItem);
  }

  // Shared by Book's Chapter list and every other category's Summary/Note list below — same UI (a
  // favorite star + collapsible per-row note, keyed by a row number, with a "+ Add" row at the end
  // and a row 0 that falls back to some starting text until the user actually edits it), just
  // different field names, labels, starting content, and target element. Not used for Music
  // Album's track list — that's sourced from a real, ordered iTunes track listing rather than
  // open-ended user-numbered rows, and lazily loaded on first expand rather than rendered up
  // front, so it stays its own thing.
  function renderNumberedNoteList(config) {
    const {
      target, countField, defaultCount, favoritesField, textsField, zeroSeededField,
      zeroLabel, rowLabel, // rowLabel: (num) => string — e.g. Book's `Chapter ${num}` vs the flat 'Note'
      notePlaceholder, addButtonLabel, addButtonId, zeroFallback,
      zeroNumberDisplay = '0', // row 0's number badge — Book keeps the literal '0', others use a bullet
    } = config;
    const liveItem = state.items.find(i => i.id === item.id);
    const count = liveItem?.[countField] || defaultCount;
    const favorites = liveItem?.[favoritesField] || [];
    const texts = liveItem?.[textsField] || {};
    // Row 0 shows the starting text (old general notes/bio) as a starting point until the user
    // actually edits it — the zeroSeeded flag (set the first time its textarea fires an input
    // event, even to clear it) stops that fallback from reappearing after an intentional clear.
    const showZeroFallback = !liveItem?.[zeroSeededField];
    const rows = Array.from({ length: count + 1 }, (_, i) => {
      const num = i;
      const isFav = favorites.includes(num);
      const rawNote = texts[num];
      const noteHtml = rawNote != null
        ? sanitizeNoteHtml(rawNote)
        : (num === 0 && showZeroFallback ? escapeHtml(zeroFallback) : '');
      const hasNote = !!plainTextFromNoteHtml(noteHtml);
      return `
      <div class="detail-tracklist-item">
        <div class="detail-tracklist-row">
          <span class="detail-tracklist-number${hasNote ? ' detail-tracklist-number--has-note' : ''}">${num === 0 ? zeroNumberDisplay : num}</span>
          <span class="detail-tracklist-title${hasNote ? ' detail-tracklist-title--has-note' : ''}">${num === 0 ? zeroLabel : rowLabel(num)}</span>
          <span class="detail-tracklist-favorite${isFav || hasNote ? ' detail-tracklist-favorite--active' : ''}" data-row-number="${num}">${NOTE_PENCIL_ICON}</span>
        </div>
        <div class="detail-tracklist-notes-input${isFav ? ' open' : ''}" data-row-number="${num}" data-placeholder="${escapeHtml(notePlaceholder)}" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${escapeHtml(notePlaceholder)}">${noteHtml}</div>
      </div>`;
    }).join('');
    target.innerHTML = `${rows}<button class="detail-tracklist-add-chapter" id="${addButtonId}">${addButtonLabel}</button>`;
    target.querySelectorAll('.detail-tracklist-notes-input.open').forEach(fitTracklistNote);

    // Bound to the whole row (not just the pencil) so tapping the row's label also opens/closes
    // the note — the pencil is still visually the "affordance" but isn't the only tap target.
    target.querySelectorAll('.detail-tracklist-row').forEach(rowEl => {
      const starEl = rowEl.querySelector('.detail-tracklist-favorite');
      if (!starEl) return;
      rowEl.addEventListener('click', () => {
        const rowNumber = Number(starEl.dataset.rowNumber);
        const thisItemEl = rowEl.closest('.detail-tracklist-item');
        const notesInput = thisItemEl?.querySelector('.detail-tracklist-notes-input');
        // Determined from the DOM's own current 'open' state, not from awaiting the persisted
        // favorites array — switching from one open row straight to another's pencil needs
        // .focus() to fire in the SAME synchronous tick as the click (immediately after the old
        // row's native blur), or the toolbar flickers closed in between. Awaiting ensureLiveItem/
        // persistItem first (real chrome.storage.sync.set I/O, not just a microtask) delayed
        // .focus() by enough that the earlier fix (deferring the blur handler's own cleanup by one
        // tick) wasn't reliably enough of a head start — this sidesteps the race entirely by never
        // blocking the visual update on the async save in the first place.
        const nowFav = !notesInput?.classList.contains('open');
        target.querySelectorAll('.detail-tracklist-item').forEach(otherItemEl => {
          if (otherItemEl === thisItemEl) return;
          const otherInput = otherItemEl.querySelector('.detail-tracklist-notes-input');
          otherInput?.classList.remove('open');
          fitTracklistNote(otherInput);
          const otherStar = otherItemEl.querySelector('.detail-tracklist-favorite');
          otherStar?.classList.toggle('detail-tracklist-favorite--active', !!otherInput?.textContent.trim());
        });
        const hasNote = !!notesInput?.textContent.trim();
        starEl.classList.toggle('detail-tracklist-favorite--active', nowFav || hasNote);
        notesInput?.classList.toggle('open', nowFav);
        fitTracklistNote(notesInput);
        // Closing this row via its own pencil no longer hides the toolbar or exits focus mode —
        // both are tied to whether "MY NOTES"/"SONG LIST" itself is open now (see
        // _updateNoteEditingUi), not to any individual row. Still blur (and clear _activeNoteRow
        // right away rather than waiting on the blur listener's own deferred cleanup) so the
        // format buttons correctly disable — nothing is focused to apply them to anymore.
        if (nowFav) {
          notesInput?.focus();
        } else {
          notesInput?.blur();
          if (_activeNoteRow === notesInput) _activeNoteRow = null;
          _updateNoteEditingUi();
        }
        // Async persistence happens after the visual/focus update above, not before — only one
        // note open at a time, so this also clears every other entry from the favorites list (not
        // just in the DOM) so a reload doesn't bring them all back.
        (async () => {
          const liveRowItem = await ensureLiveItem(item);
          liveRowItem[favoritesField] = nowFav ? [rowNumber] : [];
          await persistItem(liveRowItem);
        })();
      });
    });

    target.querySelectorAll('.detail-tracklist-notes-input').forEach(inputEl => {
      const saveRowNote = debounce(async () => {
        if (getDetailItem() !== item) return; // modal moved on to a different item before the debounce fired
        const rowNumber = Number(inputEl.dataset.rowNumber);
        const liveRowItem = await ensureLiveItem(item);
        const newTexts = { ...(liveRowItem[textsField] || {}) };
        // Computed for storage only — never written back into inputEl.innerHTML, or the cursor
        // would reset mid-typing. Rows are only ever re-rendered from stored data on explicit
        // user actions (modal open, "+ Add"), never mid-edit.
        const cleanHtml = sanitizeNoteHtml(inputEl.innerHTML);
        const noteText = plainTextFromNoteHtml(cleanHtml);
        if (noteText) newTexts[rowNumber] = cleanHtml; else delete newTexts[rowNumber];
        liveRowItem[textsField] = newTexts;
        // Any edit to row 0 (even clearing it) permanently stops the starting-text fallback from
        // reappearing on future renders.
        if (rowNumber === 0) liveRowItem[zeroSeededField] = true;
        await persistItem(liveRowItem);
      }, 500);
      inputEl.addEventListener('input', () => {
        // Number/title/pencil turn purple/bold immediately as the user types, rather than
        // waiting on the debounced save above to actually persist the note.
        const itemEl = inputEl.closest('.detail-tracklist-item');
        const hasNote = !!inputEl.textContent.trim();
        itemEl?.querySelector('.detail-tracklist-number')?.classList.toggle('detail-tracklist-number--has-note', hasNote);
        itemEl?.querySelector('.detail-tracklist-title')?.classList.toggle('detail-tracklist-title--has-note', hasNote);
        itemEl?.querySelector('.detail-tracklist-favorite')?.classList.toggle('detail-tracklist-favorite--active', hasNote || inputEl.classList.contains('open'));
        fitTracklistNote(inputEl);
        saveRowNote();
      });
      inputEl.addEventListener('click', e => e.stopPropagation());
      inputEl.addEventListener('focus', () => {
        _activeNoteRow = inputEl;
        _updateNoteEditingUi();
      });
      inputEl.addEventListener('blur', () => {
        if (!inputEl.textContent.trim()) inputEl.innerHTML = ''; // clear a stray auto-inserted <br> so :empty/placeholder work next time
        // Deferred: switching directly to a different row's pencil calls that row's .focus()
        // immediately, which fires THIS blur synchronously first — clearing _activeNoteRow (and
        // hiding the toolbar) here right away would flicker it closed before the other row's own
        // focus handler reclaims it a moment later. Waiting a tick lets that reclaim happen first;
        // only treat it as "nothing is focused anymore" if _activeNoteRow still points at this row
        // once that chance has passed.
        setTimeout(() => {
          if (_activeNoteRow === inputEl) {
            _activeNoteRow = null;
            _updateNoteEditingUi();
          }
        }, 0);
      });
      inputEl.addEventListener('paste', e => {
        e.preventDefault();
        const cd = e.clipboardData || window.clipboardData;
        const html = cd.getData('text/html');
        const clean = html ? sanitizeNoteHtml(html) : escapeHtml(cd.getData('text/plain'));
        document.execCommand('insertHTML', false, clean);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });

    document.getElementById(addButtonId).addEventListener('click', async e => {
      e.stopPropagation();
      const liveRowItem = await ensureLiveItem(item);
      liveRowItem[countField] = (liveRowItem[countField] || defaultCount) + 1;
      await persistItem(liveRowItem);
      renderNumberedNoteList(config);
    });
  }

  // ----- Part 1: #detail-tracklist — Music Album's own Song List accordion, or (Book only)
  // folded into My Notes as the chapters list, or otherwise unused and hidden. -----
  if (isMusicAlbum) {
    registerAccordion('tracklist', tracklistAccordionHeaderEl, tracklistEl);
    tracklistAccordionHeaderEl.querySelector('span').textContent = 'SONG LIST';
    tracklistAccordionHeaderEl.style.display = '';
    tracklistEl.style.display = '';
    tracklistEl.classList.add('detail-accordion-collapsible');
    tracklistEl.innerHTML = '';
    let _tracklistLoaded = false;
    tracklistAccordionHeaderEl.onclick = async () => {
      const nowOpen = tracklistAccordionHeaderEl.classList.toggle('open');
      tracklistEl.classList.toggle('open', nowOpen);
      if (!nowOpen) {
        tracklistEl.style.maxHeight = '';
        _closeAllOpenRows(tracklistEl, 'favoriteTracks');
        return;
      }
      // Revisiting an already-loaded list: its real height is known synchronously. First-time
      // load: this measures just the "Loading…" placeholder for now — re-measured again below
      // once the real tracks (or the "unavailable" message) replace it, since content loaded
      // async can't have its true height known any earlier than that.
      _fitAccordionSection(tracklistEl);
      closeAccordionsExcept('tracklist');
      if (_tracklistLoaded) return;
      _tracklistLoaded = true;
      tracklistEl.innerHTML = `<div class="detail-tracklist-row detail-tracklist-row--status">Loading…</div>`;
      const tracks = await ensureAlbumTrackList(item);
      if (getDetailItem() !== item) return; // modal moved on to a different item while awaiting
      if (!tracklistAccordionHeaderEl.classList.contains('open')) return; // user closed it already
      if (!tracks || tracks.length === 0) {
        tracklistEl.innerHTML = `<div class="detail-tracklist-row detail-tracklist-row--status">Track list unavailable</div>`;
        _fitAccordionSection(tracklistEl);
      } else {
        // Per-track favoriting/notes are stored on the item itself (favoriteTracks: a list of
        // track numbers; trackNotes: { [trackNumber]: text }) via ensureLiveItem() — deliberately
        // NOT the same path as Add to Queue, so liking a track never sets queueStatus and never
        // puts the item on the kanban board.
        const liveItemForTracks = state.items.find(i => i.id === item.id);
        const favoriteTracks = liveItemForTracks?.favoriteTracks || [];
        const trackNotes = liveItemForTracks?.trackNotes || {};
        tracklistEl.innerHTML = tracks.map(t => {
          const isFav = favoriteTracks.includes(t.number);
          const rawNote = trackNotes[t.number];
          const noteHtml = rawNote != null ? sanitizeNoteHtml(rawNote) : '';
          const hasNote = !!plainTextFromNoteHtml(noteHtml);
          return `
          <div class="detail-tracklist-item">
            <div class="detail-tracklist-row">
              <span class="detail-tracklist-number${hasNote ? ' detail-tracklist-number--has-note' : ''}">${t.number || ''}</span>
              <span class="detail-tracklist-title${hasNote ? ' detail-tracklist-title--has-note' : ''}">${escapeHtml(t.title || '')}</span>
              <span class="detail-tracklist-favorite${isFav || hasNote ? ' detail-tracklist-favorite--active' : ''}" data-track-number="${t.number}">${NOTE_PENCIL_ICON}</span>
            </div>
            <div class="detail-tracklist-notes-input${isFav ? ' open' : ''}" data-track-number="${t.number}" data-placeholder="Add a note for this track…" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Add a note for this track…">${noteHtml}</div>
          </div>`;
        }).join('');
        tracklistEl.querySelectorAll('.detail-tracklist-notes-input.open').forEach(fitTracklistNote);
        _fitAccordionSection(tracklistEl); // after the per-row rAFs above are queued, so this one runs after theirs — see its own comment
        // Bound to the whole row (not just the pencil) so tapping the track number or title also
        // opens/closes the note — the pencil is still visually the "affordance" but isn't the
        // only tap target.
        tracklistEl.querySelectorAll('.detail-tracklist-row').forEach(rowEl => {
          const starEl = rowEl.querySelector('.detail-tracklist-favorite');
          if (!starEl) return; // status rows ("Loading…" etc.) have no favorite icon
          rowEl.addEventListener('click', () => {
            const trackNumber = Number(starEl.dataset.trackNumber);
            const thisItemEl = rowEl.closest('.detail-tracklist-item');
            const notesInput = thisItemEl?.querySelector('.detail-tracklist-notes-input');
            // See the mirrored comment in the non-track-list favorite handler above — determined
            // from the DOM's own 'open' state so .focus() fires synchronously, not after awaiting
            // ensureLiveItem/persistItem first.
            const nowFav = !notesInput?.classList.contains('open');
            tracklistEl.querySelectorAll('.detail-tracklist-item').forEach(otherItemEl => {
              if (otherItemEl === thisItemEl) return;
              const otherInput = otherItemEl.querySelector('.detail-tracklist-notes-input');
              otherInput?.classList.remove('open');
              fitTracklistNote(otherInput);
              const otherStar = otherItemEl.querySelector('.detail-tracklist-favorite');
              otherStar?.classList.toggle('detail-tracklist-favorite--active', !!otherInput?.textContent.trim());
            });
            const hasNote = !!notesInput?.textContent.trim();
            starEl.classList.toggle('detail-tracklist-favorite--active', nowFav || hasNote);
            notesInput?.classList.toggle('open', nowFav);
            fitTracklistNote(notesInput);
            // See the mirrored comment in the non-track-list favorite handler above — closing this
            // row no longer hides the toolbar/exits focus mode, just clears the format buttons'
            // enabled state.
            if (nowFav) {
              notesInput?.focus();
            } else {
              notesInput?.blur();
              if (_activeNoteRow === notesInput) _activeNoteRow = null;
              _updateNoteEditingUi();
            }
            // Async persistence after the visual/focus update — same reasoning as above. Only one
            // track note open at a time, clearing every other entry from favoriteTracks (not just
            // in the DOM) so a reload doesn't bring them all back.
            (async () => {
              const liveTrackItem = await ensureLiveItem(item);
              liveTrackItem.favoriteTracks = nowFav ? [trackNumber] : [];
              await persistItem(liveTrackItem);
            })();
          });
        });
        tracklistEl.querySelectorAll('.detail-tracklist-notes-input').forEach(inputEl => {
          const saveTrackNote = debounce(async () => {
            if (getDetailItem() !== item) return; // modal moved on to a different item before the debounce fired
            const trackNumber = Number(inputEl.dataset.trackNumber);
            const liveTrackItem = await ensureLiveItem(item);
            const notes = { ...(liveTrackItem.trackNotes || {}) };
            const cleanHtml = sanitizeNoteHtml(inputEl.innerHTML);
            const text = plainTextFromNoteHtml(cleanHtml);
            if (text) notes[trackNumber] = cleanHtml; else delete notes[trackNumber];
            liveTrackItem.trackNotes = notes;
            await persistItem(liveTrackItem);
          }, 500);
          inputEl.addEventListener('input', () => {
            // Number/title/pencil turn purple/bold immediately as the user types, rather than
            // waiting on the debounced save below to actually persist the note.
            const itemEl = inputEl.closest('.detail-tracklist-item');
            const hasNote = !!inputEl.textContent.trim();
            itemEl?.querySelector('.detail-tracklist-number')?.classList.toggle('detail-tracklist-number--has-note', hasNote);
            itemEl?.querySelector('.detail-tracklist-title')?.classList.toggle('detail-tracklist-title--has-note', hasNote);
            itemEl?.querySelector('.detail-tracklist-favorite')?.classList.toggle('detail-tracklist-favorite--active', hasNote || inputEl.classList.contains('open'));
            fitTracklistNote(inputEl);
            saveTrackNote();
          });
          inputEl.addEventListener('click', e => e.stopPropagation());
          inputEl.addEventListener('focus', () => {
            _activeNoteRow = inputEl;
            _updateNoteEditingUi();
          });
          inputEl.addEventListener('blur', () => {
            if (!inputEl.textContent.trim()) inputEl.innerHTML = '';
            // Deferred — see the mirrored comment in the non-track-list blur handler above.
            setTimeout(() => {
              if (_activeNoteRow === inputEl) {
                _activeNoteRow = null;
                _updateNoteEditingUi();
              }
            }, 0);
          });
          inputEl.addEventListener('paste', e => {
            e.preventDefault();
            const cd = e.clipboardData || window.clipboardData;
            const html = cd.getData('text/html');
            const clean = html ? sanitizeNoteHtml(html) : escapeHtml(cd.getData('text/plain'));
            document.execCommand('insertHTML', false, clean);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          });
        });
      }
    };
  } else if (item.category === 'Book') {
    // Manual chapter list — no reliable chapter/table-of-contents data source for books (unlike
    // ensureAlbumTrackList's iTunes track listings), so this is just a numbered placeholder list
    // (chapterCount, defaulting to 12) the user can extend, stored on the item like trackNotes.
    // No accordion header of its own — folded directly into My Notes (see notesAccordionHeaderEl
    // .onclick above), so it's rendered here but stays hidden until My Notes opens.
    tracklistAccordionHeaderEl.style.display = 'none';
    tracklistEl.style.display = '';
    tracklistEl.classList.add('detail-accordion-collapsible');
    tracklistEl.classList.remove('open');
    renderNumberedNoteList({
      target: tracklistEl,
      countField: 'chapterCount', defaultCount: 12,
      favoritesField: 'chapterFavorites', textsField: 'chapterNotes', zeroSeededField: 'chapterZeroSeeded',
      zeroLabel: 'Basic Notes', rowLabel: num => `Chapter ${num}`, notePlaceholder: 'Add a note for this chapter…',
      addButtonLabel: '+ Add Chapter', addButtonId: 'btn-add-chapter',
      zeroFallback: text,
    });
  } else {
    tracklistAccordionHeaderEl.style.display = 'none';
    tracklistEl.style.display = 'none';
    tracklistEl.innerHTML = '';
    tracklistEl.classList.remove('detail-accordion-collapsible', 'open');
  }

  // ----- Part 2: #detail-notes-list — the numbered "My Notes" list for every category except
  // Book (which used #detail-tracklist for this above instead). Independent of Part 1, so Music
  // Album gets both its own Song List *and* this. -----
  if (item.category !== 'Book') {
    notesListEl.style.display = '';
    notesListEl.classList.add('detail-accordion-collapsible');
    notesListEl.classList.remove('open');
    renderNumberedNoteList({
      target: notesListEl,
      countField: 'noteCount', defaultCount: 3,
      favoritesField: 'noteFavorites', textsField: 'noteTexts', zeroSeededField: 'noteZeroSeeded',
      zeroLabel: 'Summary', rowLabel: () => 'Note', notePlaceholder: 'Add a note…',
      addButtonLabel: '+ Add Note', addButtonId: 'btn-add-note', zeroNumberDisplay: '•',
      // Musician's row 0 prefers the artist's Wikipedia bio (see applyMusicianBioFallback() below
      // for the async first-lookup path) over the item's own general notes/description.
      zeroFallback: isMusicianItem ? (ctaAuthor?.bio || text) : text,
    });
  } else {
    notesListEl.style.display = 'none';
    notesListEl.innerHTML = '';
    notesListEl.classList.remove('detail-accordion-collapsible', 'open');
  }
}

// Called from detailModalSummary.js once an artist's Wikipedia bio resolves for the first time
// (already-cached bios are applied synchronously inside setupNotesAndTracklist() above via its
// own ctaAuthor.bio read). Patches row 0's ("Summary") textarea directly rather than re-rendering
// the whole list, and only if it's still genuinely empty (the user hasn't typed anything, and no
// earlier real note survived) and the modal hasn't since moved on to a different item.
export function applyMusicianBioFallback(item, bio) {
  if (getDetailItem() !== item) return;
  const zeroRowInput = document.querySelector('#detail-notes-list .detail-tracklist-notes-input[data-row-number="0"]');
  if (!zeroRowInput || zeroRowInput.textContent.trim()) return;
  const liveItem = state.items.find(i => i.id === item.id);
  if (liveItem?.noteZeroSeeded) return;
  zeroRowInput.innerHTML = escapeHtml(bio); // bio is always plain text, never run through sanitizeNoteHtml
  const rowEl = zeroRowInput.closest('.detail-tracklist-item');
  const hasNote = !!bio.trim();
  rowEl?.querySelector('.detail-tracklist-number')?.classList.toggle('detail-tracklist-number--has-note', hasNote);
  rowEl?.querySelector('.detail-tracklist-title')?.classList.toggle('detail-tracklist-title--has-note', hasNote);
  rowEl?.querySelector('.detail-tracklist-favorite')?.classList.toggle('detail-tracklist-favorite--active', hasNote || zeroRowInput.classList.contains('open'));
}

function _exitFocusModeIfOn() {
  if (!_focusModeOn) return;
  _focusModeOn = false;
  document.querySelector('.modal.detail-modal')?.classList.remove('detail-modal--focus-mode');
}

// ===== NOTE FORMATTING TOOLBAR =====
// Appears in the sticky title's spot whenever "MY NOTES" or "SONG LIST" is open (the two
// accordions whose rows can hold a note — Book folds its chapters into #detail-tracklist, which
// doubles as "SONG LIST" for Music Album, so checking both elements covers every category).
// Single source of truth: read their own 'open' class directly, rather than tracking a separate
// flag that could go stale — either section can be force-closed by a DIFFERENT accordion opening
// (closeAccordionsExcept(), in detailModalAccordions.js) without going through either section's
// own click handler, and a MutationObserver on both elements (see initNoteToolbar) is what catches
// that and re-runs this even when nothing in this file triggered the change.
function _updateNoteEditingUi() {
  const notesListEl = document.getElementById('detail-notes-list');
  const tracklistEl = document.getElementById('detail-tracklist');
  const sectionOpen = notesListEl.classList.contains('open') || tracklistEl.classList.contains('open');
  if (!sectionOpen) {
    // Neither section is open anymore (via its own header, or forced closed by another accordion
    // opening) — nothing inside should still be focused, and focus mode (which only makes sense
    // while a note section is actually open) should exit too.
    if (document.activeElement?.classList?.contains('detail-tracklist-notes-input')) document.activeElement.blur();
    _exitFocusModeIfOn();
    // Visual-only fallback for any row left expanded — the normal case (closing via either
    // section's own header) already resets this properly (including the persisted favorites,
    // see _closeAllOpenRows above), this only matters when a *different* accordion force-closed
    // one of these without going through its own handler.
    [notesListEl, tracklistEl].forEach(container => {
      container.querySelectorAll('.detail-tracklist-notes-input.open').forEach(row => {
        row.classList.remove('open');
        row.style.height = '';
      });
    });
  }
  const editing = sectionOpen || _focusModeOn;
  document.getElementById('detail-body').classList.toggle('detail-body--editing-note', editing);
  // Also on .modal.detail-modal (not just #detail-body) — the "Your Statement" sponsored badge
  // lives inside #detail-image-wrap, a sibling *before* #detail-body in the DOM, so it can't be
  // targeted via a CSS sibling combinator off #detail-body's own class.
  document.querySelector('.modal.detail-modal')?.classList.toggle('detail-modal--editing-note', editing);
  document.querySelectorAll('#detail-note-toolbar .detail-note-toolbar-btn[data-format]')
    .forEach(b => { b.disabled = !_activeNoteRow; });
  document.getElementById('note-toolbar-expand')?.classList.toggle('detail-note-toolbar-btn--active', _focusModeOn);
}

// Wraps (or, if the selection already sits inside one, unwraps) the current selection in <mark>.
// Not done via execCommand('hiliteColor'/'backColor') — Blink emits an inline
// style="background-color:…" span for those, which sanitizeNoteHtml strips entirely, silently
// discarding the highlight.
function _wrapSelectionInMark() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  const anchorEl = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
  const existingMark = anchorEl?.closest('mark');
  if (existingMark) { // toggle off
    const p = existingMark.parentNode;
    while (existingMark.firstChild) p.insertBefore(existingMark.firstChild, existingMark);
    p.removeChild(existingMark);
    return;
  }
  const mark = document.createElement('mark');
  try {
    range.surroundContents(mark);
  } catch {
    const frag = range.extractContents(); // selection crosses element boundaries; flattens, but
    mark.appendChild(frag);                // preserves any nested allowed tags since real nodes move
    range.insertNode(mark);
  }
  const newRange = document.createRange();
  newRange.selectNodeContents(mark);
  sel.removeAllRanges();
  sel.addRange(newRange); // keep the highlighted text visibly selected after wrapping
}

function _applyFormat(cmd) {
  if (!_activeNoteRow) return;
  _activeNoteRow.focus();
  if (cmd === 'bold') document.execCommand('bold');
  else if (cmd === 'bullet') document.execCommand('insertUnorderedList');
  else if (cmd === 'highlight') _wrapSelectionInMark();
  _activeNoteRow.dispatchEvent(new Event('input', { bubbles: true })); // triggers the existing debounced save + has-note styling
}

// Binds the toolbar's 4 static buttons once — called from main.js's init(), since the toolbar DOM
// lives permanently in index.html rather than being re-rendered per modal open.
export function initNoteToolbar() {
  document.querySelectorAll('#detail-note-toolbar .detail-note-toolbar-btn').forEach(btn => {
    // preventDefault on mousedown keeps focus (and the live Selection/Range) on the contenteditable
    // row instead of moving it to the button — the standard rich-text-toolbar trick, and the
    // reason blur rarely needs to special-case "focus moved to the toolbar" at all.
    btn.addEventListener('mousedown', e => e.preventDefault());
  });
  document.getElementById('note-toolbar-bold').addEventListener('click', () => _applyFormat('bold'));
  document.getElementById('note-toolbar-highlight').addEventListener('click', () => _applyFormat('highlight'));
  document.getElementById('note-toolbar-bullet').addEventListener('click', () => _applyFormat('bullet'));
  document.getElementById('note-toolbar-expand').addEventListener('click', () => {
    _focusModeOn = !_focusModeOn;
    document.querySelector('.modal.detail-modal').classList.toggle('detail-modal--focus-mode', _focusModeOn);
    _updateNoteEditingUi();
  });
  // #detail-notes-list / #detail-tracklist are static, persistent elements (never recreated —
  // only their innerHTML changes per item), so this only needs setting up once, here, rather than
  // on every setupNotesAndTracklist() call. Catches every way either section's 'open' class can
  // change, including a DIFFERENT accordion opening and force-closing one of them via
  // closeAccordionsExcept() (detailModalAccordions.js) — a path that never calls back into this
  // file directly otherwise.
  const notesOpenObserver = new MutationObserver(() => _updateNoteEditingUi());
  notesOpenObserver.observe(document.getElementById('detail-notes-list'), { attributes: true, attributeFilter: ['class'] });
  notesOpenObserver.observe(document.getElementById('detail-tracklist'), { attributes: true, attributeFilter: ['class'] });
}
