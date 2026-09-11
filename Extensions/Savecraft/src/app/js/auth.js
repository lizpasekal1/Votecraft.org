// ===== AUTH =====
// SaveCraft's own account system — independent from any shared Votecraft account (see
// firebase/votecraft-firebase.md's "Divergence for SaveCraft" note for why). Uses the Firebase
// Auth REST API directly via fetch(), matching storage.js's existing Firestore REST convention
// — no SDK, since the extension has no bundler. Pure logic, no DOM.
//
// Circular import with storage.js (storage.js imports isSignedIn/getCurrentUser/getValidIdToken
// from here; this module imports runInitialSync/deleteAllAccountFirestoreData from storage.js) —
// safe under this codebase's established convention, since neither side calls the other's import
// at module-evaluation time, only from inside function bodies (signUp/signIn/deleteAccount here;
// persistItem etc. there).
import { runInitialSync, deleteAllAccountFirestoreData } from './storage.js';
import { storageLocal } from './platform.js';

const _FIREBASE_API_KEY = 'AIzaSyArJ6pkXUDbZf4jcxRita0qcdr-hT46kI8';

const _SIGNUP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${_FIREBASE_API_KEY}`;
const _SIGNIN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${_FIREBASE_API_KEY}`;
const _SEND_OOB_CODE_URL = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${_FIREBASE_API_KEY}`;
const _LOOKUP_URL = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${_FIREBASE_API_KEY}`;
const _DELETE_ACCOUNT_URL = `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${_FIREBASE_API_KEY}`;
const _UPDATE_URL = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${_FIREBASE_API_KEY}`;
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
  CREDENTIAL_TOO_OLD_LOGIN_AGAIN: 'For security, please sign out and sign back in, then try deleting your account again.',
};

function _friendlyError(code) {
  return _ERROR_MESSAGES[code] || 'Something went wrong. Please try again.';
}

// { uid, email, idToken, refreshToken, idTokenExpiresAt, emailVerified? } | null
let _auth = null;
let _listeners = [];

function _notify() {
  const user = getCurrentUser();
  _listeners.forEach(cb => cb(user));
}

async function _persistAuth(auth) {
  _auth = auth;
  await new Promise(resolve => storageLocal.set({ savecraft_auth: auth }, resolve));
}

async function _clearAuth() {
  _auth = null;
  await new Promise(resolve => storageLocal.remove('savecraft_auth', resolve));
}

// Loads any persisted session at app startup. Call once, before anything else in this module
// is used. Refreshes emailVerified before the first _notify() (same "show fresh state on launch"
// precedent as storage.js's runInitialSync) so a link clicked in another tab/device since last
// launch is reflected immediately, not just after the next sign-in.
export async function initAuth() {
  const data = await new Promise(resolve => storageLocal.get({ savecraft_auth: null }, resolve));
  _auth = data.savecraft_auth;
  if (_auth) {
    await _refreshEmailVerified(_auth).catch(err => console.warn('[SaveCraft] Could not refresh verification status:', err));
  }
  _notify();
}

export function onAuthChange(callback) {
  _listeners.push(callback);
}

export function getCurrentUser() {
  return _auth ? { uid: _auth.uid, email: _auth.email, emailVerified: !!_auth.emailVerified } : null;
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

// Fetches the account's current emailVerified status from Firebase (accounts:lookup) and mutates
// + re-persists the passed-in auth object in place. Throws on failure — every call site swallows
// that itself (a failed refresh just leaves the previous known status in place, never blocks
// sign-in/sign-up).
async function _refreshEmailVerified(auth) {
  const resp = await fetch(_LOOKUP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: auth.idToken }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
  auth.emailVerified = !!data.users?.[0]?.emailVerified;
  await _persistAuth(auth);
}

// Sends the actual verification email through Firebase's own delivery — no email-sending code of
// ours needed. Shared by signUp's automatic first send and resendVerificationEmail's manual one.
async function _sendVerificationEmail(idToken) {
  const resp = await fetch(_SEND_OOB_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }),
  });
  const data = await resp.json();
  if (data.error) throw new Error(data.error.message);
}

export async function signUp(email, password) {
  try {
    const resp = await fetch(_SIGNUP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const data = await resp.json();
    // code is the raw Firebase error string (e.g. EMAIL_EXISTS) alongside the already-friendly
    // message — added for main.js's unified Save button, which needs to tell "this email already
    // has an account" apart from every other failure without fragile string-matching against
    // _friendlyError's user-facing text.
    if (data.error) return { ok: false, error: _friendlyError(data.error.message), code: data.error.message };
    const auth = _fromSignUpOrInResponse(data);
    await _persistAuth(auth);
    // Refreshed (and awaited) before _notify() so the very first render already shows accurate
    // emailVerified status, rather than listeners (applyAuthUI, the Profile page) firing on stale/
    // undefined data and never getting a second chance to update.
    await _refreshEmailVerified(auth).catch(err => console.warn('[SaveCraft] Could not refresh verification status:', err));
    _notify();
    // Fire-and-forget — sending the verification email is a side effect of a successful sign-up,
    // not something that should delay it or turn a slow mail send into a failed sign-up. The
    // "please verify" reminder already shows regardless of whether this succeeds (emailVerified is
    // false either way); resendVerificationEmail() covers the case where it didn't go through.
    _sendVerificationEmail(auth.idToken).catch(err => console.warn('[SaveCraft] Could not send verification email:', err));
    // Awaited (not fire-and-forget) so callers that await signUp() know the merge has actually
    // finished before they do anything render-dependent (see handleAuthSubmit in main.js) — a
    // brand-new account has nothing to merge, but this keeps the "sign in == sync" flow identical
    // for both signUp and signIn, and is a no-op if there's truly nothing local to upload. Errors
    // are swallowed here (not surfaced as a failed sign-in) since the account itself was created
    // successfully regardless of whether the sync round-trip succeeded.
    // syncError (not swallowed into the void) — the account itself was created successfully
    // regardless of whether the sync round-trip succeeded, so this still reports ok: true, but
    // callers (main.js) can surface it visibly instead of it only ever reaching a console no one's
    // looking at (a phone with no attached dev machine has no practical way to see a console.warn).
    let syncError = null;
    await runInitialSync(auth.uid).catch(err => { console.warn('[SaveCraft] Initial sync failed:', err); syncError = err?.message || String(err); });
    return { ok: true, syncError };
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
    // code — see signUp's identical comment above. Here it's specifically what tells the unified
    // Save button (main.js) "this email has no account yet" (EMAIL_NOT_FOUND) apart from a wrong
    // password or anything else, so it knows to fall back to creating one instead.
    if (data.error) return { ok: false, error: _friendlyError(data.error.message), code: data.error.message };
    const auth = _fromSignUpOrInResponse(data);
    await _persistAuth(auth);
    await _refreshEmailVerified(auth).catch(err => console.warn('[SaveCraft] Could not refresh verification status:', err));
    _notify();
    // syncError — see signUp's identical comment above.
    let syncError = null;
    await runInitialSync(auth.uid).catch(err => { console.warn('[SaveCraft] Initial sync failed:', err); syncError = err?.message || String(err); });
    return { ok: true, syncError };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

// Manual "Resend" button (auth modal + Profile page's Account card) for someone who's already
// signed in but hasn't verified yet — signUp only auto-sends once, this covers everything after.
export async function resendVerificationEmail() {
  const idToken = await getValidIdToken();
  if (!idToken) return { ok: false, error: 'Not signed in.' };
  try {
    await _sendVerificationEmail(idToken);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

// "Forgot password?" link (auth modal). Unlike _sendVerificationEmail above, this doesn't need an
// idToken — sendOobCode accepts a plain email for PASSWORD_RESET, which is the whole point (the
// person triggering this is, by definition, not signed in). Always reports success regardless of
// whether the email actually has an account — same "don't reveal which emails are registered"
// reasoning EMAIL_NOT_FOUND-style errors would otherwise leak, just applied here proactively
// rather than by mapping a specific error code.
export async function sendPasswordReset(email) {
  try {
    const resp = await fetch(_SEND_OOB_CODE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
    });
    const data = await resp.json();
    if (data.error && data.error.message !== 'EMAIL_NOT_FOUND') {
      return { ok: false, error: _friendlyError(data.error.message) };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

// Profile > Account Details' "Change Email" button. Firebase's accounts:update endpoint changes
// the sign-in email in place and returns a fresh idToken/refreshToken pair (the email itself is
// baked into the token) — persisted the same way sign-in does. Also fires a fresh verification
// email for the new address, matching signUp's own first-send behavior: changing the address
// effectively un-verifies the account until it's confirmed again.
export async function changeEmail(newEmail) {
  const idToken = await getValidIdToken();
  if (!idToken) return { ok: false, error: 'Not signed in.' };
  try {
    const resp = await fetch(_UPDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, email: newEmail, returnSecureToken: true }),
    });
    const data = await resp.json();
    if (data.error) return { ok: false, error: _friendlyError(data.error.message) };
    const auth = {
      uid: data.localId,
      email: data.email,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      idTokenExpiresAt: Date.now() + Number(data.expiresIn) * 1000,
      emailVerified: false,
    };
    await _persistAuth(auth);
    _notify();
    _sendVerificationEmail(auth.idToken).catch(err => console.warn('[SaveCraft] Could not send verification email:', err));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

// Permanent — the auth modal's own click handler (main.js) is what actually confirms with the
// person first. Deletes every Firestore document for this account (deleteAllAccountFirestoreData,
// storage.js) BEFORE deleting the Auth account itself — order matters, since the security rules
// need a still-valid, matching signed-in uid to authorize each of those deletes, and deleting the
// Auth account invalidates the idToken they'd need. Local (chrome.storage.sync) data is
// deliberately left alone, same as signOut() — see the plan/commit note for why.
export async function deleteAccount() {
  const user = getCurrentUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const idToken = await getValidIdToken();
  if (!idToken) return { ok: false, error: 'Not signed in.' };
  try {
    await deleteAllAccountFirestoreData(user.uid).catch(err => console.warn('[SaveCraft] Some account data may not have fully deleted:', err));
    const resp = await fetch(_DELETE_ACCOUNT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await resp.json();
    if (data.error) return { ok: false, error: _friendlyError(data.error.message) };
    await _clearAuth();
    _notify();
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Check your connection and try again.' };
  }
}

export async function signOut() {
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
      emailVerified: _auth.emailVerified,
    };
    await _persistAuth(auth);
    return auth.idToken;
  } catch {
    await _clearAuth();
    _notify();
    return null;
  }
}
