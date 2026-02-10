# VoteCraft User Data Security Plan

**Document owner:** VoteCraft team
**Last updated:** 2026-02-10
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
| **Vote platform** | Massachusetts election candidate comparison, nonprofit donation, VoteCraft Coin (VC) altruism currency, Emporium, personalized alignment ranking | WordPress backend + GitHub Pages frontend | In development |
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
- **VoteCraft Coin (VC) balances and transaction history** — reveals engagement level and donation patterns
- **Emporium purchase history** — reveals personal interests

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

### 8. VoteCraft Coin (VC) — Altruism Currency

**Overview:** VoteCraft Coin (VC) is an altruism-based virtual currency designed to reward and visualize positive civic participation. Instead of being mined through energy or speculation, VC is earned by contributing to community well-being — supporting nonprofits, learning about issues, volunteering, sharing knowledge, or helping others engage in democracy. VC can be spent in the VoteCraft Emporium for games, guides, art, and other digital offerings.

**Key properties:**
- VC is **not a cryptocurrency** — it has no blockchain, no speculative trading, and no monetary exchange value
- VC is earned through verified civic actions (primarily nonprofit donations through VoteCraft)
- VC is spent exclusively within the VoteCraft Emporium
- VC balances are stored server-side, not in wallets or client-side storage

**Current earning structure:**
| Donation Amount | VC Earned | Additional Rewards |
|----------------|-----------|-------------------|
| $12.30 | 12 VC | — |
| $25 | 25 VC | — |
| $50 | 50 VC | Patron badge |
| $100 | 100 VC | Patron badge |

**Security requirements:**

**8a. VC Balance Integrity**
- VC balances must be stored server-side in an authenticated, encrypted data store
- No client-side manipulation of VC balances — all earning and spending must be validated server-side
- Every VC transaction (earn or spend) must be logged with timestamp, amount, source action, and user ID
- VC earning must be tied to verified donation completions (confirmed by payment processor callback), not donation initiation
- Rate-limiting on VC-earning actions to prevent abuse (e.g., rapid micro-donations to farm VC)

**8b. Patron Badge Security**
- Patron badges are earned at the $50+ donation tier
- Badge display on issue pages means other users can see patron status — this is **opt-in** (users choose a profile or anonymous badge)
- Badge data must not reveal donation amounts, specific nonprofits supported, or any Tier 1 data
- Badge assignment must be server-validated — no client-side badge creation

**8c. Emporium Transaction Security**
- All Emporium purchases (spending VC) must be processed server-side
- Atomic transactions: VC deduction and item delivery must be a single transaction to prevent double-spending
- Emporium items (games, guides, art) should be delivered through authenticated access, not direct URLs that can be shared
- Purchase history is Tier 2 data — treat accordingly

**8d. Anti-Abuse Measures**
- Prevent VC farming through fraudulent donations (e.g., donate-then-chargeback cycles)
- If a donation is refunded or charged back, the corresponding VC must be revoked
- Monitor for anomalous VC earning patterns (bulk accounts, automated donations)
- VC is non-transferable between users to prevent black-market trading
- VC has no cash-out mechanism — it cannot be converted back to real currency

**8e. Data Classification Impact**
- VC balances: **Tier 2** (sensitive — reveals engagement level)
- VC transaction history: **Tier 2** (reveals donation patterns over time)
- Emporium purchase history: **Tier 2** (reveals personal interests)
- Patron badge display preference: **Tier 3** (user-controlled public/anonymous choice)
- Note: The underlying donation that earned VC remains **Tier 1** — VC data must not be cross-referenced to expose donation details to other users

**8f. What VC is NOT — Legal Disclaimers**

This section is critical for legal protection and must be clearly communicated to users in the platform's terms of service, Emporium, and any VC-related UI.

VoteCraft Coin (VC):
- **Is not legal tender** — VC is not money and is not recognized as currency by any government
- **Is not a cryptocurrency or digital asset investment** — there is no blockchain, no mining, no token contract, and no exchange listing
- **Does not represent shares, equity, dividends, or profit rights** — holding VC confers no ownership stake in VoteCraft or any affiliated entity
- **Is not redeemable for cash** — VC cannot be converted, sold, or exchanged for real-world currency under any circumstances
- **Should not be purchased with the expectation of financial return** — VC is earned through civic participation, not purchased as an investment
- **Has no monetary value outside of VoteCraft** — VC exists solely for use within the VoteCraft Emporium

