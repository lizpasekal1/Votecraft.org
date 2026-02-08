# VoteCraft Database Architecture

This document describes the database setup and data flow for the VoteCraft application.

## Overview

VoteCraft uses a WordPress database with custom tables to store:
- **Legislators** (state and federal)
- **Bills** (state and federal legislation)
- **Sponsorships** (links between legislators and bills)
- **Cache** (stored API responses for fast retrieval)
- **Sync Log** (tracking sync operations)

Data comes from two APIs:
- **OpenStates API v3** — state legislators and bills
- **Congress.gov API v3** — federal legislators and bills

## Database Tables

### 1. `wp_votecraft_legislators`

Stores all legislator information (state legislators and Congress members).

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(100) | **PK** — OpenStates person ID (e.g., `ocd-person/12345-...`) or Congress bioguide ID |
| `name` | VARCHAR(255) | Full name |
| `party` | VARCHAR(50) | Political party |
| `state` | VARCHAR(50) | State name (e.g., "Massachusetts") |
| `chamber` | VARCHAR(20) | "upper" (Senate) or "lower" (House) |
| `district` | VARCHAR(50) | District number/name |
| `photo_url` | VARCHAR(500) | URL to photo |
| `email` | VARCHAR(255) | Contact email |
| `current_role` | TEXT | JSON of current role details |
| `jurisdiction_id` | VARCHAR(100) | OpenStates jurisdiction ID |
| `level` | VARCHAR(20) | "state" or "congress" |
| `raw_data` | LONGTEXT | Full JSON from API response |
| `updated_at` | DATETIME | Last sync timestamp |

**Indexes:** `state_chamber (state, chamber)`, `jurisdiction (jurisdiction_id)`

**Key Notes:**
- The `id` field is VARCHAR (OpenStates ID format), NOT an integer — use `%s` in queries
- `level = 'congress'` for federal legislators, `level = 'state'` for state
- `raw_data` contains the complete API response for extracting additional fields

### 2. `wp_votecraft_bills`

Stores bill/legislation information from both OpenStates and Congress.gov.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(100) | **PK** — OpenStates bill ID or `congress-{num}-{type}-{number}` |
| `identifier` | VARCHAR(50) | Bill number (e.g., "H 4034", "S 2911", "HR 1234") |
| `title` | TEXT | Bill title/description |
| `state` | VARCHAR(50) | State name or "Federal" for Congress bills |
| `session` | VARCHAR(50) | Legislative session (e.g., "2025" or "119th Congress") |
| `chamber` | VARCHAR(20) | Originating chamber ("upper" or "lower") |
| `classification` | VARCHAR(100) | Bill type (e.g., "bill", "resolution") — OpenStates only |
| `subject` | TEXT | **(Legacy)** Search keyword that found this bill — being replaced by `issue_id` |
| `issue_id` | VARCHAR(50) | Which VoteCraft issue found this bill (e.g., "rcv", "healthcare") or the search keyword |
| `subjects` | TEXT | JSON array of actual topic classifications from the API |
| `abstract` | TEXT | Bill summary/abstract text |
| `latest_action_date` | DATE | Date of most recent action |
| `latest_action_description` | TEXT | Description of latest action |
| `openstates_url` | VARCHAR(500) | Link to bill page (OpenStates or Congress.gov URL) |
| `raw_data` | LONGTEXT | Full JSON from API |
| `updated_at` | DATETIME | Last sync timestamp |

**Indexes:** `state_session (state, session)`, `issue_search (state, issue_id)`

**Column Details:**

| Column | OpenStates Data | Congress.gov Data |
|--------|----------------|-------------------|
| `id` | `ocd-bill/...` | `congress-119-hr-1234` |
| `issue_id` | Search keyword (e.g., "ranked choice") | Issue ID (e.g., "rcv") |
| `subjects` | `["Elections", "Voting Methods"]` (state-assigned topics) | `["Health", "Medicare", "Prescription drugs"]` (CRS legislativeSubjects + policyArea) |
| `abstract` | First abstract from `abstracts` array | Summary from Congress.gov summaries endpoint |
| `classification` | `"bill"`, `"resolution"`, etc. | *(not populated)* |
| `session` | `"2025"`, `"2024-2025"` | `"119th Congress"` |

### 3. `wp_votecraft_sponsorships`

Links legislators to bills they sponsor/cosponsor.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | **PK** — Auto-increment |
| `bill_id` | VARCHAR(100) | Foreign key → `wp_votecraft_bills.id` |
| `legislator_id` | VARCHAR(100) | Foreign key → `wp_votecraft_legislators.id` |
| `legislator_name` | VARCHAR(255) | Legislator name (denormalized for searching) |
| `sponsorship_type` | VARCHAR(50) | "primary" or "cosponsor" |
| `classification` | VARCHAR(50) | Additional classification |

