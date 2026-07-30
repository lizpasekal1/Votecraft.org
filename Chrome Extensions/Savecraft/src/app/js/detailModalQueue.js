// ===== DETAIL MODAL: WEB LINKS + QUEUE ACCORDIONS =====

import { state, CATEGORY_PLATFORMS } from './state.js';
import { escapeHtml, getListIds } from './utils.js';
import { persistItem } from './storage.js';
import { ensureLiveItem } from './authors.js';
import { updateBookmarkIcon } from './detailModalHeader.js';
import { registerAccordion, closeAccordionsExcept } from './detailModalAccordions.js';

// Holds the currently-set-up queue section's closures/elements, so toggleQueueFromHeader() (called
// from the header bookmark button, in a different file) can reach them without every caller having
// to thread queueEl/buildQueueSection/etc. through as parameters. Reassigned at the top of every
// setupQueue() call — always current by the time a click could possibly reach it, since setupQueue()
// runs synchronously within the same openDetailModal() call that wires the header button.
let _current = null;

export async function toggleQueueFromHeader(item) {
  if (!_current || _current.item !== item) return;
  const { queueEl, addToQueue, buildQueueSection, wireQueueSection, updateQueueLabel } = _current;
  const liveItem = state.items.find(i => i.id === item.id);
  if (liveItem?.queueStatus) {
    liveItem.queueStatus = null;
    liveItem.listIds = [];
    liveItem.listId = null;
    await persistItem(liveItem);
    updateBookmarkIcon(item);
    updateQueueLabel();
    queueEl.innerHTML = buildQueueSection();
    wireQueueSection();
    queueEl.classList.remove('open');
  } else {
    await addToQueue();
  }
}

