# VoteCraft — Claude Session Workflow

**Purpose:** This document ensures continuity across Claude sessions. At the start of any new session, ask Claude to read this file and the security plan. Claude should follow this workflow for all VoteCraft work.

**Location of key documents:**
- This file: `user-data-security/claude-workflow.md`
- Security plan: `user-data-security/security-plan.md`
- Vote platform concept: `pages/vote/vote-plan.md`

**How to start a session:** Tell Claude:
> "Read the files in user-data-security/ and then let's work on [topic]."

---

## 1. Mission Context

VoteCraft is a civic education platform. Every decision — technical, design, or data-related — must align with these principles:

- **Help people participate in democracy** — that is the entire purpose
- **Educate, never endorse** — present transparent, unbiased information so users make their own choices
- **Protect user trust** — civic data (addresses, political preferences, rankings, donations) is deeply personal and must be treated with the highest standard of care
- **Donations go to reform nonprofits, not candidates** — VoteCraft operates in the 501(c)(3) lane
- **No profiling, no tracking, no monetization of user data** — the vote/donate system is completely separate from user browsing and search activity
- **The user drives the experience** — the platform surfaces data, not opinions

Claude must hold these principles in every session. If a proposed feature, architecture decision, or code change conflicts with these principles, flag it immediately.

---

## 2. Project Status

Update this section as the project evolves.

**Last updated:** 2026-02-02

| App | Status | Notes |
|-----|--------|-------|
| Vote platform | Not yet built | Concept documented in `pages/vote/vote-plan.md` |
| MyReps | Live on GitHub Pages | Address lookup for elected reps. Uses third-party APIs with exposed keys. |
| JokeMaster | In development | Firebase/Firestore backend. Security rules need console verification. |
| Scavenger Tours | Paused | Supabase project paused due to inactivity. 90-day window to unpause. |
| Power Plays | In development | Static card game. |
| RCV Widgets | In development | Static ranked choice voting educational tools. |

**Infrastructure:**
- Hosting: GitHub Pages (static)
- Repository: github.com/lizpasekal1/Votecraft.org (private, SSH auth)
- No backend server yet — needed before vote platform launch
- Firebase: project `jokemaster-3ed37` (JokeMaster)
- Supabase: project `Votecraft_accounts` / `xvtgmjsselzlyjdzwoth` (Scavenger Tours, paused)

---

## 3. Security Awareness

Claude must follow these rules during all VoteCraft work:

**Never:**
- Hardcode API keys, tokens, or credentials in client-side code
- Store Tier 1 data (addresses, political preferences, donations, credentials) in localStorage or plaintext
- Send user data to third-party APIs without documenting it
- Build features that link vote/donate activity to user browsing or search behavior
- Commit files containing secrets (`.env`, credentials, tokens)

**Always:**
- Read `user-data-security/security-plan.md` at the start of sessions involving security-sensitive work
- Flag any security concern immediately when spotted — don't wait to be asked
- Update the security plan's audit log when security-related changes are made
- Update the remediation checklist when items are completed or new issues are found
- Check `git diff` before committing to ensure no secrets are included

**When building new features:**
- Classify what user data the feature will handle using the Tier system in the security plan
- Propose the data flow (where data goes, what sees it) before writing code
- Default to not collecting data — only collect what the feature strictly requires

---

## 4. Coding Standards

**General:**
- Keep solutions simple and focused — don't over-engineer
- Match existing patterns in the codebase
- Validate user input on both client and server
- Sanitize all output rendered in HTML
- Use HTTPS for all external requests

**File organization:**
- Static pages go in `pages/[feature-name]/`
- Games go in `games/[game-name]/`
- Shared widgets go in `vc-widgets/`
- Design assets go in `design/`
- Documentation goes in `docs/` or within each app's `docs/` subfolder
- Security documents go in `user-data-security/`

**WordPress deployment:**
- When modifying any JS or CSS file that will be uploaded to the WordPress server, always increment the cache buster query parameter in the HTML file that references it (e.g., `civic-api.js?v=2` becomes `civic-api.js?v=3`)
- Do this **before** telling the user to upload — not after

**Git practices:**
- Write clear commit messages describing what changed and why
- Never force push to main
- Review diffs before committing
- Keep `.gitignore` updated to exclude secrets and build artifacts

---

## 5. Session Workflow

When starting a new session on VoteCraft:

1. **Read this file** to load mission context, project status, and coding standards
2. **Read the security plan** (`user-data-security/security-plan.md`) if the session involves data handling, new features, or infrastructure
3. **Check the remediation checklist** for any blocking items relevant to the current work
4. **Read the relevant feature doc** (e.g., `pages/vote/vote-plan.md`) if working on a specific feature
5. **Update this file and the security plan** at the end of the session if project status, security posture, or infrastructure has changed

---

## 6. Document Maintenance

These documents must stay current:

| Document | Update when... |
|----------|---------------|
| `claude-workflow.md` (this file) | Project status changes, new apps are added, infrastructure changes, coding standards evolve |
| `security-plan.md` | Security issues are found or fixed, remediation items are completed, new features introduce new data handling |
| `pages/vote/vote-plan.md` | Vote platform design decisions are made or changed |

**Who updates:** Claude updates these documents during sessions when changes occur. The VoteCraft team reviews and approves changes.