**Indexes:** `bill_id`, `legislator_id`, `UNIQUE unique_sponsorship (bill_id, legislator_name(100), sponsorship_type)`

### 4. `wp_votecraft_cache`

Stores cached API responses for fast retrieval.

| Column | Type | Description |
|--------|------|-------------|
| `cache_key` | VARCHAR(64) | **PK** — MD5 hash of endpoint + params |
| `endpoint` | VARCHAR(20) | API source ("bills", "people", "congress") |
| `response_data` | LONGTEXT | Full JSON response |
| `created_at` | INT UNSIGNED | Unix timestamp when cached |

**Cache TTL (Time To Live):**
- People: 24 hours
- People by geo: 12 hours
- Bills: 4 hours
- Congress data: 4 hours
- Max age before deletion: 7 days

### 5. `wp_votecraft_sync_log`

Tracks sync operations for monitoring.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | **PK** — Auto-increment |
| `sync_type` | VARCHAR(50) | "legislators", "bills", "Federal-legislators", "BATCH", etc. |
| `state` | VARCHAR(50) | State being synced |
| `status` | VARCHAR(20) | "success", "error", "partial" |
| `records_synced` | INT | Number of records processed |
| `error_message` | TEXT | Error details if failed |
| `started_at` | DATETIME | When sync started |
| `completed_at` | DATETIME | When sync finished |

**Indexes:** `sync_type_status (sync_type, status)`

## Data Sources

### OpenStates API v3 (State Legislators & Bills)
- **Base URL:** `https://v3.openstates.org`
- **Endpoints used:**
  - `/people` — State legislators
  - `/people.geo` — Legislators by lat/lng
  - `/bills` — State legislation (with `include=sponsorships&include=abstracts`)
- **API Key:** Stored in `VOTECRAFT_OPENSTATES_API_KEY` constant
- **Rate Limit:** Daily limit tracked in `votecraft_openstates_rate_limit_date` option

**Data extracted from OpenStates bills:**
- `subject` array → stored in `subjects` column as JSON
- First `abstracts[].abstract` → stored in `abstract` column
- `sponsorships` → stored in sponsorships table
- `from_organization.classification` → stored as `chamber`

### Congress.gov API v3 (Federal Legislators & Bills)
- **Base URL:** `https://api.congress.gov/v3`
- **Endpoints used:**
  - `/member` — Search Congress members by name
  - `/member/{bioguideId}/sponsored-legislation` — Bills they sponsor
  - `/member/{bioguideId}/cosponsored-legislation` — Bills they cosponsor
  - `/bill/{congress}/{type}/{number}/subjects` — Bill subjects (legislativeSubjects + policyArea)
  - `/bill/{congress}/{type}/{number}/summaries` — Bill summary text
- **API Key:** Stored in plugin code
- **Rate Limit:** 5,000 calls/hour

**Data extracted from Congress.gov bills:**
- `policyArea.name` + `legislativeSubjects[].name` → stored in `subjects` column as JSON
- Summary text (HTML stripped) → stored in `abstract` column
- `latestAction.actionDate` / `latestAction.text` → stored in action columns
- Bill type (S/H/HR/etc.) → mapped to `chamber` ("upper"/"lower")

## Data Flow

### Frontend (User-Facing)

```
User enters address/zip
        ↓
Frontend calls /wp-json/votecraft/v1/openstates?endpoint=people.geo
        ↓
Proxy checks: Local DB → Cache → Live API
        ↓
Returns legislators with their info
        ↓
User clicks issue + legislator
        ↓
Frontend calls /wp-json/votecraft/v1/openstates?endpoint=bills&q=keyword
        ↓
Proxy searches: Local DB (title + subjects + abstract + issue_id)
  → Falls back to Cache → Falls back to Live API
        ↓
Word boundary validation filters false positives
        ↓
Frontend filters bills to show ones this legislator sponsors
```

### Bill Matching Logic

Bills are matched to issues using a multi-layer approach:

1. **SQL query** — `LIKE '%keyword%'` against `title`, `subjects`, `abstract` columns; exact match on `issue_id`
2. **Word boundary validation** — PHP regex `\b` check on results to eliminate partial word matches
3. **Frontend filtering** — JavaScript RegExp word boundary check on Congress bills

