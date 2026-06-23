# VoteCraft VC Acquisition System — Design Document

*Last updated: 2026-02-12*

## Vision

VoteCraft Coin (VC) is a **civic engagement layer on top of existing payment apps** (PayPal, Venmo). It is NOT a payment processor. Think of it like Uber/Airbnb ratings: you build goodwill and trust through participation, not surveillance. The system must feel secure, friendly, fun, ethical, and explicitly NOT like a social credit score.

**People should not feel scared.** This is not a surveillance network. There are no leaderboards ranking people, no government access, no data selling. VC is voluntary civic participation that feels rewarding and safe.

## Core Rules

1. **VC is always paired with a real payment.** VC cannot be created out of thin air. Every VC earned is tied to a real-money transaction (donation or P2P payment).
2. **VC is never the only method of payment** for real-life tasks. Real-world services (tutoring, events, labor) must include real money. VC is an add-on, not a replacement. People still need to eat with real money.
3. **Digital-only services may optionally be VC-only** (e.g., sharing a guide, digital art). But for anything involving real-world effort, real money is required alongside VC.
4. **People can pay with VC and use VC for additional things** (Emporium, digital goods, future features), but VC supplements — it doesn't replace — the real economy.
5. **Predetermined VC amounts per activity type.** Each civic activity has a fixed VC value we define (e.g., community dance = 5 VC, tutoring = 10 VC). These are not proportional to the dollar amount paid.

## The Three Ways to Earn VC

### Path A: Donate to VoteCraft
User donates on the donate page → PayPal/Venmo processes payment → VC awarded automatically
- Tags auto-applied: Monetary, Civic Education, Supportive
- 1 VC per $1 donated

### Path B: Donate to a Nonprofit Through VoteCraft
User finds a nonprofit on an issue page → clicks donate link → donates on nonprofit's site → returns and confirms → VC awarded
- Tags auto-applied based on issue/nonprofit (predefined)
- Only the donor earns VC (the nonprofit is external)
- Self-report model (honor system with guardrails)

### Path C: Pay Someone Person-to-Person (P2P)
User A wants to pay User B for a civic service (tutoring, event, community work) → VC creates a payment link → payment happens through PayPal/Venmo → both earn VC
- **Sender chooses tags** from a menu when creating the payment
- **Both sender and receiver earn VC** (sender for supporting, receiver for providing civic value)
- VC never touches the money — PayPal/Venmo handle it directly

## Architecture

### Backend: Firebase (new project, separate from JokeMaster)
- **Firebase Auth**: Email + password accounts
- **Cloud Firestore**: User profiles, VC balances, transactions, tags, badges
- **No Cloud Functions needed** for Phase 1 (client-side SDK only)

### Payment: PayPal Smart Buttons + PayPal.me links
- **Path A (donate to VoteCraft)**: PayPal Smart Buttons on donate page, payment goes to VoteCraft's PayPal
- **Path C (P2P)**: Generate PayPal.me or Venmo deeplinks for the recipient, sender confirms completion

### Frontend: Web pages on votecraft.org (GitHub Pages)
- No mobile app — web only for now
- Auth state persists across all pages via Firebase (same origin)

## Privacy Model — "Goodwill, Not Surveillance"

The system builds trust like Uber/Airbnb ratings — through voluntary participation, not monitoring.

| Data | Default Visibility | User Control |
|------|-------------------|--------------|
| VC balance | **Always private** | Cannot be made public |
| Transaction history | **Private** | Can share individual transactions |
| Patron badge | **Visible** | Toggle off anytime |
| Altruism tags | **Visible** | Toggle per category |
| Display name | **User's choice** at signup | Switch to "Anonymous" anytime |

