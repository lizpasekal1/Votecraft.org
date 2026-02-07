# VoteCraft User Data Security Plan

**Document owner:** VoteCraft team
**Last updated:** 2026-02-02
**Status:** Active — pre-launch phase (no live users yet)
**Next review:** Before any user-facing features go live

---

## How to Read This Document

This document is the single source of truth for VoteCraft's security posture. It is structured for handoff to a security professional:

1. **Mission** — Why security matters for this project
2. **Project Overview** — What VoteCraft is and what data it will handle
3. **Current Security Audit** — Known issues, with severity, location, and status
4. **Sensitive Data Classification** — What data exists and how it must be treated
5. **Security Methods & Standards** — Required practices for all development
6. **Data Separation** — Architectural principle separating vote/donate from user activity
7. **Privacy & Transparency** — User-facing commitments
8. **Remediation Checklist** — Prioritized action items with status tracking
9. **Audit Log** — Dated record of all security actions taken

---

## Mission

VoteCraft exists to help people participate in democracy. That mission fails if users can't trust us with their data.

Civic data is uniquely sensitive. A person's address, political preferences, candidate rankings, and donation choices reveal deeply personal information. We treat all of it with the highest standard of care.

**Guiding principles:**
- Collect only what is necessary
- Protect everything we collect
- Be transparent about what we do with data
- Give users control over their own information
- Never sell, share, or monetize user data

---

## Project Overview

**VoteCraft** is a civic education platform. Key components:

| App | Purpose | Backend | Status |
|-----|---------|---------|--------|
| **Vote platform** (planned) | Massachusetts election candidate comparison, nonprofit donation, personalized alignment ranking | TBD | Not yet built |
| **MyReps** | Look up elected representatives by address | Static site, third-party APIs (OpenStates, Google Civic) | Live on GitHub Pages |
| **JokeMaster** | Narrative civic engagement game | Firebase/Firestore | In development |
| **Scavenger Tours** | Civic education scavenger hunt | Supabase (currently paused) | In development |
| **Power Plays** | Civic card game | Static | In development |
| **RCV Widgets** | Ranked choice voting educational tools | Static | In development |

**Hosting:** GitHub Pages (static site hosting)
**Repository:** github.com/lizpasekal1/Votecraft.org (private, SSH authenticated)

---

## Current Security Audit

An audit of the existing VoteCraft codebase identified the following issues. These must be resolved before any user-facing features handling sensitive data go live.

### Critical

| Issue | Location | Risk |
|-------|----------|------|
| Hardcoded Firebase API key | `games/jokemaster/src/scripts/firebase-config.js` | Exposed in browser — can be used to access Firebase services | OPEN |
| Hardcoded Supabase credentials | `games/scavenger-tours/js/supabase-config.js` | Anon key exposed — depends entirely on Row Level Security being configured | OPEN (Supabase project currently paused) |
| Hardcoded OpenStates API key | `pages/myreps/js/civic-api.js` | Can be scraped and abused for rate-limiting or impersonation | **RESOLVED** 2026-02-02 — moved to WordPress plugin proxy |
| Hardcoded Google Civic API key | `pages/myreps/js/civic-api.js` | Same risk — quota abuse, billing impact | OPEN |
| Git token was embedded in remote URL | `.git/config` | Was exposing repo access credentials | **RESOLVED** 2026-02-02 — switched to SSH, token revoked |

### High

| Issue | Location | Risk | Status |
|-------|----------|------|--------|
| User addresses sent to third-party APIs | `pages/myreps/js/civic-api.js` | Address data sent to OpenStates, Google, Nominatim without anonymization | OPEN |
| Public CORS proxy in use | `pages/myreps/js/civic-api.js` | `corsproxy.io` is a third-party service that sees all proxied requests | **RESOLVED** 2026-02-02 — replaced with WordPress plugin proxy |
| Weak password requirements | `games/scavenger-tours/profile.html` | 6-character minimum is insufficient | OPEN |
| No CSRF protection on forms | `pages/myreps/myreps.html`, `games/scavenger-tours/profile.html` | Forms vulnerable to cross-site request forgery | OPEN |

### Medium

| Issue | Location | Risk | Status |
|-------|----------|------|--------|
| Unencrypted localStorage | Multiple apps | User preferences, likes, and game data stored in plaintext | OPEN |
| Supabase Row Level Security unknown | `games/scavenger-tours/` | If RLS is not enabled, any authenticated user could read other users' data | OPEN (project paused — verify when unpaused) |
| Firebase security rules unknown | `games/jokemaster/` | No `firestore.rules` file deployed. Rules in docs but likely never pushed. May be using default open rules. | OPEN — needs Firebase console check |
| Minimal input sanitization | Multiple apps | Potential XSS risk if user input is rendered without escaping | OPEN |

