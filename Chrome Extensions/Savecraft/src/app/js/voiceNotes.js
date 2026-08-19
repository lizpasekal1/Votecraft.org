// ===== VOICE NOTES: recording popup + IndexedDB blob storage =====
// One audio clip per note/chapter row (My Notes list or Book's Chapters list — see
// detailModalNotes.js's renderNumberedNoteList, the shared renderer for both). Music Album's
// separate Song List track rows are explicitly out of scope — the toolbar button that opens this
// popup only ever fires for rows that carry a data-audio-field attribute, which Song List rows
// never get (see detailModalNotes.js's _updateNoteEditingUi).
//
// Storage is local-only, deliberately: the actual recorded Blob lives in IndexedDB (this
// browser/device only — never synced across devices or between the extension and the web build).
// Only a small metadata record — { id, duration, recordedAt } — gets persisted on the item itself
// via the existing persistItem() path (storage.js), since that stays well under chrome.storage
// .sync's real per-item quota. This was a direct, confirmed trade-off (see the plan this was built
// from) in exchange for shipping without new cloud-storage infrastructure (no Firebase Storage
// integration exists anywhere in this codebase today).

import { persistItem } from './storage.js';
import { ensureLiveItem } from './authors.js';

// ===== INDEXEDDB =====
// No IndexedDB usage exists anywhere else in this codebase — this is genuinely new
// infrastructure, so (unlike the rest of the app's storage calls, which never check for a quota
// error) every operation here surfaces a real failure to its caller instead of failing silently.

const _DB_NAME = 'savecraft-voice-notes';
const _DB_VERSION = 1;
const _STORE_NAME = 'clips';

let _dbPromise = null;
function _openDb() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(_DB_NAME, _DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(_STORE_NAME)) {
        req.result.createObjectStore(_STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open voice-note database'));
  });
  return _dbPromise;
}

function _genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function saveClip(blob) {
  const db = await _openDb();
  const id = _genId();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(_STORE_NAME, 'readwrite');
    tx.objectStore(_STORE_NAME).put({ id, blob });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Failed to save the recording'));
  });
  return id;
}

export async function getClip(id) {
  const db = await _openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(_STORE_NAME, 'readonly');
    const req = tx.objectStore(_STORE_NAME).get(id);
    req.onsuccess = () => resolve(req.result ? req.result.blob : null);
    req.onerror = () => reject(req.error || new Error('Failed to load the recording'));
  });
}

export async function deleteClip(id) {
  if (!id) return;
  const db = await _openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(_STORE_NAME, 'readwrite');
    tx.objectStore(_STORE_NAME).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error || new Error('Failed to delete the recording'));
  });
}

// ===== RECORDING =====

const MAX_RECORDING_SECONDS = 300; // 5 min safety cap, well past anything a real note needs

// Priority order — Chrome/Edge (webm/opus) first, then Safari's usual pick, then a couple of
// long-shot fallbacks, then undefined (let the browser pick its own default — better than
// throwing on a platform none of these are supported on).
const _MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
function _pickMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  return _MIME_CANDIDATES.find(t => MediaRecorder.isTypeSupported(t));
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// ===== POPUP STATE =====

let _activeStream = null;
let _mediaRecorder = null;
let _recordedChunks = [];
let _recordingStartedAt = 0;
let _timerInterval = null;
let _previewBlob = null;   // the take currently loaded into the <audio> preview, unsaved until Save
let _previewObjectUrl = null;
let _previewDuration = 0;
let _currentTarget = null; // { item, audioField, rowNumber, rowEl } for the row this popup is open on
let _existingMeta = null;  // { id, duration, recordedAt } if this row already had a saved clip

function _el(id) { return document.getElementById(id); }

function _releaseStream() {
  if (_activeStream) {
    _activeStream.getTracks().forEach(t => t.stop());
    _activeStream = null;
  }
  if (_timerInterval) {
    clearInterval(_timerInterval);
    _timerInterval = null;
  }
  _mediaRecorder = null;
}

function _revokePreviewUrl() {
  if (_previewObjectUrl) {
    URL.revokeObjectURL(_previewObjectUrl);
    _previewObjectUrl = null;
  }
}

function _showError(message) {
  const el = _el('voice-note-error');
  el.textContent = message;
  el.style.display = 'block';
}
function _hideError() {
  const el = _el('voice-note-error');
  el.style.display = 'none';
  el.textContent = '';
}

