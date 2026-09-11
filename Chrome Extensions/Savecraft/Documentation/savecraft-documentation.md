# SaveCraft Documentation — index

What lives in this folder and what each file is actually for. Start here.

| File | What it is |
|---|---|
| [`savecraft-architecture.md`](savecraft-architecture.md) | The main reference — single source of truth for features, the Categories table, Data Model/Firestore schema, file structure, architecture, and a "Recent Additions" changelog. Update this first when something changes. |
| [`session-context.md`](session-context.md) | AI quick-pickup context — detailed technical session-by-session history, plus runtime-mechanism reference not covered at that depth in architecture.md (State Object, View Routing, Author/Artist Profile System, External Search, Sidebar Structure, Curated Data loading/normalization, Dashboard, Key Architectural Patterns), Known Open Issues, and Planned But Not Yet Built. |
| [`savecraft-technical-runbook.md`](savecraft-technical-runbook.md) | How to deploy the web app (savecraft.org) — Firebase CLI setup, DNS/domain connection, API key restrictions, caching config, the temporary "View Demo" sign-in bypass, and a pre-deploy testing checklist. |
| [`launch-requirements.md`](launch-requirements.md) | A prioritized, actionable checklist (🔴/🟡/🟢) of what's outstanding before inviting real (non-team) users to test — security rules, legal pages, monitoring, mobile/browser test coverage. |
| [`savecraft-profile-security.md`](savecraft-profile-security.md) | A plain-language, non-technical explainer of how signing in and data security work — written for reference, not for developers. |

**Convention:** each fact should be written once, in whichever file above owns that topic, and
pointed to from anywhere else it's relevant — not independently re-described in a second file.
(This is the rule that broke down before this reorg: `savecraft-architecture.md` and
`session-context.md` had drifted into disagreeing copies of the same Categories table.)

Not SaveCraft product documentation, so it doesn't live here: Claude Code tooling/permissions
notes are in `.claude/PERMISSIONS.md`, next to the config they document.
