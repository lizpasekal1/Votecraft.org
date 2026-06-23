# Vote Page — Architecture & Roadmap

## Status

The current implementation is a **national representative lookup + civic issue explorer**. The original plan (Massachusetts candidate-comparison tool) is the next phase of development. Both are documented here.

> **Note:** This codebase was built with AI assistance (Claude). Logic and data decisions were human-directed, but a developer should verify behavior rather than assume correctness. The bill keyword lists, issue selection, dedup scoring, and proxy architecture were all intentional choices — don't refactor them without understanding why they're there.

---

## What's Currently Built

A two-panel interface at `pages/vote/vote.html`:

- **Left panel** — Search by address or state name → shows your U.S. Senators, House Rep, state senators, state house members, and executive officials
- **Right panel** — Six civic reform issues displayed as a grid; selecting one shows a hero image, public awareness chart, bill sponsorship data for the selected rep, a map of their district, and nonprofit donate buttons

### How it works end-to-end

```
User types address/state
    → Nominatim (OpenStreetMap) geocodes it to lat/lng + state name
    → OpenStates geo API returns state legislators for that point
    → VoteCraft WordPress proxy returns Congress members from local DB
    → Both lists are merged and deduplicated
    → User selects a rep + an issue
    → Bill keywords for that issue are queried against OpenStates (state) and Congress.gov (federal)
    → Sponsorships are matched against the rep's last name
    → "Supports" / "No supported bills" shown on the alignment card
```

### Files

| File | Purpose |
|------|---------|
| `vote.html` | Layout and static HTML. JS/CSS loaded at bottom. |
| `js/vote-app.js` | Main app class (`VoteApp`). All UI logic lives here. |
| `js/civic-api.js` | API client. Geocoding, legislator lookups, bill searches, district boundary fetches. |
| `js/issues-data.js` | Static data for the 6 issues: descriptions, hero images, bill keywords, nonprofits. Also fetches keyword overrides and manual bill associations from the WordPress admin. |
| `css/vote.css` | All styles. |

### Key architecture decisions

**WordPress proxy for API keys**
OpenStates and Congress.gov API keys are never exposed client-side. All calls go through `https://votecraft.org/wp-json/votecraft/v1/openstates` and `.../congress`, which proxy requests server-side.

**Local DB for Congress members**
Congress members are synced into the WordPress database on a schedule rather than fetched live. This avoids rate limits and keeps page load fast. If the local DB is empty, the Congress section returns nothing — run the sync from the WordPress admin.

**Deduplication scoring**
When a full state legislator list loads in the background, it's merged with the address-specific results. Duplicates are resolved by a `dataScore` that weights photo availability heavily — the record with more complete data wins.

**Bill keyword lists**
Each issue in `issues-data.js` has a `billKeywords` array. These are queried in parallel against OpenStates. Keywords can be overridden from the WordPress admin at `/wp-json/votecraft/v1/keywords` without a code deploy.

**Manual bill associations**
Some federal bills don't surface through keyword search. `STATIC_BILL_ASSOCIATIONS` in `issues-data.js` hardcodes known bill-legislator links. These can also be managed from the WordPress admin.

**District map**
Uses Leaflet + Census TIGERweb to draw the selected rep's district boundary. US Senators show the full state boundary. Falls back to a centered point if the boundary fetch fails.

### The 6 issues (intentional scope)

Ranked Choice Voting, Public Debt Profiteering, Ending Citizens United, Universal Basic Healthcare, Supreme Court Reform, News Paywall Reform. These were chosen because they are structural/systemic reforms with documented cross-partisan public support. Don't swap them out without revisiting the nonprofit partnerships and bill keyword lists.

---

## Future: Massachusetts Candidate Comparison Tool

The original vision — still planned, not yet built.

### Overview

A civic education tool for Massachusetts elections. Users explore candidates, see how they align with reform nonprofits, personalize their ranking by issue priority, and donate to reform organizations — not candidates.

The platform operates as civic education, not candidate endorsement. Donations flow to nonprofit organizations (not candidates), keeping VoteCraft in the 501(c)(3) lane.

### Three pages planned

**Page 1 — Interactive Intro**
A quick under-one-minute experience:
1. User picks reform issues they care about
2. Gets a token budget
3. Sees candidate alignment levels
4. Allocates tokens to reform orgs
5. Sees what happens when reform orgs are funded vs. not

**Page 2 — Detailed List View**
All candidates listed with expandable sections: positions on key issues, nonprofit alignment scores, past polling, voter engagement. Donate button per nonprofit. External link to candidate's own donation page.

**Page 3 — Column Overview**
Side-by-side quick comparison with alignment scores visible at a glance.

### Personalized alignment ranking

The core differentiating feature:
1. User selects which reform orgs and issues matter to them
2. User weights priorities (drag-to-rank or sliders)
3. Each candidate gets a score based on public data: voting records, statements, questionnaire responses, nonprofit endorsements
4. Results framed as "here's how they align with *your* priorities" — never as a recommendation

### Data sources for candidate alignment

- Voting records on reform-related bills (public legislative data)
- Candidate questionnaires — identical, sent to all; publish all responses, note non-responses
- Public statements from candidate websites, debates, press
- Nonprofit endorsements from 501(c)(4) orgs (reported as fact)

### Legal framework

| Area | Approach |
|------|---------|
| Donation model | To 501(c)(3) / 501(c)(4) nonprofits, not candidates |
| Content unlocks | IRS quid pro quo rules; content value qualifies as insubstantial |
| Candidate info | Educational voter guide — no endorsements, uniform treatment of all candidates |
| Alignment scores | Public data, transparent methodology, user-driven weighting |
| Candidate donation links | External links only — VoteCraft never processes candidate donations |