---

## Sensitive Data Classification

All data handled by VoteCraft falls into one of these categories:

### Tier 1 — Highly Sensitive (strictest protection)
- **Home addresses and location data** — reveals where someone lives
- **Political preferences and candidate rankings** — reveals political beliefs
- **Donation history** — reveals financial and political activity
- **Issue priority selections** — reveals personal values and reform priorities
- **Authentication credentials** — passwords, tokens, session data

### Tier 2 — Sensitive (standard protection)
- **Email addresses** — personally identifiable
- **Game progress and engagement data** — reveals usage patterns
- **Reform organization selections** — reveals civic interests

### Tier 3 — Non-sensitive (basic protection)
- **Aggregated, anonymized usage statistics** — no individual identification
- **Public candidate data** — already publicly available
- **App preferences** — theme, volume, display settings

**Rule:** Tier 1 data must never be stored client-side in plaintext. Tier 1 and 2 data must never be sent to third parties without explicit user consent and a documented data processing agreement.

---

## Security Methods & Standards

### 1. API Key Management

**Current state:** Keys are hardcoded in client-side JavaScript.

**Required state:**
- All API keys stored in environment variables on the server
- Client-side code calls our own backend, which proxies requests to third-party APIs
- Backend validates and rate-limits requests before forwarding
- No API keys visible in browser DevTools or source code
- API keys rotated on a regular schedule and immediately upon any suspected exposure

**Implementation approach:**
```
User browser  →  VoteCraft backend (validates, rate-limits)  →  Third-party API
                  ↑ API keys live here only
```

### 2. Authentication & Password Standards

**Requirements:**
- Minimum 12-character passwords
- Must include uppercase, lowercase, and a number or symbol
- Passwords hashed with bcrypt (or equivalent) — never stored in plaintext
- Session tokens are short-lived and rotated
- Support for multi-factor authentication when handling Tier 1 data
- Account lockout after repeated failed login attempts

### 3. Data Encryption

**In transit:**
- All connections over HTTPS — no exceptions
- HSTS headers enabled to prevent downgrade attacks
- TLS 1.2 minimum

**At rest:**
- Tier 1 data encrypted in the database
- No Tier 1 data in localStorage or sessionStorage
- If client-side caching is necessary for UX, use session-only storage and encrypt values

### 4. Input Validation & Sanitization

**All user input must be:**
- Validated on the client (for UX) AND on the server (for security)
- Sanitized before rendering in HTML (prevent XSS)
- Parameterized in any database queries (prevent injection)
- Length-limited to prevent abuse
- Type-checked against expected formats (e.g., zip codes, email addresses)

### 5. Third-Party API Data Handling

**Current problem:** User addresses are sent directly to OpenStates, Google Civic, and Nominatim.

**Required approach:**
- Proxy all third-party API calls through our backend
- Strip unnecessary data before forwarding (e.g., send only zip code instead of full address when possible)
- Do not log user addresses in server logs
- Document which third parties receive what data
- Review third-party privacy policies and ensure they meet our standards
- Eliminate public CORS proxy — replace with our own backend proxy

### 6. Row Level Security (Supabase & Firebase)

**Supabase:**
- Enable RLS on all tables containing user data
- Policies must ensure users can only read/write their own records
- The anon key must not grant access to other users' data
- Test RLS policies explicitly — verify a user cannot access another user's rows

**Firebase:**
- Review and tighten Firestore security rules
- Default deny — only allow specific, authenticated access patterns
- No broad read/write rules on collections containing user data

### 7. Donation Flow Security (Future)

When donation processing is added to the vote platform:
- **Never handle credit card data directly** — use Stripe Embedded Forms, PayPal, or similar
- PCI compliance is mandatory if any card data touches our systems
- Donation amounts and recipients are Tier 1 data
- Donation records must be encrypted at rest
- Provide users with clear receipts and the ability to see/delete their donation history
- Separate donation data from political preference data in storage

### 8. Data Retention & Deletion

- Define retention periods for each data type
- User addresses: do not store beyond the active session unless user opts in
- Political preferences: retain only while user has an active account
- Provide a "delete my data" function that removes all Tier 1 and Tier 2 data
- When a user deletes their account, purge all associated data within 30 days
- Anonymize data used for aggregate analytics — no way to trace back to individuals

---

## Data Separation: Voting & Donations Are Not Linked to User Activity

A core design principle of VoteCraft: **the vote and donate systems are completely separate from user searches, preferences, and browsing activity.**

This means:
- When a user searches for candidates or explores issues, that activity is **not tracked, stored, or connected** to any donation or voting action
- Donation records do not reference what a user searched for, which candidates they viewed, or how they ranked their priorities
- Candidate alignment rankings are generated in real time based on the user's input — they are not saved or linked to donation behavior
- No profile is built from browsing patterns, search history, or engagement data
- There is no recommendation engine that uses past activity to influence future suggestions

