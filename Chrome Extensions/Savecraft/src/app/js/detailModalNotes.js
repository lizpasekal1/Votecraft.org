// ===== DETAIL MODAL: MY NOTES + TRACKLIST/CHAPTERS ACCORDIONS =====
// Kept as one file/closure (not split further) because Books fold the chapter list directly into
// the My Notes accordion — sharing its open/close state rather than being an independent
// accordion of their own — and because Notes' resolved `text` is read by the Book chapter list as
// its Chapter-0 fallback content. Splitting these would mean threading both across a file boundary.

import { state, CURATED_NOTES_CATEGORIES } from './state.js';
import { escapeHtml, debounce } from './utils.js';
import { persistItem } from './storage.js';
import { ensureAlbumTrackList, ensureLiveItem } from './authors.js';
import { getDetailItem } from './detailModal.js';
import { registerAccordion, closeAccordionsExcept } from './detailModalAccordions.js';

// MY NOTES accordion icon: the plain notepad icon for every category, swapped for a book icon
// (matching the Chapters content it holds) on Book items only.
const NOTES_ICON_PATH = 'M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z';
const BOOK_NOTES_ICON_PATH = 'M560-564v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-600q-38 0-73 9.5T560-564Zm0 220v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-380q-38 0-73 9t-67 27Zm0-110v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-490q-38 0-73 9.5T560-454ZM260-320q47 0 91.5 10.5T440-278v-394q-41-24-87-36t-93-12q-36 0-71.5 7T120-692v396q35-12 69.5-18t70.5-6Zm260 42q44-21 88.5-31.5T700-320q36 0 70.5 6t69.5 18v-396q-33-14-68.5-21t-71.5-7q-47 0-93 12t-87 36v394Zm-40 118q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740q51-30 106.5-45T700-800q52 0 102 12t96 36q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59ZM280-494Z';
// Per-track/chapter/general "add a note" affordance — a pencil rather than a star, since
// clicking it opens a note-taking field, not a favorite. Single icon (color toggles via the
// shared --active class) since there's no separate outline/filled variant for it.
const NOTE_PENCIL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>`;

export function setupNotesAndTracklist(item, { isMusicAlbum }) {
  const notesInputEl = document.getElementById('detail-notes-input');
  const notesAccordionHeaderEl = document.getElementById('detail-notes-accordion-header');
  document.getElementById('detail-notes-accordion-icon').querySelector('path')
    .setAttribute('d', item.category === 'Book' ? BOOK_NOTES_ICON_PATH : NOTES_ICON_PATH);
  registerAccordion('notes', notesAccordionHeaderEl, notesInputEl);
  // Curated (not-yet-saved) items in creator-linked categories stash the creator's name in
  // item.notes (see _detailAuthorName in detailModalHeader.js) — that's never real user notes, so
  // exclude it here or the editable textarea below would pre-fill with the creator name instead
  // of being empty.
  const _curatedNotesIsCreatorName = item.curated && CURATED_NOTES_CATEGORIES.includes(item.category);
  const text = (_curatedNotesIsCreatorName ? null : item.notes) || item.description || '';
  // My Notes is shown as its own accordion row for every category now, even with no notes yet
  // — it's a directly-editable textarea instead of read-only text, auto-saving (debounced) as
  // the user types. Genre (item.genre, Music Album only) is intentionally kept on the item but
  // not rendered anywhere in this modal.

  notesInputEl.value = text;
  // Books no longer show the plain notes textarea at all — the chapter list (Chapter 0..N) is
  // the entire content of My Notes for that category now.
  notesInputEl.style.display = item.category === 'Book' ? 'none' : '';
  notesInputEl.classList.add('detail-accordion-collapsible');
  notesInputEl.classList.remove('open');
  // Books fold the chapter list directly beneath the notes textarea (see notesAccordionHeaderEl
  // .onclick below) — drop the notes box's own bottom divider so it doesn't draw a line between
  // the two, since they read as one continuous section.
  notesInputEl.classList.toggle('detail-notes-input--no-divider', item.category === 'Book');
  notesAccordionHeaderEl.classList.remove('open');
  notesAccordionHeaderEl.style.display = '';
  notesAccordionHeaderEl.onclick = () => {
    const nowOpen = notesAccordionHeaderEl.classList.toggle('open');
    notesInputEl.classList.toggle('open', nowOpen);
    // Books fold the chapter list (#detail-tracklist) directly into My Notes instead of giving
    // it its own accordion header — so it opens/closes together with the notes textarea here,
    // rather than being force-closed as an unrelated accordion like it is for other categories.
    // (For Book, tracklistEl is never registered below, so closeAccordionsExcept('notes') can't
    // touch it either way — this explicit toggle is what actually drives it.)
    if (item.category === 'Book') {
      tracklistEl.classList.toggle('open', nowOpen);
    }
    if (nowOpen) {
      closeAccordionsExcept('notes');
      notesInputEl.focus();
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

  const tracklistAccordionHeaderEl = document.getElementById('detail-tracklist-accordion-header');
  const tracklistEl = document.getElementById('detail-tracklist');
  tracklistAccordionHeaderEl.classList.remove('open');
  tracklistEl.classList.remove('open');

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
      });
    } else {
      inputEl.style.height = '';
    }
  }

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
      if (!nowOpen) return;
      closeAccordionsExcept('tracklist');
      if (_tracklistLoaded) return;
      _tracklistLoaded = true;
      tracklistEl.innerHTML = `<div class="detail-tracklist-row detail-tracklist-row--status">Loading…</div>`;
      const tracks = await ensureAlbumTrackList(item);
      if (getDetailItem() !== item) return; // modal moved on to a different item while awaiting
      if (!tracklistAccordionHeaderEl.classList.contains('open')) return; // user closed it already
      if (!tracks || tracks.length === 0) {
        tracklistEl.innerHTML = `<div class="detail-tracklist-row detail-tracklist-row--status">Track list unavailable</div>`;
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
          const note = trackNotes[t.number] || '';
          const hasNote = !!note.trim();
          return `
          <div class="detail-tracklist-item">
            <div class="detail-tracklist-row">
              <span class="detail-tracklist-number${hasNote ? ' detail-tracklist-number--has-note' : ''}">${t.number || ''}</span>
              <span class="detail-tracklist-title${hasNote ? ' detail-tracklist-title--has-note' : ''}">${escapeHtml(t.title || '')}</span>
              <span class="detail-tracklist-favorite${isFav || hasNote ? ' detail-tracklist-favorite--active' : ''}" data-track-number="${t.number}">${NOTE_PENCIL_ICON}</span>
            </div>
            <textarea class="detail-tracklist-notes-input${isFav ? ' open' : ''}" data-track-number="${t.number}" placeholder="Add a note for this track…" rows="2">${escapeHtml(note)}</textarea>
          </div>`;
        }).join('');
        tracklistEl.querySelectorAll('.detail-tracklist-notes-input.open').forEach(fitTracklistNote);
        // Bound to the whole row (not just the pencil) so tapping the track number or title also
        // opens/closes the note — the pencil is still visually the "affordance" but isn't the
        // only tap target.
        tracklistEl.querySelectorAll('.detail-tracklist-row').forEach(rowEl => {
          const starEl = rowEl.querySelector('.detail-tracklist-favorite');
          if (!starEl) return; // status rows ("Loading…" etc.) have no favorite icon
          rowEl.addEventListener('click', async () => {
            const trackNumber = Number(starEl.dataset.trackNumber);
            const liveTrackItem = await ensureLiveItem(item);
            const idx = (liveTrackItem.favoriteTracks || []).indexOf(trackNumber);
            const nowFav = idx === -1;
            // Only one track note open at a time — same as chapters, clears every other entry
            // from favoriteTracks (not just in the DOM) so a reload doesn't bring them all back.
            liveTrackItem.favoriteTracks = nowFav ? [trackNumber] : [];
            await persistItem(liveTrackItem);
            const thisItemEl = rowEl.closest('.detail-tracklist-item');
            tracklistEl.querySelectorAll('.detail-tracklist-item').forEach(otherItemEl => {
              if (otherItemEl === thisItemEl) return;
              const otherInput = otherItemEl.querySelector('.detail-tracklist-notes-input');
              otherInput?.classList.remove('open');
              fitTracklistNote(otherInput);
              const otherStar = otherItemEl.querySelector('.detail-tracklist-favorite');
              otherStar?.classList.toggle('detail-tracklist-favorite--active', !!otherInput?.value.trim());
            });
            const notesInput = thisItemEl?.querySelector('.detail-tracklist-notes-input');
            const hasNote = !!notesInput?.value.trim();
            starEl.classList.toggle('detail-tracklist-favorite--active', nowFav || hasNote);
            notesInput?.classList.toggle('open', nowFav);
            fitTracklistNote(notesInput);
            if (nowFav) notesInput?.focus();
          });
        });
        tracklistEl.querySelectorAll('.detail-tracklist-notes-input').forEach(inputEl => {
          const saveTrackNote = debounce(async () => {
            if (getDetailItem() !== item) return; // modal moved on to a different item before the debounce fired
            const trackNumber = Number(inputEl.dataset.trackNumber);
            const liveTrackItem = await ensureLiveItem(item);
            const notes = { ...(liveTrackItem.trackNotes || {}) };
            const text = inputEl.value.trim();
            if (text) notes[trackNumber] = text; else delete notes[trackNumber];
            liveTrackItem.trackNotes = notes;
            await persistItem(liveTrackItem);
          }, 500);
          inputEl.addEventListener('input', () => {
            // Number/title/pencil turn purple/bold immediately as the user types, rather than
            // waiting on the debounced save below to actually persist the note.
            const itemEl = inputEl.closest('.detail-tracklist-item');
            const hasNote = !!inputEl.value.trim();
            itemEl?.querySelector('.detail-tracklist-number')?.classList.toggle('detail-tracklist-number--has-note', hasNote);
            itemEl?.querySelector('.detail-tracklist-title')?.classList.toggle('detail-tracklist-title--has-note', hasNote);
            itemEl?.querySelector('.detail-tracklist-favorite')?.classList.toggle('detail-tracklist-favorite--active', hasNote || inputEl.classList.contains('open'));
            fitTracklistNote(inputEl);
            saveTrackNote();
          });
          inputEl.addEventListener('click', e => e.stopPropagation());
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

    function renderChapters() {
      // Mirrors the track favorite/notes feature exactly (favorite star + collapsible per-row
      // notes), just keyed by chapter number instead of track number — chapterFavorites/
      // chapterNotes on the item, saved via ensureLiveItem()/persistItem() so liking or noting
      // a chapter never sets queueStatus and never puts the item on the kanban board.
      const liveItem = state.items.find(i => i.id === item.id);
      const chapterCount = liveItem?.chapterCount || 12;
      const chapterFavorites = liveItem?.chapterFavorites || [];
      const chapterNotes = liveItem?.chapterNotes || {};
      // Chapter 0 above Chapter 1 — the loop runs one extra time (chapterCount + 1 entries,
      // numbered 0..chapterCount) rather than shifting 1..12 down, so existing chapter numbers
      // stay the same and "+ Add Chapter" still appends chapterCount+1 as expected.
      // Chapter 0 shows the old general notes/description text as a starting point (the plain
      // notes textarea is hidden for Books now) until the user actually edits it — chapterZero
      // Seeded (set the first time its textarea fires an input event, even to clear it) stops
      // that fallback from reappearing after an intentional clear.
      const showChapterZeroFallback = !liveItem?.chapterZeroSeeded;
      const rows = Array.from({ length: chapterCount + 1 }, (_, i) => {
        const num = i;
        const isFav = chapterFavorites.includes(num);
        const note = chapterNotes[num] || (num === 0 && showChapterZeroFallback ? text : '') || '';
        const hasNote = !!note.trim();
        return `
        <div class="detail-tracklist-item">
          <div class="detail-tracklist-row">
            <span class="detail-tracklist-number${hasNote ? ' detail-tracklist-number--has-note' : ''}">${num}</span>
            <span class="detail-tracklist-title${hasNote ? ' detail-tracklist-title--has-note' : ''}">${num === 0 ? 'Basic Notes' : `Chapter ${num}`}</span>
            <span class="detail-tracklist-favorite${isFav || hasNote ? ' detail-tracklist-favorite--active' : ''}" data-chapter-number="${num}">${NOTE_PENCIL_ICON}</span>
          </div>
          <textarea class="detail-tracklist-notes-input${isFav ? ' open' : ''}" data-chapter-number="${num}" placeholder="Add a note for this chapter…" rows="2">${escapeHtml(note)}</textarea>
        </div>`;
      }).join('');
      tracklistEl.innerHTML = `${rows}<button class="detail-tracklist-add-chapter" id="btn-add-chapter">+ Add Chapter</button>`;
      tracklistEl.querySelectorAll('.detail-tracklist-notes-input.open').forEach(fitTracklistNote);

      // Bound to the whole row (not just the pencil) so tapping "Chapter N" also opens/closes
      // the note — the pencil is still visually the "affordance" but isn't the only tap target.
      tracklistEl.querySelectorAll('.detail-tracklist-row').forEach(rowEl => {
        const starEl = rowEl.querySelector('.detail-tracklist-favorite');
        if (!starEl) return;
        rowEl.addEventListener('click', async () => {
          const chapterNumber = Number(starEl.dataset.chapterNumber);
          const liveChapterItem = await ensureLiveItem(item);
          const idx = (liveChapterItem.chapterFavorites || []).indexOf(chapterNumber);
          const nowFav = idx === -1;
          // Only one chapter note open at a time — opening this one clears every other entry
          // from chapterFavorites (not just in the DOM) so a reload doesn't bring them all back.
          liveChapterItem.chapterFavorites = nowFav ? [chapterNumber] : [];
          await persistItem(liveChapterItem);
          const thisItemEl = rowEl.closest('.detail-tracklist-item');
          tracklistEl.querySelectorAll('.detail-tracklist-item').forEach(otherItemEl => {
            if (otherItemEl === thisItemEl) return;
            const otherInput = otherItemEl.querySelector('.detail-tracklist-notes-input');
            otherInput?.classList.remove('open');
            fitTracklistNote(otherInput);
            const otherStar = otherItemEl.querySelector('.detail-tracklist-favorite');
            otherStar?.classList.toggle('detail-tracklist-favorite--active', !!otherInput?.value.trim());
          });
          const notesInput = thisItemEl?.querySelector('.detail-tracklist-notes-input');
          const hasNote = !!notesInput?.value.trim();
          starEl.classList.toggle('detail-tracklist-favorite--active', nowFav || hasNote);
          notesInput?.classList.toggle('open', nowFav);
          fitTracklistNote(notesInput);
          if (nowFav) notesInput?.focus();
        });
      });
      tracklistEl.querySelectorAll('.detail-tracklist-notes-input').forEach(inputEl => {
        const saveChapterNote = debounce(async () => {
          if (getDetailItem() !== item) return; // modal moved on to a different item before the debounce fired
          const chapterNumber = Number(inputEl.dataset.chapterNumber);
          const liveChapterItem = await ensureLiveItem(item);
          const notes = { ...(liveChapterItem.chapterNotes || {}) };
          const noteText = inputEl.value.trim();
          if (noteText) notes[chapterNumber] = noteText; else delete notes[chapterNumber];
          liveChapterItem.chapterNotes = notes;
          // Any edit to Chapter 0 (even clearing it) permanently stops the general-notes
          // fallback text from reappearing on future renders.
          if (chapterNumber === 0) liveChapterItem.chapterZeroSeeded = true;
          await persistItem(liveChapterItem);
        }, 500);
        inputEl.addEventListener('input', () => {
          const itemEl = inputEl.closest('.detail-tracklist-item');
          const hasNote = !!inputEl.value.trim();
          itemEl?.querySelector('.detail-tracklist-number')?.classList.toggle('detail-tracklist-number--has-note', hasNote);
          itemEl?.querySelector('.detail-tracklist-title')?.classList.toggle('detail-tracklist-title--has-note', hasNote);
          itemEl?.querySelector('.detail-tracklist-favorite')?.classList.toggle('detail-tracklist-favorite--active', hasNote || inputEl.classList.contains('open'));
          fitTracklistNote(inputEl);
          saveChapterNote();
        });
        inputEl.addEventListener('click', e => e.stopPropagation());
      });

      document.getElementById('btn-add-chapter').addEventListener('click', async e => {
        e.stopPropagation();
        const liveTrackItem = await ensureLiveItem(item);
        liveTrackItem.chapterCount = (liveTrackItem.chapterCount || 12) + 1;
        await persistItem(liveTrackItem);
        renderChapters();
      });
    }
    renderChapters();
  } else {
    tracklistAccordionHeaderEl.style.display = 'none';
    tracklistEl.style.display = 'none';
    tracklistEl.innerHTML = '';
    tracklistEl.classList.remove('detail-accordion-collapsible', 'open');
  }
}