// Resets the popup to its very first state — record button visible, nothing else. Used both when
// freshly opening on a row with no existing clip, and mid-session for "Re-record."
function _showRecordStep() {
  _revokePreviewUrl();
  _previewBlob = null;
  _previewDuration = 0;
  _el('voice-note-indicator').style.display = 'none';
  _el('btn-voice-note-record').style.display = '';
  _el('btn-voice-note-record').disabled = false;
  _el('btn-voice-note-stop').style.display = 'none';
  _el('voice-note-audio-preview').style.display = 'none';
  _el('voice-note-audio-preview').removeAttribute('src');
  _el('btn-voice-note-rerecord').style.display = 'none';
  _el('btn-voice-note-download').style.display = 'none';
  _el('btn-voice-note-save').style.display = 'none';
  _el('btn-voice-note-save').disabled = true;
  // Delete only ever makes sense once a clip is already saved to this row — not on a fresh take.
  _el('btn-voice-note-delete').style.display = _existingMeta ? '' : 'none';
}

// Shows a saved clip immediately on open (reopened via its chip) — same visual shape as the
// post-record preview step, minus Save (nothing new to save yet) and plus Delete.
async function _showExistingClip() {
  try {
    const blob = await getClip(_existingMeta.id);
    if (!blob) { _showRecordStep(); return; }
    _previewBlob = blob;
    _previewDuration = _existingMeta.duration || 0;
    _revokePreviewUrl();
    _previewObjectUrl = URL.createObjectURL(blob);
    const audio = _el('voice-note-audio-preview');
    audio.src = _previewObjectUrl;
    audio.style.display = '';
    _el('btn-voice-note-record').style.display = 'none';
    _el('btn-voice-note-stop').style.display = 'none';
    _el('voice-note-indicator').style.display = 'none';
    _el('btn-voice-note-rerecord').style.display = '';
    _el('btn-voice-note-download').style.display = '';
    _el('btn-voice-note-delete').style.display = '';
    _el('btn-voice-note-save').style.display = 'none'; // already saved — nothing new to persist
  } catch {
    _showError("Couldn't load this recording.");
    _showRecordStep();
  }
}

function _showPreviewStep(blob, durationSeconds) {
  _previewBlob = blob;
  _previewDuration = durationSeconds;
  _revokePreviewUrl();
  _previewObjectUrl = URL.createObjectURL(blob);
  const audio = _el('voice-note-audio-preview');
  audio.src = _previewObjectUrl;
  audio.style.display = '';
  _el('voice-note-indicator').style.display = 'none';
  _el('btn-voice-note-record').style.display = 'none';
  _el('btn-voice-note-stop').style.display = 'none';
  _el('btn-voice-note-rerecord').style.display = '';
  _el('btn-voice-note-download').style.display = '';
  _el('btn-voice-note-delete').style.display = _existingMeta ? '' : 'none';
  _el('btn-voice-note-save').style.display = '';
  _el('btn-voice-note-save').disabled = false;
}

async function _startRecording() {
  _hideError();
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    if (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
      _showError('Microphone access was denied — enable it in your browser\'s site settings and try again.');
    } else if (err && err.name === 'NotFoundError') {
      _showError('No microphone found.');
    } else {
      _showError("Couldn't access your microphone — try again.");
    }
    return;
  }
  _activeStream = stream;
  _recordedChunks = [];
  const mimeType = _pickMimeType();
  _mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  _mediaRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) _recordedChunks.push(e.data); };
  _mediaRecorder.onstop = () => {
    const blob = new Blob(_recordedChunks, { type: _mediaRecorder?.mimeType || 'audio/webm' });
    const durationSeconds = (Date.now() - _recordingStartedAt) / 1000;
    _releaseStream();
    _showPreviewStep(blob, durationSeconds);
  };
  _mediaRecorder.start();
  _recordingStartedAt = Date.now();

  _el('btn-voice-note-record').style.display = 'none';
  _el('btn-voice-note-stop').style.display = '';
  _el('voice-note-indicator').style.display = '';
  _el('voice-note-timer').textContent = '00:00';

  _timerInterval = setInterval(() => {
    const elapsed = (Date.now() - _recordingStartedAt) / 1000;
    _el('voice-note-timer').textContent = formatDuration(elapsed);
    if (elapsed >= MAX_RECORDING_SECONDS) {
      _showError(`Reached the ${Math.round(MAX_RECORDING_SECONDS / 60)} minute limit.`);
      _stopRecording();
    }
  }, 250);
}

function _stopRecording() {
  if (_mediaRecorder && _mediaRecorder.state !== 'inactive') _mediaRecorder.stop();
}

// ===== SAVE / DELETE =====

