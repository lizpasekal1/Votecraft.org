// ===== AUTH =====
// SaveCraft's own account system — independent from any shared Votecraft account (see
// firebase/votecraft-firebase.md's "Divergence for SaveCraft" note for why). Uses the Firebase
// Auth REST API directly via fetch(), matching storage.js's existing Firestore REST convention
// — no SDK, since the extension has no bundler. Pure logic, no DOM.
//
// Circular import with storage.js (storage.js imports isSignedIn/getCurrentUser/getValidIdToken
// from here; this module imports runInitialSync from storage.js) — safe under this codebase's
// established convention, since neither side calls the other's import at module-evaluation
// time, only from inside function bodies (signUp/signIn here; persistItem etc. there).
import { runInitialSync } from './storage.js';

const _FIREBASE_API_KEY = 'AIzaSyArJ6pkXUDbZf4jcxRita0qcdr-hT46kI8';

const _SIGNUP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${_FIREBASE_API_KEY}`;
const _SIGNIN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${_FIREBASE_API_KEY}`;
const _SIGNIN_IDP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${_FIREBASE_API_KEY}`;
const _REFRESH_URL = `https://securetoken.googleapis.com/v1/token?key=${_FIREBASE_API_KEY}`;

const _ERROR_MESSAGES = {
  EMAIL_EXISTS: 'An account with that email already exists.',
  EMAIL_NOT_FOUND: 'No account found with that email.',
  INVALID_PASSWORD: 'Incorrect password.',
  INVALID_LOGIN_CREDENTIALS: 'Incorrect email or password.',
  USER_DISABLED: 'This account has been disabled.',
  WEAK_PASSWORD: 'Password should be at least 6 characters.',
  INVALID_EMAIL: 'That email address looks invalid.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts — please wait a bit and try again.',
};

function _friendlyError(code) {
  return _ERROR_MESSAGES[code] || 'Something went wrong. Please try again.';
}

// { uid, email, idToken, refreshToken, idTokenExpiresAt, provider?, googleAccessToken? } | null
// provider/googleAccessToken are only set for a Google-signed-in session (signInWithGoogle,
// below) — password sessions leave them undefined. googleAccessToken lets signOut() clean up
// Chrome's own cached token too, not just this module's session.
let _auth = null;
let _listeners = [];

function _notify() {
  const user = getCurrentUser();
  _listeners.forEach(cb => cb(user));
}

async function _persistAuth(auth) {
  _auth = auth;
  await new Promise(resolve => chrome.storage.local.set({ savecraft_auth: auth }, resolve));
}

async function _clearAuth() {
  _auth = null;
  await new Promise(resolve => chrome.storage.local.remove('savecraft_auth', resolve));
}

// Loads any persisted session at app startup. Call once, before anything else in this module
// is used.
export async function initAuth() {
  const data = await new Promise(resolve => chrome.storage.local.get({ savecraft_auth: null }, resolve));
  _auth = data.savecraft_auth;
  _notify();
}

export function onAuthChange(callback) {
  _listeners.push(callback);
}

export function getCurrentUser() {
  return _auth ? { uid: _auth.uid, email: _auth.email } : null;
}

export function isSignedIn() {
  return !!_auth;
}

function _fromSignUpOrInResponse(data) {
  return {
    uid: data.localId,
    email: data.email,
    idToken: data.idToken,
    refreshToken: data.refreshToken,
    idTokenExpiresAt: Date.now() + Number(data.expiresIn) * 1000,
  };
}