**Why this matters:**
- Users must feel safe exploring candidates and issues without fear that their curiosity will be recorded or used against them
- Donations should reflect a user's genuine choice — not be influenced by a system that tracks and nudges based on past behavior
- This separation protects users from profiling and ensures the platform remains a neutral civic education tool

**Implementation requirements:**
- Donation processing and candidate exploration must use separate data stores with no cross-referencing
- Server logs must not correlate user sessions across these systems
- Analytics, if any, must be aggregated and anonymized — never tied to individual donation or search activity
- This principle must be clearly communicated to users on the platform itself, not buried in a privacy policy

---

## Privacy & Transparency

- Publish a clear privacy policy explaining what data is collected, why, and how it's protected
- Notify users before collecting any Tier 1 data
- Provide data export functionality — users can download their own data
- Never use political preference data for advertising, profiling, or sale to third parties
- If a data breach occurs, notify affected users within 72 hours

---

## Remediation Checklist

Prioritized actions to bring the project to a secure baseline.

### Immediate (before any new user-facing features ship)

- [x] Revoke the old GitHub personal access token — **DONE 2026-02-02**
- [x] Switch repository authentication from token to SSH — **DONE 2026-02-02**
- [ ] Verify Firebase Firestore security rules in console — **NEEDS OWNER ACTION** (check console.firebase.google.com > jokemaster-3ed37 > Firestore > Rules)
- [ ] Verify Supabase Row Level Security when project is unpaused — **BLOCKED** (project paused by Supabase)
- [ ] Move all API keys out of client-side code into environment variables
- [x] Set up a backend proxy for OpenStates API — **DONE 2026-02-02** (WordPress plugin `votecraft-api`)
- [ ] Set up a backend proxy for Google Civic and Nominatim APIs
- [x] Remove the public CORS proxy (`corsproxy.io`) dependency — **DONE 2026-02-02**
- [ ] Rotate all exposed API keys (Firebase, Supabase, OpenStates, Google Civic)

### Before vote platform launch

- [ ] Implement server-side input validation and sanitization
- [ ] Add CSRF protection to all forms
- [ ] Upgrade password requirements to 12-character minimum with complexity rules
- [ ] Ensure all pages enforce HTTPS with HSTS headers
- [ ] Encrypt Tier 1 data at rest in the database
- [ ] Remove Tier 1 data from localStorage — use encrypted session storage if needed
- [ ] Implement session token rotation and expiration
- [ ] Create a public-facing privacy policy
- [ ] Build "delete my data" functionality

### Ongoing

- [ ] Rotate API keys on a regular schedule
- [ ] Monitor third-party API usage for anomalies
- [ ] Review dependencies for known vulnerabilities (`npm audit`)
- [ ] Log and monitor authentication events
- [ ] Conduct periodic security reviews of new features before deployment
- [ ] Keep this document updated as the project evolves

---

## Audit Log

All security-related actions taken on this project, in reverse chronological order.

| Date | Action | Details |
|------|--------|---------|
| 2026-02-02 | WordPress API proxy deployed and verified | Installed `votecraft-api` WordPress plugin. OpenStates API calls now route through `votecraft.org/wp-json/votecraft/v1/openstates`. API key is server-side only. Proxy tested successfully — returns legislator data. CORS proxy (`corsproxy.io`) fully replaced. |
| 2026-02-02 | GitHub token revoked | Old personal access token (`ghp_98jk...`) revoked via GitHub settings. Token was previously embedded in git remote URL. |
| 2026-02-02 | SSH authentication set up | Generated Ed25519 SSH key, added to GitHub, switched repo remote from HTTPS+token to SSH (`git@github.com:lizpasekal1/Votecraft.org.git`). |
| 2026-02-02 | Security plan created | Initial security audit conducted. Document created at `user-data-security/security-plan.md` covering all VoteCraft apps. |
| 2026-02-02 | Supabase project status noted | Supabase project `Votecraft_accounts` (ID: xvtgmjsselzlyjdzwoth) is paused by Supabase due to inactivity. 90-day window to unpause or download data. |
| 2026-02-02 | OpenStates API key moved server-side | Created PHP proxy (`pages/myreps/api/openstates-proxy.php`) to handle OpenStates API calls. Removed API key and CORS proxy from client-side JS. OpenStates key is now only in the PHP file on the WordPress server. |
| 2026-02-02 | CORS proxy (corsproxy.io) removed from MyReps | `civic-api.js` no longer uses `corsproxy.io`. All OpenStates requests now go through the PHP proxy on votecraft.org. |
| 2026-02-02 | Firebase rules gap identified | No `firestore.rules` file deployed in repo. Recommended rules exist in `games/jokemaster/docs/firebase-setup.md` but may never have been applied. Needs manual console verification. |