```
Keyword: "ranked choice"
        ↓
SQL: title LIKE '%ranked choice%' OR subjects LIKE '%ranked choice%'
     OR abstract LIKE '%ranked choice%' OR issue_id = 'ranked choice'
        ↓
PHP: preg_match('/\branked choice\b/i', $title)  ← validates each result
        ↓
Only bills with actual word boundary matches pass through
```

### Admin Dashboard (Bill Associations)

```
Admin searches for legislator by name
        ↓
Queries wp_votecraft_legislators table
        ↓
Admin selects issue to look up bills
        ↓
votecraft_lookup_openstates_bills_by_issue() runs:
  1. Queries wp_votecraft_bills + wp_votecraft_sponsorships
     (searches title, subjects, abstract, issue_id)
  2. Falls back to wp_votecraft_cache for cached API responses
  3. NO external API calls (prevents rate limiting)
        ↓
Word boundary validation filters false positives
        ↓
Returns bills grouped by issue for review/exclusion
```

### Data Sync (Background/Manual)

```
OpenStates Sync (scheduled every 4 hours):
        ↓
For each state in priority list:
  1. Fetch legislators from /people endpoint
  2. Store in wp_votecraft_legislators (level='state')
  3. For each issue keyword:
     a. Fetch bills from /bills (include=sponsorships&include=abstracts)
     b. Extract subjects array → subjects column (JSON)
     c. Extract first abstract → abstract column
     d. Store keyword → issue_id column
     e. Store bills in wp_votecraft_bills
     f. Store sponsorships in wp_votecraft_sponsorships

Congress.gov Sync (monthly):
        ↓
  1. Fetch all senators and representatives
  2. Store in wp_votecraft_legislators (level='congress')
  3. For each member × each issue:
     a. Fetch sponsored + cosponsored legislation
     b. Filter by issue keywords (title + policyArea matching)
     c. For each matched bill:
        - Fetch /bill/{congress}/{type}/{number}/subjects
          → legislativeSubjects + policyArea → subjects column (JSON)
        - Fetch /bill/{congress}/{type}/{number}/summaries
          → summary text → abstract column
        - Extract latestAction → action date/description columns
     d. Store in wp_votecraft_bills (state='Federal')
     e. Store sponsorships in wp_votecraft_sponsorships
```

## Issue Keywords

Bills are matched to issues using keyword searches. Keywords are defined in:
- **Frontend:** `pages/vote/js/issues-data.js` → `ISSUES_CATALOG[].billKeywords`
- **Admin:** Editable in the "Keyword Controls" accordion on the VoteCraft Sync dashboard
- **WordPress API:** `/wp-json/votecraft/v1/keywords` (overrides static defaults if set)

### Current Issues & Sample Keywords

| Issue ID | Issue Name | Sample Keywords |
|----------|------------|-----------------|
| `rcv` | Ranked Choice Voting | ranked choice, instant runoff, preferential voting, rcv |
| `debt-profiteering` | Public Debt Profiteering | student debt, predatory lending, payday loan |
| `citizens-united` | Ending Citizens United | campaign finance, dark money, super pac |
| `healthcare` | Universal Basic Healthcare | medicare for all, public option, medicaid expansion |
| `scotus` | Supreme Court Reform | supreme court, judicial term limits, court expansion |
| `news-paywalls` | News Paywall Reform | local journalism, news deserts, journalism funding |

## WordPress Options

| Option Name | Purpose |
|-------------|---------|
| `votecraft_sync_db_version` | Current DB schema version (triggers migrations on change) |
| `votecraft_openstates_rate_limit_date` | Date when daily rate limit was hit |
| `votecraft_congress_rate_limit_time` | Timestamp when hourly rate limit was hit |
| `votecraft_scheduled_sync_enabled` | Whether auto-sync is enabled |
| `votecraft_congress_sync_progress` | Progress tracker for Congress bill sync batches |
| `votecraft_congress_bills_sync_progress` | Progress tracker for Congress bills-by-issue sync |
| `votecraft_excluded_bills` | Manually excluded bill-legislator associations |
| `votecraft_manual_bill_associations` | Manually added bill-legislator associations |
| `votecraft_issue_keywords` | Custom keywords (overrides defaults from issues-data.js) |

## REST API Endpoints

### Public Endpoints (Frontend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/wp-json/votecraft/v1/openstates` | GET | Proxy for OpenStates API (state data) |
| `/wp-json/votecraft/v1/congress` | GET | Proxy for Congress.gov API (federal data) |
| `/wp-json/votecraft/v1/keywords` | GET | Get issue keywords |
| `/wp-json/votecraft/v1/bill-associations` | GET | Get manual bill associations |
| `/wp-json/votecraft/v1/excluded-bills` | GET | Get excluded bills |