**Why this matters:** These disclaimers help avoid SEC classification as a security under the Howey Test. If users invest money with the expectation of profit derived from the efforts of others, the instrument may be regulated as a security. VC must be clearly positioned as a loyalty/rewards mechanism, not a financial product.

**Implementation:** These disclaimers must appear in:
- Terms of Service (required acceptance before earning VC)
- Emporium storefront (visible on every page)
- VC info panel in the donate overlay (already partially implemented)
- Any marketing materials that reference VC

**8g. Earning Rules — Fairness & Transparency**

Clear, published earning rules prevent accusations of manipulation, favoritism, or deceptive practices.

**How VC is earned:**
- **Nonprofit donations through VoteCraft** — primary earning method. VC amount matches donation in a published ratio (currently 1 VC per $1 donated)
- **Civic learning activities** (planned) — completing educational modules about issues, candidates, or civic processes
- **Volunteering verification** (planned) — participating in verified volunteer activities through VoteCraft partner organizations
- **Community engagement** (planned) — sharing knowledge, helping others engage in democracy through the platform

**Verification standards:**
- Donation-based VC: verified through payment processor confirmation (Stripe/PayPal webhook callback). VC is not credited until the payment is settled, not just initiated
- Activity-based VC (planned): verified through completion tracking within the platform (e.g., quiz completion, module progress). Must be tamper-resistant — no client-side self-reporting
- Volunteer-based VC (planned): verified through partner organization confirmation. Requires a documented verification protocol with each partner
- All verification methods must be documented and auditable

**VC expiration, revocation, and caps:**
- **Expiration:** VC does not currently expire. If an expiration policy is introduced, users must be given at least 90 days notice and a minimum 12-month validity period
- **Revocation:** VC can be revoked in the following circumstances:
  - Donation chargeback or refund (corresponding VC is clawed back)
  - Fraudulent activity (fake accounts, automated farming, exploiting bugs)
  - Terms of service violation
- **Caps:** No per-user VC balance cap is currently planned. If caps are introduced, they must be announced in advance
- **Revocation process:** Users must be notified of any VC revocation with a clear reason and an opportunity to dispute

**Fairness safeguards:**
- The VC earning formula must be publicly documented — no hidden multipliers or secret bonus tiers
- All users earn VC at the same rate for the same actions — no preferential treatment
- Changes to earning rates must be announced at least 30 days in advance
- Historical VC balances are not retroactively adjusted when rates change (grandfathering)
- An audit trail of all VC policy changes must be maintained in this document

**8h. Ownership & Platform Control**

VoteCraft retains full ownership and control over the VC system:
- VC is **issued and managed exclusively by VoteCraft** — there is no decentralized governance or external authority over VC
- VoteCraft reserves the right to **modify, pause, or discontinue** the VC system at any time, with reasonable advance notice to users
- Users do not "own" VC as property in the traditional financial or legal sense — VC is a **platform benefit**, similar to loyalty points or rewards credits
- VoteCraft may adjust VC balances, earning rates, or Emporium pricing as needed to maintain system integrity
- In the event the VC system is discontinued, users will be given a notice period (minimum 90 days) to spend remaining VC in the Emporium before balances are zeroed
- These terms must be clearly stated in the Terms of Service and accepted by users before they earn or spend VC

**8i. Tax Awareness**

- VoteCraft does not provide tax advice and makes no representations about the tax treatment of VC
- **Users are responsible for understanding any tax implications of earning or spending VC in their jurisdiction**
- This disclaimer must appear in the Terms of Service
- If VC earning is ever tied to activities that could be considered income or prizes (e.g., contests, referral bonuses), consult a tax attorney to determine reporting obligations (e.g., IRS Form 1099 thresholds)
- Donations made through VoteCraft that earn VC may be tax-deductible depending on the recipient nonprofit's status — VoteCraft should clarify that VC earned does not reduce the deductible amount of the donation