---

## For Security Professionals

Welcome. This section is your onboarding guide. It's designed to get you up to speed quickly and establish a working relationship with the team and with Claude (the AI coding assistant used on this project).

### Current Architecture

Currently a static site hosted on GitHub Pages with client-side JavaScript calling third-party APIs directly. No backend server. Firebase and Supabase are used as backend-as-a-service for two game apps.

### Biggest Risks Right Now

1. Four API keys are hardcoded in client-side JS (see Critical audit items above)
2. Firebase Firestore security rules have not been verified — may be in default open mode
3. No backend exists to proxy API calls — all keys must be in client code until one is built

### What's Planned

- A vote platform handling political preferences, candidate rankings, and nonprofit donations
- This will require a backend, proper auth, encrypted storage, and payment processing
- The platform must enforce strict data separation between vote/donate activity and user browsing (see Data Separation section above)

### Key Files to Review

- `games/jokemaster/src/scripts/firebase-config.js` — Firebase credentials
- `games/scavenger-tours/js/supabase-config.js` — Supabase credentials
- `pages/myreps/js/civic-api.js` — OpenStates + Google Civic API keys, CORS proxy usage
- `games/jokemaster/docs/firebase-setup.md` — Intended Firestore rules (may not be deployed)
- `games/scavenger-tours/profile.html` — Auth forms with weak password policy

### How This Team Works

**Roles:**
- **VoteCraft team (project owner)** — sets priorities, makes product decisions, owns all accounts and credentials
- **Claude (AI coding assistant)** — writes code, maintains documentation, flags security issues during development. Works from `user-data-security/claude-workflow.md` for session continuity.
- **Security professional (you)** — reviews architecture, validates security decisions, audits code, approves features before they go live with user data

**What Claude does well:**
- Follows security rules consistently once defined
- Flags exposed credentials, missing validation, and unsafe data flows during coding sessions
- Maintains the audit log and remediation checklist in this document
- Can implement fixes across the codebase quickly

**What Claude needs from you:**
- Validation of security architecture decisions (e.g., backend proxy design, auth flow, encryption approach)
- Review of any code touching Tier 1 data before it ships
- Firestore/Supabase security rules review (Claude can read code but not access cloud consoles)
- Approval on third-party integrations and data processing agreements
- Guidance on compliance requirements (501(c)(3) data handling, state privacy laws)

**What you should expect from Claude:**
- Every security-related code change is logged in the Audit Log section above
- New features that handle user data will include a data flow description before implementation
- Claude will not ship code that violates the principles in this document without flagging it
- If Claude is unsure about a security decision, it will defer to you

### Recommended Onboarding Steps

1. **Read this entire document** — it covers the security posture, data classification, and standards
2. **Read `user-data-security/claude-workflow.md`** — understand how Claude operates on this project
3. **Review the key files listed above** — assess the current exposure
4. **Check the Firebase console** — verify Firestore security rules for `jokemaster-3ed37`
5. **Review the Remediation Checklist** — prioritize what to tackle first based on your assessment
6. **Define your review process** — tell the team how you want to review code before it goes live (PR reviews, scheduled audits, feature sign-off, etc.)
7. **Update this document** — add any standards, requirements, or processes you want enforced. Claude will follow them in all future sessions.

### Working With Claude — For the Security Professional

You don't need to interact with Claude directly. Here's how the loop works:

```
Security professional defines standards/rules
        ↓
VoteCraft team adds them to this document or claude-workflow.md
        ↓
Claude reads these documents at the start of each session
        ↓
Claude follows the rules during development
        ↓
Claude logs all security-related changes in the Audit Log
        ↓
Security professional reviews the Audit Log and code changes
        ↓
Feedback goes back into the documents
```

If you want Claude to follow a specific practice (e.g., "always use parameterized queries," "never store X in localStorage," "require my sign-off before deploying feature Y"), add it to the **Security Methods & Standards** section or the **Security Awareness** rules in `claude-workflow.md`. It will be enforced in every session going forward.

### Open Questions for Security Professional

These are decisions the team is waiting on professional guidance for:

- [ ] What backend architecture should we use for the API proxy? (Cloudflare Workers, Vercel functions, dedicated server, etc.)
- [ ] What auth provider/approach for the vote platform? (Firebase Auth, Supabase Auth, Auth0, custom, etc.)
- [ ] What are the compliance requirements for handling Massachusetts voter data?
- [ ] Should we pursue a formal security audit before launch, or is ongoing review sufficient?
- [ ] What monitoring/alerting should be in place at launch?
- [ ] Do we need a data processing agreement with third-party API providers (OpenStates, Google Civic)?