Key principles:
- Nobody can see your balance or full history
- Badges and tags are the fun/social part — visible by default but easy to hide
- No leaderboards, no rankings, no comparing people
- No government access, no data selling, no profiling (consistent with VoteCraft's core values)

## Firestore Data Model

### `users/{uid}`
```
{
  email, displayName, createdAt, updatedAt,
  vcBalance: 75,           // running total (private, never shown to others)
  totalDonated: 125.00,    // cumulative USD (private)
  patronBadge: "patron",   // null or "patron" (earned at $50+ cumulative)
  privacy: {
    showName: true,        // false = "Anonymous Patron"
    showBadge: true,       // false = hide badge
    showTags: true         // false = hide altruism tags
  }
}
```

### `users/{uid}/transactions/{auto-id}`
```
{
  type: "donate_votecraft" | "donate_nonprofit" | "p2p_send" | "p2p_receive",
  amount: 25.00,
  vcEarned: 25,
  source: "paypal" | "venmo" | "self_report",
  paypalOrderId: "...",         // Path A only
  nonprofitName: "FairVote",    // Path B only
  issueId: "rcv",               // Path B only
  counterpartyUid: "...",       // Path C only (the other person)
  counterpartyName: "...",      // Path C only
  altruismTags: ["Monetary", "Democracy", "Supportive"],
  isPublic: false,              // user can toggle per transaction
  createdAt: Timestamp
}
```

### Security Rules
- Users can only read/write their own profile and transactions
- Transactions are write-only (no update/delete — immutable ledger)
- Path B: max 3 self-reports per day (abuse prevention)
- Path C: max $500 per transaction (abuse prevention)

## User Flows

### Path A: Donate to VoteCraft
1. User visits donate.html, selects a tier ($12.30 / $25 / $50 / $100 / custom)
2. If not logged in → auth modal: "Sign up to earn VC from your donation"
3. User signs up or logs in (modal closes)
4. PayPal Smart Button appears → user completes payment in PayPal/Venmo
5. `onApprove` fires → transaction written to Firestore → VC balance incremented
6. Confirmation card: checkmark + "+25 VC earned" + coin animation + "View Profile" button
7. If cumulative donations ≥ $50 → patron badge awarded

### Path B: Donate to Nonprofit
1. User on issue detail page → clicks nonprofit "donate" button
2. Support overlay opens (existing behavior) with amount selection
3. User clicks "Go to [nonprofit] donate page" → opens in new tab
4. User returns to VoteCraft tab → overlay now shows "Did you complete your donation?"
5. If not logged in → "Sign up to earn VC" prompt
6. User confirms → transaction + auto-tags written to Firestore → VC awarded
7. Success message: "+25 VC earned" + altruism tag pills shown

### Path C: Pay Someone (P2P)
1. User goes to new "Send VC" page (or section within profile)
2. Enters: recipient email, amount, description of civic service
3. **Chooses altruism tags** from a picker (Contribution Type + Impact Area + Effort)
4. VC generates a PayPal.me link for that amount → user clicks to pay in PayPal
5. User returns and confirms "I sent the payment"
6. Transaction recorded for sender (p2p_send) → sender earns VC + chosen tags
7. **Recipient gets notified** (next time they log in) → transaction recorded (p2p_receive) → receiver earns VC + same tags
8. Both parties see the transaction in their history

## Altruism Tags

### Predefined Tag Categories (from existing index.html design)

**Contribution Type**: Monetary, Volunteer, Educational, Supportive
**Impact Area**: Democracy, Justice, Healthcare, Civic Education, Environment, Community
**Effort**: Quick Action, Ongoing, Deep Dive

### Auto-applied tags (Path A & B)

| Source | Contribution | Impact | Effort |
|--------|-------------|--------|--------|
| Donate to VoteCraft | Monetary | Civic Education | Supportive |
| RCV nonprofits | Monetary | Democracy | Supportive |
| Public Debt nonprofits | Monetary | Justice | Supportive |
| Citizens United nonprofits | Monetary | Democracy | Supportive |
| Healthcare nonprofits | Monetary | Healthcare | Supportive |
| SCOTUS Reform nonprofits | Monetary | Justice | Supportive |
| News Paywalls nonprofits | Monetary | Civic Education | Supportive |

### User-chosen tags (Path C)
For P2P payments, the sender picks tags from a tag picker UI:
- Must choose at least 1 tag from each category
- Tags apply to BOTH the sender's and receiver's transaction records
- Tag picker uses the existing `.atag` pill design from vc-coin.css

## Patron Badges

| Cumulative Donated | Badge |
|---|---|
| < $50 | None |
| ≥ $50 | Patron (star icon + glow animation) |

- Computed when any donation transaction is recorded
- Displayed next to name (if `privacy.showBadge` is true)
- Single tier for Phase 1; tiered badges (Silver/Gold) in Phase 2

## New Files to Create

| File | Purpose |
|------|---------|
| `pages/votecraft-coin/js/vc-firebase-config.js` | Firebase project config (apiKey, projectId, etc.) |
| `pages/votecraft-coin/js/vc-auth.js` | Auth module: modal UI, login/signup/logout, auth state observer, Firestore helpers for VC transactions |
| `pages/votecraft-coin/js/vc-donate.js` | Donate page logic: PayPal SDK button rendering, tier handling, VC award on payment |
| `pages/votecraft-coin/profile.html` | User dashboard: balance, badges, tags, history, privacy settings, P2P send flow |
| `pages/votecraft-coin/js/vc-profile.js` | Profile page logic: load/render user data, privacy toggles, P2P send, tag picker |

## Files to Modify

| File | Changes |
|------|---------|
| `pages/votecraft-coin/donate.html` | Add Firebase SDK + auth + PayPal SDK scripts; replace placeholder buttons with PayPal containers; add auth modal HTML; add logged-in header; remove "coming soon" note |
| `pages/votecraft-coin/index.html` | Add Firebase SDK + auth scripts; show VC balance in CTA if logged in; link to profile |
| `pages/votecraft-coin/css/vc-coin.css` | Auth modal styles, profile page styles, confirmation card, tag picker, transaction history rows, P2P send form |
| `pages/vote/vote.html` | Add Firebase SDK + auth scripts; auth indicator in sidebar header; modify support overlay for self-report flow; bump cache version |
| `pages/vote/js/vote-app.js` | Add `reportNonprofitDonation()` function; modify `openSupportOverlay()` to add "Did you donate?" confirmation + VC earning |
| `pages/vote/js/issues-data.js` | Add `altruismTags` property to each issue and nonprofit |

## Implementation Order

### Step 1: Firebase + Auth Foundation
- Create Firebase project (votecraft-vc), enable Auth + Firestore
- Write `vc-firebase-config.js` and `vc-auth.js`
- Add auth modal to `donate.html`
- Test: signup, login, logout, persistence across pages

### Step 2: PayPal + Path A (Donate to VoteCraft)
- Set up PayPal Developer account, get sandbox client ID
- Write `vc-donate.js` — render PayPal buttons per tier, award VC on capture
- Replace placeholder buttons on donate.html
- Add success confirmation UI
- Test end-to-end with PayPal sandbox

### Step 3: Profile Dashboard
- Create `profile.html` + `vc-profile.js`
- Sections: balance card, patron badge, altruism tags, transaction history, privacy toggles
- Link from donate confirmation, index.html CTA, vote.html sidebar
- Test: donate → see it in profile

### Step 4: Path B (Nonprofit Donations)
- Add altruism tags to `issues-data.js`
- Add Firebase scripts to `vote.html`
- Modify support overlay: "Did you donate?" self-report flow
- Add `reportNonprofitDonation()` to vote-app.js
- Test: issue page → nonprofit donate → confirm → VC + tags earned

### Step 5: Path C (P2P Payments)
- Add "Send VC" section to profile page (or new page)
- Build tag picker UI (multi-select from predefined categories)
- Generate PayPal.me link for recipient
- Record transactions for both sender and receiver
- Notification for receiver (check on login for pending VC)
- Test: send payment → both parties see VC + tags

### Step 6: Polish + Cross-page Auth
- Auth state on index.html and vote.html
- Bump cache version strings everywhere
- Test all flows end-to-end across pages

## Verification
- Create test Firebase accounts, run through all 3 paths
- Check Firestore for correct transaction records
- Verify privacy toggles hide/show correct data
- Test on mobile (520px breakpoint)
- PayPal sandbox → live switchover when ready
