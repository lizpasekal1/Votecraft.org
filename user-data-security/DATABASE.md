# VoteCraft Database Architecture

This document describes the database setup and data flow for the VoteCraft application.

## Overview

VoteCraft uses a WordPress database with custom tables to store:
- **Legislators** (state and federal)
- **Bills** (state and federal legislation)
- **Sponsorships** (links between legislators and bills)
- **Cache** (stored API responses for fast retrieval)

## Database Tables

### 1. `wp_votecraft_legislators`

Stores all legislator information (state legislators and Congress members).

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(100) | Primary key - OpenStates person ID (e.g., `ocd-person/12345-...`) |
| `name` | VARCHAR(255) | Full name |
| `party` | VARCHAR(50) | Political party |
| `state` | VARCHAR(50) | State name (e.g., "Massachusetts") |
| `chamber` | VARCHAR(20) | "upper" (Senate) or "lower" (House) |
| `district` | VARCHAR(50) | District number/name |
| `photo_url` | VARCHAR(500) | URL to photo |
| `email` | VARCHAR(255) | Contact email |
| `current_role` | TEXT | JSON of current role details |
| `level` | VARCHAR(20) | "state", "congress", or "executive" |
| `raw_data` | LONGTEXT | Full JSON from API response |
| `updated_at` | DATETIME | Last sync timestamp |

**Key Notes:**
- The `id` field is a VARCHAR string (OpenStates ID format), NOT an integer
- Use `%s` in SQL queries, not `%d` when searching by ID
- `level = 'congress'` indicates federal legislators
- `level = 'state'` indicates state legislators

### 2. `wp_votecraft_bills`

Stores bill/legislation information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(100) | Primary key - OpenStates bill ID |
| `identifier` | VARCHAR(50) | Bill number (e.g., "H 4034", "S 2911") |
| `title` | TEXT | Bill title/description |
| `state` | VARCHAR(50) | State name or "Federal" |
| `session` | VARCHAR(50) | Legislative session |
| `chamber` | VARCHAR(20) | Originating chamber |
| `classification` | VARCHAR(100) | Bill type |
| `subject` | TEXT | Subject/topic areas |
| `latest_action_date` | DATE | Date of most recent action |
| `latest_action_description` | TEXT | Description of latest action |
| `openstates_url` | VARCHAR(500) | Link to OpenStates page |
| `raw_data` | LONGTEXT | Full JSON from API |
| `updated_at` | DATETIME | Last sync timestamp |

### 3. `wp_votecraft_sponsorships`

Links legislators to bills they sponsor/cosponsor.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Auto-increment primary key |
| `bill_id` | VARCHAR(100) | Foreign key to bills table |
| `legislator_id` | VARCHAR(100) | Foreign key to legislators table (OpenStates ID) |
| `legislator_name` | VARCHAR(255) | Legislator name (for easier searching) |
| `sponsorship_type` | VARCHAR(50) | "primary" or "cosponsor" |
| `classification` | VARCHAR(50) | Additional classification |

### 4. `wp_votecraft_cache`

Stores cached API responses for fast retrieval.

| Column | Type | Description |
|--------|------|-------------|
| `cache_key` | VARCHAR(64) | MD5 hash of endpoint + params |
| `endpoint` | VARCHAR(20) | API endpoint ("bills", "people", "congress") |
| `response_data` | LONGTEXT | Full JSON response |
| `created_at` | INT | Unix timestamp when cached |

**Cache TTL (Time To Live):**
- People: 24 hours
- People by geo: 12 hours
- Bills: 4 hours
- Max age before deletion: 7 days

## Data Sources

### OpenStates API (State Legislators & Bills)
- **Base URL:** `https://v3.openstates.org`
- **Endpoints used:**
  - `/people` - State legislators
  - `/people.geo` - Legislators by lat/lng
  - `/bills` - State legislation
- **API Key:** Stored in `VOTECRAFT_OPENSTATES_API_KEY` constant
- **Rate Limit:** Daily limit tracked in `votecraft_openstates_rate_limit_date` option

### Congress.gov API (Federal Legislators & Bills)
- **Base URL:** `https://api.congress.gov/v3`
- **Endpoints used:**
  - `/member` - Congress members
  - `/member/{bioguideId}/sponsored-legislation` - Bills they sponsor
  - `/member/{bioguideId}/cosponsored-legislation` - Bills they cosponsor
- **API Key:** Stored in plugin code
- **Rate Limit:** 500 calls/hour, tracked in `votecraft_congress_rate_limit_time` option

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
Proxy returns cached/live bills matching keywords
        ↓
Frontend filters bills to show ones this legislator sponsors
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
  2. Falls back to wp_votecraft_cache for cached API responses
  3. NO external API calls (removed to prevent rate limiting)
        ↓
Returns bills grouped by issue for review/exclusion
```

### Data Sync (Background/Manual)

```
Scheduled every 4 hours OR manual trigger
        ↓
For each state in priority list:
  1. Fetch legislators from OpenStates API
  2. Store in wp_votecraft_legislators
  3. Fetch bills by issue keywords
  4. Store in wp_votecraft_bills
  5. Store sponsorships in wp_votecraft_sponsorships
        ↓
For Congress (monthly):
  1. Fetch all senators
  2. Fetch all representatives
  3. Store in wp_votecraft_legislators with level='congress'