export async function signUp(email, password) {
  try {
    const resp = await fetch(_SIGNUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await resp.json();
    if (data.error) return { ok: false, error: _friendlyError(data.error.message) };
    const auth = _fromSignUpOrInResponse(data);
    await _persistAuth(auth);
    _notify();
    // Awaited (not fire-and-forget) so callers that await signUp() know the merge has actually
    // finished before they do anything render-dependent (see handleAuthSubmit in main.js) — a
    // brand-new account has nothing to merge, but this keeps the "sign in == sync" flow identical
    // for both signUp and signIn, and is a no-op if there's truly nothing local to upload. Errors
    // are swallowed here (not surfaced as a failed sign-in) since the account itself was created
    // successfully regardless of whether the sync round-trip succeeded.
    await runInitialSync(auth.uid).catch(err => console.warn('[SaveCraft] Initial sync failed:', err));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

export async function signIn(email, password) {
  try {
    const resp = await fetch(_SIGNIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await resp.json();
    if (data.error) return { ok: false, error: _friendlyError(data.error.message) };
    const auth = _fromSignUpOrInResponse(data);
    await _persistAuth(auth);
    _notify();
    await runInitialSync(auth.uid).catch(err => console.warn('[SaveCraft] Initial sync failed:', err));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

// "Sign in with Google" — trades a Google OAuth token (from Chrome's own built-in account picker,
// chrome.identity.getAuthToken — no separate login popup, uses whatever Google account the
// browser is already signed into) for a Firebase session via the Identity Toolkit's
// accounts:signInWithIdp REST endpoint. Same response shape (localId/email/idToken/refreshToken/
// expiresIn) as signUp/signInWithPassword, so _fromSignUpOrInResponse is reused as-is.
export async function signInWithGoogle() {
  try {
    const googleAccessToken = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, token => {
        if (chrome.runtime.lastError || !token) reject(chrome.runtime.lastError);
        else resolve(token);
      });
    });
    const resp = await fetch(_SIGNIN_IDP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `access_token=${googleAccessToken}&providerId=google.com`,
        requestUri: chrome.identity.getRedirectURL(),
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    });
    const data = await resp.json();
    if (data.error) return { ok: false, error: _friendlyError(data.error.message) };
    const auth = { ..._fromSignUpOrInResponse(data), provider: 'google', googleAccessToken };
    await _persistAuth(auth);
    _notify();
    await runInitialSync(auth.uid).catch(err => console.warn('[SaveCraft] Initial sync failed:', err));
    return { ok: true };
  } catch {
    // chrome.identity.getAuthToken fails/rejects for lots of mundane reasons (user closed the
    // account picker, no network, no OAuth client configured yet) — one friendly message covers
    // all of them, same as the network-error catch in signUp/signIn above.
    return { ok: false, error: 'Could not sign in with Google. Please try again.' };
  }
}

export async function signOut() {
  // Clears Chrome's own cached Google token too (not just this module's session) — otherwise
  // signing out and back in with a *different* Google account would silently reuse the old one,
  // since chrome.identity.getAuthToken caches by scope/account, independent of our own session.
  if (_auth?.provider === 'google' && _auth.googleAccessToken) {
    await new Promise(resolve => chrome.identity.removeCachedAuthToken({ token: _auth.googleAccessToken }, resolve));
  }
  await _clearAuth();
  _notify();
}

// Returns a valid idToken, refreshing first if it's within 60s of expiry. Returns null (and
// clears the session, treating it as signed-out) if the refresh token itself is dead — every
// storage.js call site already no-ops cleanly when signed out, so this degrades gracefully with
// no special-casing needed elsewhere.
export async function getValidIdToken() {
  if (!_auth) return null;
  if (Date.now() < _auth.idTokenExpiresAt - 60_000) return _auth.idToken;

  try {
    const resp = await fetch(_REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(_auth.refreshToken)}`,
    });
    const data = await resp.json();
    if (data.error) throw new Error(data.error.message || 'refresh failed');
    const auth = {
      uid: data.user_id,
      email: _auth.email,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
      idTokenExpiresAt: Date.now() + Number(data.expires_in) * 1000,
    };
    await _persistAuth(auth);
    return auth.idToken;
  } catch {
    await _clearAuth();
    _notify();
    return null;
  }
}