export function setupQueue(item, { domain, isMusicAlbum }) {
  const streamingEl = document.getElementById('detail-streaming');
  // Web Links now always sits flush in the accordion stack (My Notes/Albums or Placeholder/
  // Song List), rather than pushed to the bottom via margin-top:auto like the old combined row.
  streamingEl.classList.add('detail-streaming--tight');
  const queueEl = document.getElementById('detail-queue');
  queueEl.classList.add('detail-queue--tight');
  registerAccordion('streaming', streamingEl, streamingEl);
  registerAccordion('queue', queueEl, queueEl);
  const catConfig = CATEGORY_PLATFORMS[item.category];
  const query = item.title || domain;
  const websiteLinkLabel = isMusicAlbum ? 'View on Apple Music' : (domain || 'View Source');
  const websiteBtn = item.url
    ? `<a class="streaming-link-btn streaming-link-website" href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(websiteLinkLabel)}</a>`
    : '';
  // The item's own saved YouTube URL (set via the "YouTube URL" field in the Add/Edit modal) —
  // a real link to that specific video, not a generic YouTube search like the other platforms.
  const youtubeBtn = item.youtubeUrl
    ? `<a class="streaming-link-btn" href="${escapeHtml(item.youtubeUrl)}" target="_blank">YouTube</a>`
    : '';

  const headerLabel = catConfig ? escapeHtml(catConfig.label) : 'Web Links';

  function updateQueueLabel() {
    const liveItem = state.items.find(i => i.id === item.id);
    const isQueued = !!liveItem?.queueStatus;
    const labelEl = streamingEl.querySelector('.queue-label') || document.getElementById('btn-standalone-queue');
    const textEl = streamingEl.querySelector('.queue-label-text') || document.getElementById('standalone-queue-text');
    if (textEl) textEl.textContent = 'Add to Queue';
    if (labelEl) labelEl.classList.toggle('queue-label--active', isQueued);
  }

  // Every category now presents Web Links as its own accordion row (icon + label + chevron,
  // matching My Notes/Albums/Song List) with "Add to Queue" pulled out as a standalone button
  // below the accordion stack, instead of the old combined header row.
  const WEB_LINKS_ICON_SVG = `<svg class="detail-accordion-icon" xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg>`;
  const buildStreamingHeader = () =>
    `<div class="detail-accordion-header how-to-read-label">${WEB_LINKS_ICON_SVG}<span>${headerLabel}</span><svg class="detail-accordion-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>`;

  const btnStandaloneQueueEl = document.getElementById('btn-standalone-queue');
  btnStandaloneQueueEl.style.display = '';

  const buildStreaming = (linksHtml) => buildStreamingHeader() + `<div class="streaming-links-wrap">${linksHtml}</div>`;

  if (catConfig && catConfig.platforms) {
    const savedPlatforms = item.platforms;
    const platformsToShow = (savedPlatforms && savedPlatforms.length > 0)
      ? catConfig.platforms.filter(p => savedPlatforms.includes(p.id))
      : catConfig.platforms;
    streamingEl.innerHTML = buildStreaming(websiteBtn + youtubeBtn + platformsToShow.map(p => `<a class="streaming-link-btn" href="${p.searchUrl(query)}" target="_blank">${p.name}</a>`).join(''));
  } else {
    streamingEl.innerHTML = buildStreaming(websiteBtn + youtubeBtn);
  }
  streamingEl.style.display = '';
  streamingEl.querySelector('.how-to-read-label')?.addEventListener('click', () => {
    const nowOpen = streamingEl.classList.toggle('open');
    if (nowOpen) closeAccordionsExcept('streaming');
  });

  // Just the data side of queueing — no panel-opening — so callers that shouldn't pop the
  // accordion open (the header bookmark icon) can add to queue without it.
  async function addToQueue() {
    const live = await ensureLiveItem(item);
    live.queueStatus = 'in-queue';
    await persistItem(live);
    updateBookmarkIcon(item);
    updateQueueLabel();
    queueEl.innerHTML = buildQueueSection();
    wireQueueSection();
  }

  (streamingEl.querySelector('.queue-label') || btnStandaloneQueueEl).onclick = async () => {
    const liveItem = state.items.find(i => i.id === item.id);
    if (!liveItem?.queueStatus) {
      await addToQueue();
      queueEl.classList.add('open');
    } else {
      queueEl.classList.toggle('open');
    }
    if (queueEl.classList.contains('open')) closeAccordionsExcept('queue');
  };

  function buildQueueSection() {
    const liveItem = state.items.find(i => i.id === item.id);
    const listIds = getListIds(liveItem);
    const isQueued = !!liveItem?.queueStatus;
    const baseTag = `<button class="queue-tag queue-tag-base${isQueued ? ' active' : ''}" id="btn-queue-base">${isQueued ? 'Deselect Queue' : 'Full Queue'}</button>`;
    const makeTag = l => `<button class="queue-tag${listIds.includes(l.id) ? ' active' : ''}" data-list-id="${l.id}">${l.name}</button>`;
    const addBtn = `<button class="queue-tag queue-tag-add" id="btn-queue-add-list">+ Add list</button>`;
    const lists = state.kanbanLists;
    const listTags = lists.map(makeTag).join('');
    return `<div class="streaming-links-wrap">
      ${baseTag}${listTags}${addBtn}
    </div>`;
  }

  function wireQueueSection() {
    updateQueueLabel();

    document.getElementById('btn-queue-base')?.addEventListener('click', async () => {
      const liveItem = state.items.find(i => i.id === item.id);
      if (!liveItem) return;
      if (liveItem.queueStatus) {
        liveItem.queueStatus = null;
        liveItem.listIds = [];
        liveItem.listId = null;
        await persistItem(liveItem);
        updateBookmarkIcon(item);
        updateQueueLabel();
        queueEl.innerHTML = buildQueueSection();
        wireQueueSection();
        queueEl.classList.add('open');
      } else {
        await addToQueue();
        queueEl.classList.add('open');
      }
    });

    // List tags — toggle membership
    queueEl.querySelectorAll('.queue-tag:not(.queue-tag-add):not(.queue-tag-base)').forEach(tag => {
      tag.addEventListener('click', async () => {
        const liveItem = await ensureLiveItem(item);
        if (!liveItem) return;
        const listIds = getListIds(liveItem);
        const id = tag.dataset.listId;
        const idx = listIds.indexOf(id);
        if (idx === -1) listIds.push(id); else listIds.splice(idx, 1);
        liveItem.listIds = listIds;
        liveItem.listId = null;
        if (!liveItem.queueStatus) liveItem.queueStatus = 'in-queue';
        await persistItem(liveItem);
        queueEl.innerHTML = buildQueueSection();
        wireQueueSection();
      });
    });

    document.getElementById('btn-queue-add-list')?.addEventListener('click', () => {
      const linksWrap = queueEl.querySelector('.streaming-links-wrap');
      linksWrap.innerHTML = `
        <div class="queue-new-wrap">
          <input class="queue-new-input" id="queue-new-input" placeholder="List name…" maxlength="40">
          <button class="queue-new-confirm" id="queue-new-confirm">Create</button>
          <button class="queue-new-cancel" id="queue-new-cancel">✕</button>
        </div>`;
      const input = document.getElementById('queue-new-input');
      input?.focus();
      const cancelQueue = () => { queueEl.innerHTML = buildQueueSection(); wireQueueSection(); };
      const createAndAssign = async () => {
        const name = input?.value.trim();
        if (!name) { cancelQueue(); return; }
        const newId = 'list-' + Date.now();
        state.kanbanLists.push({ id: newId, name });
        chrome.storage.sync.set({ savecraft_kanban_lists: state.kanbanLists });
        if (!item.curated) {
          const liveItem = state.items.find(i => i.id === item.id);
          if (liveItem) {
            const listIds = getListIds(liveItem);
            listIds.push(newId);
            liveItem.listIds = listIds;
            liveItem.listId = null;
            liveItem.queueStatus = 'in-queue';
            await persistItem(liveItem);
          }
        }
        queueEl.innerHTML = buildQueueSection();
        wireQueueSection();
      };
      document.getElementById('queue-new-confirm')?.addEventListener('click', createAndAssign);
      document.getElementById('queue-new-cancel')?.addEventListener('click', cancelQueue);
      input?.addEventListener('keydown', ev => { if (ev.key === 'Enter') createAndAssign(); if (ev.key === 'Escape') cancelQueue(); });
    });
  }

  _current = { item, queueEl, addToQueue, buildQueueSection, wireQueueSection, updateQueueLabel };

  queueEl.innerHTML = buildQueueSection();
  queueEl.classList.remove('open');
  wireQueueSection();
  updateQueueLabel();
}