async function _save() {
  if (!_previewBlob || !_currentTarget) return;
  const saveBtn = _el('btn-voice-note-save');
  saveBtn.disabled = true;
  _hideError();
  try {
    const newId = await saveClip(_previewBlob);
    const { item, audioField, rowNumber, rowEl } = _currentTarget;
    const liveItem = await ensureLiveItem(item);
    const oldMeta = liveItem[audioField]?.[rowNumber];
    const meta = { id: newId, duration: _previewDuration, recordedAt: Date.now() };
    liveItem[audioField] = { ...(liveItem[audioField] || {}), [rowNumber]: meta };
    await persistItem(liveItem);
    // Only delete the old blob once the new metadata write has actually succeeded — a mid-flow
    // failure this way leaves one harmless orphaned blob rather than a broken/missing reference.
    if (oldMeta?.id && oldMeta.id !== newId) await deleteClip(oldMeta.id).catch(() => {});
    _patchChip(rowEl, meta);
    closeVoiceNoteModal();
  } catch {
    saveBtn.disabled = false;
    _showError("Couldn't save your recording — try again.");
  }
}

async function _deleteExisting() {
  if (!_existingMeta || !_currentTarget) return;
  if (!confirm('Delete this voice note?')) return;
  const { item, audioField, rowNumber, rowEl } = _currentTarget;
  try {
    const liveItem = await ensureLiveItem(item);
    const meta = liveItem[audioField]?.[rowNumber];
    if (liveItem[audioField]) {
      const next = { ...liveItem[audioField] };
      delete next[rowNumber];
      liveItem[audioField] = next;
    }
    await persistItem(liveItem);
    if (meta?.id) await deleteClip(meta.id).catch(() => {});
    rowEl?.querySelector('.detail-tracklist-audio-chip')?.remove();
    closeVoiceNoteModal();
  } catch {
    _showError("Couldn't delete this recording — try again.");
  }
}

function _download() {
  if (!_previewBlob) return;
  const a = document.createElement('a');
  a.href = _previewObjectUrl || URL.createObjectURL(_previewBlob);
  const ext = (_previewBlob.type || '').includes('mp4') ? 'mp4' : (_previewBlob.type || '').includes('ogg') ? 'ogg' : 'webm';
  a.download = `voice-note-${Date.now()}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Builds/updates a row's small "play + duration" chip in place, rather than re-rendering the
// whole row from storage — matches this feature's own existing convention (see
// detailModalNotes.js) of never clobbering a row's live DOM mid-edit.
function _patchChip(rowEl, meta) {
  if (!rowEl) return;
  const rowLine = rowEl.querySelector('.detail-tracklist-row');
  if (!rowLine) return;
  let chip = rowLine.querySelector('.detail-tracklist-audio-chip');
  if (!chip) {
    chip = document.createElement('span');
    chip.className = 'detail-tracklist-audio-chip';
    rowLine.querySelector('.detail-tracklist-favorite')?.after(chip);
  }
  chip.dataset.rowNumber = String(_currentTarget.rowNumber);
  chip.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg><span>${formatDuration(meta.duration)}</span>`;
  chip.onclick = e => {
    e.stopPropagation();
    openVoiceNoteModal({ ..._currentTarget, rowEl });
  };
}

// ===== PUBLIC API =====

export function openVoiceNoteModal({ item, audioField, rowNumber, rowEl }) {
  _currentTarget = { item, audioField, rowNumber, rowEl };
  const liveItem = item; // caller already resolves the live item where it matters (chip click / toolbar)
  _existingMeta = liveItem?.[audioField]?.[rowNumber] || null;
  _hideError();
  _el('voice-note-modal-overlay').classList.add('open');
  if (_existingMeta) _showExistingClip();
  else _showRecordStep();
}

export function closeVoiceNoteModal() {
  if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
    // Discard rather than finalize — closing mid-recording is a cancel, not an implicit save.
    _mediaRecorder.onstop = null;
    _mediaRecorder.stop();
  }
  _releaseStream();
  _revokePreviewUrl();
  _previewBlob = null;
  _currentTarget = null;
  _existingMeta = null;
  _el('voice-note-modal-overlay').classList.remove('open');
}

export function initVoiceNoteModal() {
  _el('btn-voice-note-record').addEventListener('click', _startRecording);
  _el('btn-voice-note-stop').addEventListener('click', _stopRecording);
  _el('btn-voice-note-rerecord').addEventListener('click', _showRecordStep);
  _el('btn-voice-note-save').addEventListener('click', _save);
  _el('btn-voice-note-delete').addEventListener('click', _deleteExisting);
  _el('btn-voice-note-download').addEventListener('click', _download);
  _el('btn-voice-note-cancel').addEventListener('click', closeVoiceNoteModal);
  _el('btn-voice-note-close').addEventListener('click', closeVoiceNoteModal);
  _el('voice-note-modal-overlay').addEventListener('click', e => {
    if (e.target === _el('voice-note-modal-overlay')) closeVoiceNoteModal();
  });
}
