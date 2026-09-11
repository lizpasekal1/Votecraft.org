# SaveCraft Documentation — index

What lives in this folder and what each file is actually for. Start here. Files are numbered in
suggested reading order.

| File | What it is |
|---|---|
| [`1_savecraft-documentation.md`](1_savecraft-documentation.md) | This index. |
| [`2_savecraft-session-context.md`](2_savecraft-session-context.md) | AI quick-pickup context — detailed technical session-by-session history, plus runtime-mechanism reference not covered at that depth in architecture.md (State Object, View Routing, Author/Artist Profile System, External Search, Sidebar Structure, Curated Data loading/normalization, Dashboard, Key Architectural Patterns), Known Open Issues, and Planned But Not Yet Built. |
| [`3_savecraft-architecture.md`](3_savecraft-architecture.md) | The main reference — single source of truth for features, the Categories table, Data Model/Firestore schema, file structure, architecture, and a "Recent Additions" changelog. Update this first when something changes. |
| [`4_savecraft-profile-security.md`](4_savecraft-profile-security.md) | A plain-language, non-technical explainer of how signing in and data security work — written for reference, not for developers. |
| [`5_savecraft-technical-runbook.md`](5_savecraft-technical-runbook.md) | How to deploy the web app (savecraft.org) — Firebase CLI setup, DNS/domain connection, API key restrictions, caching config, the temporary "View Demo" sign-in bypass, and a pre-deploy testing checklist. |
| [`6_savecraft-launch-requirements.md`](6_savecraft-launch-requirements.md) | A prioritized, actionable checklist (🔴/🟡/🟢) of what's outstanding before inviting real (non-team) users to test — security rules, legal pages, monitoring, mobile/browser test coverage. |
| [`7_savecraft-permissions.md`](7_savecraft-permissions.md) | Claude Code tooling/permissions notes for this project — not SaveCraft product documentation, kept here anyway for one-folder convenience; documents `.claude/settings.json` in this same repo. |

**Convention:** each fact should be written once, in whichever file above owns that topic, and
pointed to from anywhere else it's relevant — not independently re-described in a second file.
(This is the rule that broke down before this reorg: `3_savecraft-architecture.md` and
`2_savecraft-session-context.md` had drifted into disagreeing copies of the same Categories table.)
