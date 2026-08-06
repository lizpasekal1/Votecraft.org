# Deploying SaveCraft's web app (savecraft.org)

SaveCraft now runs two ways from one codebase (`src/app/`): the Chrome extension (unchanged),
and a plain web app hosted on Firebase Hosting under the existing `votecraft-789` Firebase
project — the same one SaveCraft's Firestore data already lives in. See `src/app/js/platform.js`
for how the two environments are told apart at runtime.

## One-time setup

1. Install the Firebase CLI if you don't have it: `npm install -g firebase-tools`
2. `firebase login` — sign in with the Google account that owns the `votecraft-789` project.
3. From the Savecraft folder (`Chrome Extensions/Savecraft/`, where `firebase.json` and
   `.firebaserc` now live), you're already pointed at the right project — `.firebaserc` has
   `votecraft-789` set as default, so no `firebase use` step is needed.

## Deploying

From the Savecraft folder:

```
firebase deploy --only hosting
```

This publishes everything except `manifest.json`, `src/background/`, `src/content/`,
`src/popup/`, and a few non-app folders (`Documentation/`, `scripts/`, `rules/`, `_metadata/`) —
see `firebase.json`'s `ignore` list. It'll print a URL like
`https://votecraft-789.web.app` — **visit that first** to confirm the deploy works before doing
anything with the custom domain.

## Connecting savecraft.org

1. In the [Firebase console](https://console.firebase.google.com/project/votecraft-789/overview) →
   Hosting → **Add custom domain** → enter `savecraft.org`.
2. Firebase shows DNS records to add — as of the first setup (2026-08-06) this was one **A
   record** (`@` → `199.36.158.100`) and one **TXT record** (`@` → `hosting-site=votecraft-789`).
   These are specific to this project; re-check the console rather than assuming these values are
   still current if setting this up again later.
3. **Namecheap-specific gotcha:** this domain's nameservers were originally set to "Custom DNS"
   (routed through a cPanel account), which makes Namecheap's Advanced DNS → Host Records table
   read-only ("manage in cPanel" message instead of an editable list). Fix: Domain tab →
   Nameservers dropdown → switch **Custom DNS → Namecheap BasicDNS**. Only do this if nothing
   (email, an existing site) is actively relying on that cPanel setup — it disconnects whatever's
   plugged in there.
4. Namecheap also auto-creates two default records on a fresh domain that will conflict with the
   above and need deleting first: a `www` CNAME pointed at `parkingpage.namecheap.com`, and a
   `@` **URL Redirect Record** pointed at `http://www.savecraft.org/`. Delete both before adding
   Firebase's records. (Leave any existing `@` TXT record for email/SPF alone — multiple TXT
   records at the same host coexist fine.)
5. DNS propagation is genuinely inconsistent across resolvers — Google's/Cloudflare's public DNS
   picked up the change within minutes, but Firebase's own domain-verification backend (which has
   its own separate cache) kept showing "ACME challenge failed: <old parking IP>" for a while
   after public DNS was already correct. This resolved on its own without any further action —
   don't keep re-clicking "Verify" hoping to force it; Firebase retries automatically in the
   background. Useful way to check the real status directly instead of trusting the popup:
   `curl -v --resolve savecraft.org:443:<the A record IP> https://savecraft.org/` — look at the
   `subject:` line of the returned certificate. It'll say `CN=firebaseapp.com` (Firebase's shared
   placeholder cert) until the real `savecraft.org` cert has actually finished issuing.
6. Once it's live, `https://savecraft.org` serves the same app as the `.web.app` URL — no path
   suffix, just the bare domain (Firebase Hosting's rewrite rule sends `/` to
   `src/app/index.html` under the hood).

## Before it'll actually work: check the Firebase API key restrictions

`auth.js` and `storage.js` both call Firebase's REST APIs using this key:
`AIzaSyArJ6pkXUDbZf4jcxRita0qcdr-hT46kI8`. If that key has an **Application restriction** limiting
it to the Chrome extension (in [Google Cloud Console](https://console.cloud.google.com/) →
APIs & Services → Credentials → this key), requests from `savecraft.org` will get rejected with a
403. Check there first — if it's restricted, either add `savecraft.org`/`*.web.app` as an allowed
HTTP referrer, or loosen the restriction. If it's already unrestricted, nothing to do.

## Caching

`firebase.json` sets `Cache-Control: no-cache` on `/`, `/src/app/index.html`, and everything
under `/src/app/js/**` and `/src/app/css/**` — without this, Firebase Hosting's default 1-hour
cache meant a fresh `firebase deploy` didn't actually show up in the browser without a hard
refresh, which was confusing during active iteration. Images and other assets still cache
normally. If load performance ever matters more than always-fresh code, this is the first thing
to relax (e.g. back to a short max-age instead of `no-cache`).

## Temporary: the "View Demo" sign-in bypass

`index.html`'s `#btn-auth-demo` button and its handling in `main.js`'s `requireWebSignIn()` let a
web visitor skip the mandatory sign-in gate and use the app with local-only (not Firestore-backed)
storage — added for early demo purposes only, both call sites are commented `TEMPORARY`. **Remove
this before real visitors are expected at savecraft.org** — search both files for `TEMPORARY` to
find every piece to delete (the button markup, its reveal/hide toggling, and the extra resolve
path in the gate's Promise).

## Testing before you rely on it

1. **Extension** — load unpacked in `chrome://extensions` as usual, confirm nothing changed:
   sign-in, save/edit/delete, kanban drag-and-drop, and the right-click "Save to SaveCraft" flow.
2. **Web, locally, before deploying** — from the Savecraft folder: `npx serve .` (or any static
   file server), then visit `http://localhost:<port>/src/app/index.html` from a browser *without*
   the extension installed. You should be blocked by a non-dismissable sign-in modal (web
   requires sign-in — there's no local-only mode, see `main.js`'s `requireWebSignIn()`). After
   signing in, confirm items/folders/kanban load and that adding/editing/deleting round-trips to
   Firestore (reload the page and confirm it's still there).
3. **After the real deploy** — repeat the sign-in + data check at the `.web.app` URL, then again
   at `savecraft.org` once DNS/SSL are live. Also check on an actual phone browser, not just
   desktop responsive mode.