**8j. Anti-Abuse & Ethics Clause**

Because VC is tied to civic action, the system must be protected from exploitation that undermines its mission:

**Prohibited VC-earning behavior:**
- **Misinformation** — earning VC through activities that deliberately spread false or misleading information about candidates, issues, or civic processes
- **Harassment** — using VC-earning activities to target, intimidate, or harass individuals, organizations, or communities
- **Manipulation** — gaming the system through coordinated inauthentic behavior, bot accounts, or exploiting platform vulnerabilities
- **Bad-faith participation** — completing civic activities (e.g., educational modules) without genuine engagement solely to farm VC

**Enforcement:**
- VC can be **revoked** for any violation of the ethics clause, with notification to the user and a stated reason
- Repeated or severe violations may result in account suspension or permanent ban
- Users may dispute revocation through a defined appeals process (to be established before launch)
- VoteCraft will maintain a record of all enforcement actions for accountability

**Ethical commitment:**
- VoteCraft will never design VC-earning activities that incentivize partisan behavior, political donations to specific candidates, or ideological alignment
- VC earning is tied to **participation and education**, not to holding or expressing specific political views
- The system must remain a neutral tool for civic engagement, not a mechanism for political influence

**8k. Transparency**
- Users must be able to view their full VC balance and transaction history
- Clearly communicate that VC has no real-world monetary value
- Publish the VC earning formula so users understand how VC is calculated
- If the VC system or earning rates change, notify users in advance
- Users can request deletion of their VC balance and history as part of "delete my data"

### 9. Data Retention & Deletion

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

- [ ] Design and implement server-side VC ledger (balance tracking, transaction log, earn/spend validation)
- [ ] Implement chargeback/refund VC revocation — VC must be clawed back if underlying donation is reversed
- [ ] Build Emporium with authenticated access control — no direct URL sharing of purchased content
- [ ] Implement Patron badge system with opt-in/anonymous toggle
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
| 2026-02-10 | VC ownership, tax, and ethics sections added | Added Section 8h (Ownership & Platform Control), 8i (Tax Awareness), 8j (Anti-Abuse & Ethics Clause). Renumbered Transparency to 8k. |
| 2026-02-10 | VC legal disclaimers and earning rules added | Added Section 8f (What VC is NOT — legal disclaimers for SEC/Howey Test protection) and Section 8g (Earning Rules — fairness, verification standards, expiration/revocation/caps policy, fairness safeguards). |
| 2026-02-10 | VoteCraft Coin (VC) security section added | Added Section 8 covering VC altruism currency security: balance integrity, patron badges, Emporium transactions, anti-abuse measures, data classification, and transparency requirements. Updated Tier 2 data classification, project overview, remediation checklist, and open questions for security professional. |
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
- **VoteCraft Coin (VC)** — an altruism-based virtual currency earned through civic participation (primarily donations), spent in the Emporium for games, guides, and art. Not a cryptocurrency — no blockchain, no cash value, no trading. See Section 8 for full security requirements.
- **Emporium** — a digital storefront where users spend VC on curated content. Requires authenticated access control and server-side transaction processing.
- **Patron badges** — public recognition for $50+ donors, displayed on issue pages (opt-in, anonymous option available)
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
- [ ] What safeguards are needed to prevent VC farming through donation-chargeback cycles? Should VC earning be delayed until donation settlement?
- [ ] Does the VC/Emporium system introduce any regulatory requirements (e.g., virtual currency laws, consumer protection for digital goods)?
- [ ] How should Patron badge visibility be managed to prevent social engineering or targeted harassment of donors?
- [ ] **Accessibility & inclusion:** How do we ensure VC earning opportunities are available to people who can't donate money? (The planned volunteer/learning paths help, but need concrete design)
- [ ] **Dispute resolution process:** What is the concrete appeals workflow when VC is revoked? (Steps, timeline, who reviews, escalation path)
- [ ] **Third-party partner agreements:** When volunteer verification involves partner organizations, what data sharing agreements and verification protocols are needed?
- [ ] **Jurisdictional considerations:** Which states or countries have specific virtual currency or digital goods regulations beyond SEC that could apply to VC/Emporium?
