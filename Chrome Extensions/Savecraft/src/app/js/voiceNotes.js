// ===== VOICE NOTES: recording popup + IndexedDB blob storage =====
// A voice note is an inline marker — a small <img data-audio-id> icon — embedded directly in a
// note/chapter/track's rich-text content, exactly like the toolbar's existing image-link button
// (see detailModalNotes.js's _insertImageLink). Not a separate per-row attachment: the marker can
// sit anywhere in the text, with ordinary editable text before and after it, and travels through
// the SAME save path every other bit of note formatting already uses — sanitizeNoteHtml (extended
// in noteSanitizer.js to keep data-audio-id/data-duration on IMG) plus the existing debounced
// input-triggered save in detailModalNotes.js's _wireNoteRows. This module never touches
// persistItem/item fields directly; it only manipulates the contenteditable DOM and IndexedDB.
//
// Storage is local-only, deliberately: the actual recorded Blob lives in IndexedDB (this
// browser/device only — never synced across devices or between the extension and the web build,
// and not covered by Firestore the way the rest of an item's data is). A direct, confirmed
// trade-off for shipping without new cloud-storage infrastructure (no Firebase Storage
// integration exists anywhere in this codebase today). The marker's data-duration is just a
// display hint copied from the recording at insert time — the source of truth for playback is
// always the real Blob in IndexedDB, looked up by data-audio-id.

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

// A data: URI image, not an inline <svg> — the marker has to survive noteSanitizer.js's allow-list
// (IMG only; SVG/path aren't allowed tags) and round-trip through innerHTML on every save/reload.
// Color is hardcoded (can't use currentColor inside a rasterized/data-URI image the way an inline
// <svg> can) to the app's own purple, same #5B5BEF hex already hardcoded elsewhere in this codebase
// for the identical "rule out any theming difference" reason.
const _MARKER_ICON_SRC = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#5B5BEF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">'
  + '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0 0 14 0v-1"/><line x1="12" y1="18" x2="12" y2="22"/></svg>'
)}`;

function _buildMarkerHtml(id, durationSeconds) {
  return `<img src="${_MARKER_ICON_SRC}" alt="Voice note (${formatDuration(durationSeconds)})" data-audio-id="${id}" data-duration="${Math.round(durationSeconds)}">`;
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
// { mode: 'insert', noteEl, range } — fresh recording from the toolbar; inserted at the captured
// cursor position (or appended at the end if nothing was selected) on Save.
// { mode: 'replace', markerEl } — opened by clicking an existing marker; Save swaps that exact
// marker for the new recording in place, Delete removes it outright.
let _currentTarget = null;
let _existingMeta = null; // { id, duration } — set only in 'replace' mode (an existing saved clip)

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

// Shows a saved clip immediately on open (reopened via its inline marker) — same visual shape as
// the post-record preview step, minus Save (nothing new to save yet) and plus Delete.
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

// Fires the same 'input' event _wireNoteRows already listens for on every note row
// (detailModalNotes.js) — reuses its existing debounced sanitize-and-persist path rather than this
// module writing to storage itself. bubbles: true so it's caught regardless of which exact
// descendant node the event target is.
function _dispatchInput(el) {
  el?.dispatchEvent(new Event('input', { bubbles: true }));
}

async function _save() {
  if (!_previewBlob || !_currentTarget) return;
  const saveBtn = _el('btn-voice-note-save');
  saveBtn.disabled = true;
  _hideError();
  try {
    const newId = await saveClip(_previewBlob);
    const markerHtml = _buildMarkerHtml(newId, _previewDuration);
    if (_currentTarget.mode === 'replace') {
      const { markerEl } = _currentTarget;
      const oldId = markerEl.dataset.audioId;
      const temp = document.createElement('div');
      temp.innerHTML = markerHtml;
      const newNode = temp.firstChild;
      const container = markerEl.closest('.detail-tracklist-notes-input');
      markerEl.replaceWith(newNode);
      _dispatchInput(container);
      // Only delete the old blob once the swap (and the container's own resulting save) has
      // actually happened — a mid-flow failure this way leaves one harmless orphaned blob rather
      // than a broken/missing reference.
      if (oldId && oldId !== newId) await deleteClip(oldId).catch(() => {});
    } else {
      const { noteEl, range } = _currentTarget;
      noteEl.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();
      if (range) {
        sel.addRange(range);
      } else {
        // No cursor position was captured (row had never been clicked into) — append at the end
        // rather than failing to insert at all.
        const r = document.createRange();
        r.selectNodeContents(noteEl);
        r.collapse(false);
        sel.addRange(r);
      }
      document.execCommand('insertHTML', false, markerHtml);
      _dispatchInput(noteEl);
    }
    closeVoiceNoteModal();
  } catch {
    saveBtn.disabled = false;
    _showError("Couldn't save your recording — try again.");
  }
}

async function _deleteExisting() {
  if (_currentTarget?.mode !== 'replace') return;
  if (!confirm('Delete this voice note?')) return;
  const { markerEl } = _currentTarget;
  const id = markerEl.dataset.audioId;
  const container = markerEl.closest('.detail-tracklist-notes-input');
  markerEl.remove();
  _dispatchInput(container);
  try {
    if (id) await deleteClip(id).catch(() => {});
  } finally {
    closeVoiceNoteModal();
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

// ===== PUBLIC API =====

// Two call shapes:
//  - openVoiceNoteModal({ noteEl, range }) — toolbar mic button, fresh recording. `range` is the
//    cursor position captured at click time (see detailModalNotes.js's _openVoiceRecorder) — the
//    popup stays open across the whole async record/preview flow, well after the row could have
//    lost focus/selection, so the insertion point has to be captured up front and restored later
//    rather than trusted to still be "the current selection" by the time Save fires.
//  - openVoiceNoteModal({ markerEl }) — an existing marker was clicked; shows its saved clip
//    immediately, offering Delete or Re-record (which replaces this exact marker in place).
export function openVoiceNoteModal({ noteEl, range, markerEl } = {}) {
  _hideError();
  _el('voice-note-modal-overlay').classList.add('open');
  if (markerEl) {
    _currentTarget = { mode: 'replace', markerEl };
    _existingMeta = { id: markerEl.dataset.audioId, duration: Number(markerEl.dataset.duration) || 0 };
    _showExistingClip();
  } else {
    _currentTarget = { mode: 'insert', noteEl, range };
    _existingMeta = null;
    _showRecordStep();
  }
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
