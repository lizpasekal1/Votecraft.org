// ===== AUTHOR / CREATOR PAGE RENDERING =====

import { state, CURATED_ITEMS, CAT_LABEL, CAT_EMOJI } from './state.js';
import { escapeHtml, catClass } from './utils.js';
import { persistViewState, removeItem } from './storage.js';
import { findAuthor, resolveMusicianItem, wireCardAuthorLinks, backfillAlbumYears } from './authors.js';
import { openDetailModal } from './detailModal.js';
import { openEditModal } from './addEditModal.js';
import { openFetchAlbumsModal } from './fetchAlbumsModal.js';
import { renderSidebar } from './renderSidebar.js';
import { renderGrid, renderCard } from './renderGrid.js';
import { wireQuickQueueButtons } from './renderCardActions.js';
import { getFilteredSortedItems } from './renderFilters.js';

export function renderAuthorPage() {
  const rest = state.view.slice(7);
  const colonIdx = rest.indexOf(':');
  const cat  = rest.slice(0, colonIdx);
  const name = rest.slice(colonIdx + 1);

  const container = document.getElementById('cards-grid');
  const gridTitle = document.getElementById('grid-title');
  const author = findAuthor(name, cat);

  gridTitle.style.display = '';
  gridTitle.innerHTML = `<button class="author-back-btn" id="author-back-btn"><span>&#8249;</span><span>${CAT_EMOJI[cat] || ''} ${escapeHtml(CAT_LABEL[cat] || cat)}</span></button>`;
  document.getElementById('author-back-btn').addEventListener('click', () => {
    state.view = state.authorReturnView || cat;
    persistViewState();
    renderSidebar();
    renderGrid();
  });

  const items = getFilteredSortedItems();

  const photoHtml = author?.imageUrl
    ? `<img class="author-page-photo" src="${escapeHtml(author.imageUrl)}" alt="" loading="lazy" decoding="async"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
       <div class="author-page-photo-placeholder placeholder-${catClass(cat)}" style="display:none">${escapeHtml(name[0]?.toUpperCase() || '?')}</div>`
    : `<div class="author-page-photo-placeholder placeholder-${catClass(cat)}">${escapeHtml(name[0]?.toUpperCase() || '?')}</div>`;

  container.className = 'cards-grid author-page-grid';
  container.innerHTML = `
    <div class="author-page-header">
      <div class="author-page-photo-wrap">${photoHtml}</div>
      <div class="author-page-info">
        ${cat === 'Musician'
          ? `<button class="author-page-name author-page-name-btn" id="author-page-name-btn">${escapeHtml(name)}<svg class="detail-title-arrow" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg></button>`
          : `<div class="author-page-name">${escapeHtml(name)}</div>`
        }
        ${author?.websiteUrl ? `<a class="author-page-website" href="${escapeHtml(author.websiteUrl)}" target="_blank" rel="noopener">${escapeHtml(author.websiteUrl)}</a>` : ''}
      </div>
      <div class="author-page-actions">
        ${cat === 'Musician' ? `<button class="btn-fetch-albums" id="btn-fetch-albums">Fetch Albums</button>` : ''}
      </div>
    </div>
    <div class="author-works-header">Works (${items.length})</div>
    <div class="author-works-grid" id="author-works-grid">
      ${items.length > 0
        ? items.map(item => renderCard(item)).join('')
        : '<div class="author-no-works">No saved works yet.</div>'
      }
    </div>
  `;

  document.getElementById('author-page-name-btn')?.addEventListener('click', () => {
    openDetailModal(resolveMusicianItem(name));
  });

  document.getElementById('btn-fetch-albums')?.addEventListener('click', () => {
    openFetchAlbumsModal(name);
  });

  const worksGrid = document.getElementById('author-works-grid');

  worksGrid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.card-action-btn') || e.target.closest('.card-author-link')) return;
      let item = state.items.find(i => i.id === card.dataset.id);
      if (!item) {
        for (const genre of Object.keys(CURATED_ITEMS)) {
          for (const c of Object.keys(CURATED_ITEMS[genre])) {
            const found = CURATED_ITEMS[genre][c].find(i => i.id === card.dataset.id);
            if (found) { item = { ...found, category: c, curated: true }; break; }
          }
          if (item) break;
        }
      }
      if (item) openDetailModal(item);
    });
  });

  wireCardAuthorLinks(worksGrid);
  wireQuickQueueButtons(worksGrid);

  if (cat === 'Musician') backfillAlbumYears(name, items);

  worksGrid.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const item = state.items.find(i => i.id === btn.dataset.id);
      if (item) openEditModal(item);
    });
  });

  worksGrid.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      if (!confirm('Remove this item from SaveCraft?')) return;
      await removeItem(id);
      state.items = state.items.filter(i => i.id !== id);
      renderSidebar();
      renderAuthorPage();
    });
  });

  persistViewState();
}