```

## Issue Keywords

Bills are matched to issues using keyword searches. Keywords are defined in:
- **Frontend:** `pages/vote/js/issues-data.js` → `ISSUES_CATALOG[].billKeywords`
- **Backend:** `api/votecraft-data-sync.php` → Multiple keyword arrays

### Current Issues & Sample Keywords

| Issue ID | Issue Name | Sample Keywords |
|----------|------------|-----------------|
| `rcv` | Ranked Choice Voting | ranked choice, instant runoff, preferential voting, rcv |
| `debt-profiteering` | Public Debt Profiteering | student debt, predatory lending, payday loan |
| `citizens-united` | Ending Citizens United | campaign finance, dark money, super pac |
| `healthcare` | Universal Basic Healthcare | medicare for all, public option, medicaid expansion |
| `scotus` | Supreme Court Reform | supreme court, judicial term limits, court expansion |
| `news-paywalls` | News Paywall Reform | local journalism, news deserts, journalism funding |

**Keyword Matching:**
- Uses word boundary matching (`\b`) to prevent false positives
- "dark money" won't match "dark-sky visibility"
- Case-insensitive matching

## WordPress Options

| Option Name | Purpose |
|-------------|---------|
| `votecraft_openstates_rate_limit_date` | Date when daily rate limit was hit |
| `votecraft_congress_rate_limit_time` | Timestamp when hourly rate limit was hit |
| `votecraft_scheduled_sync_enabled` | Whether auto-sync is enabled |
| `votecraft_congress_sync_progress` | Progress tracker for Congress sync |
| `votecraft_excluded_bills` | Manually excluded bill-legislator associations |
| `votecraft_manual_bill_associations` | Manually added bill-legislator associations |
| `votecraft_issue_keywords` | Custom keywords (overrides defaults) |

## REST API Endpoints

### Public Endpoints (Frontend)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/wp-json/votecraft/v1/openstates` | GET | Proxy for OpenStates API |
| `/wp-json/votecraft/v1/congress` | GET | Proxy for Congress.gov API |
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

## Key Files

| File | Purpose |
|------|---------|
| `api/votecraft-data-sync.php` | Main plugin: sync, admin dashboard, bill lookup |
| `api/openstates-proxy.php` | REST API proxy, caching, local DB queries |
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

### Count bills by state
```sql
SELECT state, COUNT(*) as bill_count
FROM wp_votecraft_bills
GROUP BY state ORDER BY bill_count DESC;
```

### Check cache for keyword
```sql
SELECT * FROM wp_votecraft_cache
WHERE endpoint = 'bills'
AND response_data LIKE '%ranked choice%';
```

## Troubleshooting

### Bills not showing for a legislator
1. Check if bills exist in `wp_votecraft_bills` for their state
2. Check if sponsorships exist in `wp_votecraft_sponsorships`
3. Check `wp_votecraft_cache` for cached API responses
4. May need to run a sync after rate limit resets

### Wrong legislator returned in admin
- The `id` field is VARCHAR, not INT
- Use `%s` in `$wpdb->prepare()`, not `%d`
- Don't use `intval()` on legislator IDs

### Rate limit hit
- OpenStates: Wait until next day
- Congress.gov: Wait 1 hour
- Check options table for rate limit timestamps

---

## Known Issues & Current Status

### Issue 1: Bills Missing for State Legislators (e.g., Cynthia Creem)
**Status:** Pending data sync
**Problem:** Creem's RCV bills (H 4034, S 2953, H 4262, H 4916, S 2911) show on frontend but not in admin Bill Associations page.
**Root Cause:**
- Frontend uses cache table (has data from past API calls)
- Admin was only querying sync tables (bills/sponsorships) which weren't populated for Massachusetts
**Fix Applied:** Updated admin to also search cache table as fallback
**Next Step:** Run Massachusetts sync when rate limit resets (tomorrow)

### Issue 2: False Positive Keyword Matches
**Status:** Fixed (2024-02-07)
**Problem:** Bills with unrelated content were matching issue keywords:
- "dark-sky visibility" matched "dark money" keyword
- "court" in unrelated bills matched "supreme court"
**Fix:** Added word boundary regex matching (`\b`) to prevent partial word matches

### Issue 3: Wrong Legislator Returned in Admin Search
**Status:** Fixed (2024-02-07)
**Problem:** Searching "Cynthia Creem" returned "Leon Lillie" instead
**Root Cause:** Code used `intval()` on VARCHAR IDs, converting "ocd-person/..." to 0
**Fix:** Changed from `%d` to `%s` in SQL queries, removed `intval()`

### Issue 4: Inconsistent Data Between Frontend and Admin
**Status:** Fixed (2024-02-07)
**Problem:** Frontend showed different bills than admin for same legislator
**Root Cause:**
- Frontend: Uses proxy → checks local DB → cache → live API
- Admin: Only checked sync tables (different data source)
**Fix:** Admin now uses same data sources as frontend (sync tables + cache fallback)

### Issue 5: API Rate Limits
**Status:** Ongoing
**Problem:** OpenStates has daily rate limit, Congress.gov has hourly limit
**Mitigation:**
- Rate limit tracking in WordPress options
- Scheduled sync runs during off-peak hours
- Frontend uses cache to avoid repeated API calls
- Admin no longer makes external API calls

### Pending Work

1. **Massachusetts Bill Sync** - Need to run sync after rate limit resets to populate:
   - RCV bills for Cynthia Creem
   - Other state legislator bills

2. **Keywords Consistency** - Ensure frontend and backend use identical keyword lists

3. **Data Freshness** - Consider increasing sync frequency for high-priority states
