# SaveCraft: Accounts & Security, in Plain Terms

This is a basic, non-technical explainer of how signing in and data security currently work in
SaveCraft — written for reference, not for developers. If you want the deeper technical version,
ask and it can be written separately.

## The short version

- You can use SaveCraft (browse, save things, organize folders) **without ever making an
  account.** Everything just lives in your browser.
- Signing in is **optional**, and only does one thing: it makes your saves follow you to another
  computer or browser, instead of being stuck on just this one.
- Signing in uses a normal email + password — nothing fancier than that today.
- Your data is stored in a real cloud database (not just "on your computer"), and it's locked down
  so only you can see or change your own data.

## How you sign in

There's no "Sign in with Google" button anymore — that was tried and then removed, because asking
people to connect their Google account just to try out an extension felt like too much to ask for
a small tool. Instead, the sign-in screen still has a bit of Google/Chrome-flavored branding on it
(the "SaveCraft — Chrome Extension" header) so it *feels* like it belongs in the Chrome
environment, but that's purely visual — there's no real connection to your Google account at all.
Underneath, it's just: you type an email and a password, same as almost any website.

## Browsing without an account

The Profile page (where "Account," your saved playlists, etc. live) is visible even if you've
never signed in — it shows a stand-in "demo" name instead of your real one. The only thing that
actually requires signing in is clicking "Manage account," which opens the real sign-in screen.
This was a deliberate choice: nobody should have to create an account just to look around.

## Email verification

When you create a new account, SaveCraft now sends a real verification email (through the same
service that handles the accounts themselves, not anything custom-built). If you haven't clicked
that link yet, you'll see a small reminder — "Please verify your email" — with a button to resend
it, both on the sign-in screen and on the Profile page.

**Important: this never blocks you.** You can keep using SaveCraft, keep saving things, and keep
signing in, whether or not you've verified. It's just a gentle reminder, not a wall.

## Where your data actually lives, and how it's protected

Your saved items, folders, and account settings are stored in **Firestore**, which is Google's
cloud database service — think of it as a filing cabinet in the cloud, not something living only
on your laptop. This is the same underlying database used across the other Votecraft.org projects,
just kept in its own clearly separate section (each person's SaveCraft data lives under their own
private "drawer," identified by their account).

The protection works like this: every drawer has a rule attached to it that says *"only the person
who owns this drawer is allowed to open it."* That rule is enforced by Google's database itself —
not by SaveCraft's own code, and not something that can be bypassed by guessing a URL or poking
around in the browser. It doesn't matter whether the request coming in is a real person clicking
around, a script, or anything else automated — if the request doesn't prove it's you, it's
rejected before it ever reaches your data.

## Deleting your account

If you want your account and everything tied to it gone for good, there's a real "Delete account"
option — here's where to find it:

1. Open the **Settings** menu (the gear icon, top-right) and click **Profile**
2. On the Profile page, click **"Manage account"** on the Account card
3. In the screen that opens, you'll see **"Sign out"** — right below it, a smaller red link that
   says **"Delete account"**

Clicking it asks you to confirm first (a simple "Are you sure?" — nothing more elaborate yet).
Once confirmed, it's permanent: it deletes your sign-in itself and every saved item, folder, and
setting tied to your account in the cloud database. There's no "recover my account" option after
this — it's meant to be a genuine, final delete.

One nuance worth knowing: this only clears your data from the cloud drawer described above — it
doesn't reach into whatever's saved locally in *this* specific browser. In practice this rarely
matters, but if you delete your account and then create a *different* one on the same computer,
anything still sitting in this browser's local storage could get swept up into that new account
the next time it syncs. If that's ever a concern, clearing your browser's site data for the
extension first is the safest way to get a truly clean slate.

## A heads-up: SaveCraft now has a real web version too

SaveCraft is no longer just the Chrome extension — **savecraft.org** is a live website version,
built by someone else on the team, connected to this exact same cloud database. That means:

- An account you create in the Chrome extension will also work on savecraft.org, and vice versa
  — it's the same underlying account system either way.
- Your saved items are shared between both versions automatically, since they're reading from the
  same drawer.
- Unlike the extension, the website currently *requires* signing in to use at all (there's no
  local-only browsing there yet) — though there's a temporary "View Demo" option on the sign-in
  screen so people can look around without an account while this is still being polished.

## What's genuinely not built yet (good to know, not urgent)

- **No "forgot password" flow yet** — if you forget your password today, there's no self-service
  way to reset it.
- **No extra sign-in methods** — email + password is the only option right now (no Google, no
  magic links, etc.).
- Neither of these is a security hole — they're just features that haven't been built yet.

## One thing to actually do

The rule described above (*"only the owner can open their own drawer"*) needs to be manually
turned on inside Google's own control panel for the project — it's written down and ready, but
someone has to confirm it's actually switched on for the live database, not just sitting as a file
in this repo. That's a few clicks on a website (console.firebase.google.com), not something
requiring any coding — ask if you'd like the exact steps again.