### Parameters for `/openstates`

| Param | Description |
|-------|-------------|
| `endpoint` | "people", "people.geo", "people.congress", or "bills" |
| `jurisdiction` | State abbreviation (e.g., "ma") |
| `lat`, `lng` | Coordinates for geo lookup |
| `q` | Search query for bills |

### Parameters for `/congress`

| Param | Description |
|-------|-------------|
| `endpoint` | "member/bills", "bill/search", "bill", "member" |
| `name` | Congress member name to search |
| `state` | State filter |
| `limit` | Max bills to return (default 20, max 250 per page) |

## Key Files

| File | Purpose |
|------|---------|
| `api/votecraft-data-sync.php` | Main plugin: sync engine, admin dashboard, bill lookup, keyword management |
| `api/openstates-proxy.php` | REST API proxy, caching, local DB queries for frontend |
| `pages/vote/js/vote-app.js` | Frontend application logic |
| `pages/vote/js/civic-api.js` | Frontend API calls |
| `pages/vote/js/issues-data.js` | Issue definitions and keywords |

## Common Queries

### Find a legislator by name
```sql
SELECT * FROM wp_votecraft_legislators
WHERE name LIKE '%Creem%' AND state = 'Massachusetts';
```

### Find bills a legislator sponsors
```sql
SELECT b.*, s.sponsorship_type
FROM wp_votecraft_bills b
JOIN wp_votecraft_sponsorships s ON b.id = s.bill_id
WHERE s.legislator_name LIKE '%Creem%';
```

### Find bills by issue with actual subjects
```sql
SELECT b.identifier, b.title, b.subjects, b.abstract, b.issue_id
FROM wp_votecraft_bills b
WHERE b.state = 'Massachusetts'
AND (b.subjects LIKE '%ranked choice%' OR b.title LIKE '%ranked choice%');
```

### Count bills by state and data richness
```sql
SELECT state,
  COUNT(*) as total,
  SUM(CASE WHEN subjects IS NOT NULL AND subjects != '[]' THEN 1 ELSE 0 END) as with_subjects,
  SUM(CASE WHEN abstract IS NOT NULL AND abstract != '' THEN 1 ELSE 0 END) as with_abstract
FROM wp_votecraft_bills
GROUP BY state ORDER BY total DESC;
```

### Check cache for keyword
```sql
SELECT * FROM wp_votecraft_cache
WHERE endpoint = 'bills'
AND response_data LIKE '%ranked choice%';
```

## Schema Migration History

| Version | Changes |
|---------|---------|
| 1.0 | Initial schema — legislators, bills, sponsorships, cache, sync_log |
| 2.0 | Added `issue_id`, `subjects`, `abstract` columns to bills table. Migration copies `subject` → `issue_id`, backfills `subjects`/`abstract` from `raw_data` JSON. Changed index from `subject_search` to `issue_search (state, issue_id)`. |

## Troubleshooting

### Bills not showing for a legislator
1. Check if bills exist: `SELECT COUNT(*) FROM wp_votecraft_bills WHERE state = 'StateName'`
2. Check sponsorships: `SELECT * FROM wp_votecraft_sponsorships WHERE legislator_name LIKE '%Name%'`
3. Check `wp_votecraft_cache` for cached API responses
4. Verify `subjects` and `abstract` columns are populated (not empty/null)
5. May need to run a sync after rate limit resets

### Irrelevant bills appearing under wrong issue
- Check `subjects` column — should contain actual API topics, not search keywords
- Check `issue_id` column — should NOT be used for content matching (exact match only)
- Word boundary regex should filter partial matches (e.g., "debt" won't match "indebted" if boundaries are enforced)
- Run a fresh sync to populate `subjects`/`abstract` from API data

### Congress bills missing data
- `subjects` should contain `legislativeSubjects` + `policyArea` (fetched from `/bill/.../subjects` endpoint)
- `abstract` should contain summary text (fetched from `/bill/.../summaries` endpoint)
- If empty, the extra API calls may have failed — check rate limits
- `latest_action_date` should be populated from `latestAction.actionDate` in bill data

### Wrong legislator returned in admin
- The `id` field is VARCHAR, not INT
- Use `%s` in `$wpdb->prepare()`, not `%d`
- Don't use `intval()` on legislator IDs

### Rate limit hit
- OpenStates: Wait until next day (daily limit)
- Congress.gov: Wait 1 hour (5,000/hour limit)
- Check options table for rate limit timestamps
