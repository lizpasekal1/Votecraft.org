# VoteCraft User Profiles & Social Features

## Vision
Duolingo-style lightweight social layer — gamified civic engagement without the bloat of a full social network. No messaging, no groups, no forums. Just profiles, streaks, badges, leaderboards, and a follow-based activity feed.

---

## Plugin Strategy

### Ultimate Member (Free)
Handles the generic account plumbing:
- User registration & login forms
- Avatar uploads
- Account settings (email, password, display name)
- Profile page template (we inject VoteCraft-specific content via shortcode)
- Elementor-compatible, modern UI, lightweight

### Custom Plugin: `votecraft-social`
Handles everything VoteCraft-specific:
- VC Coin balance display
- Streak tracking
- Badge/achievement system
- Leaderboards (weekly leagues)
- One-way follow system
- Activity feed
- Profile shortcodes that pull from VoteCraft DB tables

---

## Feature Breakdown

### 1. Profile Page

**Layout (Duolingo-inspired):**
```
+------------------------------------------+
|  [Avatar]  Username                      |
|  "Civic Engagement Enthusiast"           |
|  Joined Jan 2026 · Following 12          |
|  [Follow] button (if viewing someone else)|
+------------------------------------------+
|  [Streak Flame] 14-day streak            |
|  [VC Coin Icon] 2,450 VC                 |
|  [Bills Icon] 47 bills tracked           |
+------------------------------------------+
|  BADGES           [See All →]            |
|  [🏅][🏅][🏅][🏅][🏅] (first 5-8)       |
+------------------------------------------+
|  TOP ISSUES                              |
|  Healthcare · Environment · Education    |
+------------------------------------------+
|  RECENT ACTIVITY                         |
|  · Tracked 3 Healthcare bills    2h ago  |
|  · Earned "Bill Watcher" badge   1d ago  |
|  · Checked rep alignment         2d ago  |
+------------------------------------------+
```

**Data sources:**
- Avatar, username, bio → Ultimate Member
- VC Coin balance → `vc_user_meta` or existing VC Coin tables
- Streak → `vc_user_streaks` table
- Badges → `vc_user_badges` table
- Top issues → derived from `vc_user_activity` (most-tracked categories)
- Recent activity → `vc_user_activity` table

### 2. Streaks (Daily Engagement)

**How it works:**
- Any qualifying action in a calendar day counts as "active" (visiting Vote page, tracking a bill, checking rep alignment)
- Streak counter increments each consecutive day
- Missing a day resets to 0
- Streak flame icon on profile (like Duolingo's fire icon)
- Streak freeze: spend VC Coin to protect a streak (optional future feature)

**Streak tiers:**
| Days | Title | Visual |
|------|-------|--------|
| 1-6 | Getting Started | Small flame |
| 7-29 | Engaged Citizen | Medium flame |
| 30-89 | Dedicated Voter | Large flame |
| 90-364 | Democracy Champion | Flame with glow |
| 365+ | Civic Legend | Animated flame |

### 3. Badges / Achievements

**Categories:**

**Getting Started:**
- First Login — Created an account
- Found My Rep — Looked up a representative for the first time
- Issue Explorer — Viewed 5 different issues
- First Track — Tracked your first bill

**Engagement:**
- Bill Watcher — Tracked 10 bills
- Policy Nerd — Tracked 50 bills
- Legislative Junkie — Tracked 100 bills
- Alignment Check — Checked rep alignment 10 times
- Multi-Issue — Tracked bills across 5+ issue categories

**Streaks:**
- Week One — 7-day streak
- Month Strong — 30-day streak
- Quarter Champion — 90-day streak
- Year of Democracy — 365-day streak

**Social:**
- First Follow — Followed another user
- Community Builder — 10 followers
- Civic Influencer — 50 followers

**VC Coin:**
- Coin Collector — Earned 100 VC
- Civic Investor — Earned 1,000 VC
- Democracy Backer — Donated VC Coin

**Badge display:** Grid of circular icons, greyed out if not yet earned (like Duolingo). Tapping shows name + description + date earned.

### 4. Leaderboards (Weekly Leagues)

**Duolingo league model:**
- Users placed in leagues of ~30 people
- Ranked by VC Coin earned that week (or "civic points" — a composite score)
- Top 10 get promoted to next tier, bottom 5 get demoted
- New league cycle every Monday

**League tiers (bottom to top):**
1. Bronze League
2. Silver League
3. Gold League
4. Sapphire League
5. Emerald League
6. Diamond League

**Scoring (weekly civic points):**
| Action | Points |
|--------|--------|
| Daily login / active visit | 5 |
| Track a bill | 10 |
| Check rep alignment | 10 |
| Share an issue (social share) | 15 |
| Earn a badge | 25 |
| Maintain streak (per day) | 5 |

**Leaderboard UI:** List showing rank, avatar, username, points. Current user highlighted. Promotion/demotion zone colored green/red.

### 5. Follow System (One-Way)

- Users can follow other users (like Twitter/Duolingo, not mutual "friends")
- Following someone shows their activity in your feed
- Profile shows follower/following counts
- No notifications for now (keep it simple)
- Follow button on profile pages and leaderboard entries

### 6. Activity Feed

**Two views:**
- **Your feed** — Activity from people you follow (profile page or dedicated feed page)
- **Your activity** — Your own activity log (shown on your profile)

**Activity types logged:**
- Tracked a bill (with issue category)
- Checked rep alignment
- Earned a badge
- Reached a streak milestone
- Promoted in league
- Followed someone

**Feed item format:**
```
[Avatar] Username · action description · time ago
```

---

## Database Schema

### New Tables

```sql
-- User activity log (drives feed, badges, streaks, scoring)
CREATE TABLE {prefix}vc_user_activity (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    action_type VARCHAR(50) NOT NULL,    -- 'track_bill', 'check_alignment', 'earn_badge', etc.
    action_meta TEXT,                     -- JSON: { bill_id, issue, badge_id, etc. }
    points INT DEFAULT 0,                -- civic points earned for this action
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_date (user_id, created_at),
    INDEX idx_action (action_type, created_at)
);

-- Badges earned by users
CREATE TABLE {prefix}vc_user_badges (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    badge_slug VARCHAR(50) NOT NULL,      -- 'first_login', 'bill_watcher_10', etc.
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_badge (user_id, badge_slug),
    INDEX idx_user (user_id)
);

-- Streak tracking
CREATE TABLE {prefix}vc_user_streaks (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_active_date DATE,               -- last calendar day with activity
    streak_freezes INT DEFAULT 0,        -- remaining freezes (future feature)
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Follow relationships (one-directional)
CREATE TABLE {prefix}vc_user_follows (
    follower_id BIGINT UNSIGNED NOT NULL,
    followed_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, followed_id),
    INDEX idx_followed (followed_id)
);

-- Weekly league assignments
CREATE TABLE {prefix}vc_user_leagues (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    league_tier TINYINT DEFAULT 1,        -- 1=Bronze ... 6=Diamond
    league_group INT UNSIGNED,            -- group of ~30 users
    weekly_points INT DEFAULT 0,
    week_start DATE,                      -- Monday of current week
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_group_points (league_group, weekly_points DESC)
);
```

### Badge Definitions (PHP config, not DB)

```php
$vc_badges = array(
    'first_login'       => array( 'name' => 'First Login',       'desc' => 'Created an account',              'icon' => 'star' ),
    'found_rep'         => array( 'name' => 'Found My Rep',      'desc' => 'Looked up a representative',      'icon' => 'search' ),
    'issue_explorer'    => array( 'name' => 'Issue Explorer',    'desc' => 'Viewed 5 different issues',        'icon' => 'compass' ),
    'first_track'       => array( 'name' => 'First Track',       'desc' => 'Tracked your first bill',          'icon' => 'bookmark' ),
    'bill_watcher'      => array( 'name' => 'Bill Watcher',      'desc' => 'Tracked 10 bills',                 'icon' => 'eye' ),
    'policy_nerd'       => array( 'name' => 'Policy Nerd',       'desc' => 'Tracked 50 bills',                 'icon' => 'book' ),
    'streak_7'          => array( 'name' => 'Week One',          'desc' => '7-day streak',                     'icon' => 'flame' ),
    'streak_30'         => array( 'name' => 'Month Strong',      'desc' => '30-day streak',                    'icon' => 'flame' ),
    'first_follow'      => array( 'name' => 'First Follow',      'desc' => 'Followed another user',            'icon' => 'people' ),
    'community_builder' => array( 'name' => 'Community Builder', 'desc' => '10 followers',                     'icon' => 'group' ),
    'coin_100'          => array( 'name' => 'Coin Collector',    'desc' => 'Earned 100 VC',                    'icon' => 'coin' ),
    'coin_1000'         => array( 'name' => 'Civic Investor',    'desc' => 'Earned 1,000 VC',                  'icon' => 'coin' ),
);
```

---

## Implementation Phases

### Phase 1: Foundation
- Install & configure Ultimate Member (registration, login, basic profiles)
- Create `votecraft-social` plugin with table creation on activation
- Build activity logging API (record user actions from Vote page)
- Implement streak tracking (cron job to check/reset daily)
- Profile shortcode `[votecraft_profile]` with VC Coin + streak display

### Phase 2: Badges & Gamification
- Badge definition registry in PHP
- Badge award engine (checks thresholds after each activity log)
- Badge grid UI on profile page (earned vs locked)
- Badge notification (toast/popup when earned)
- Integrate badge earning with VC Coin rewards

### Phase 3: Social Layer
- Follow system (follow/unfollow buttons, follower counts)
- Activity feed on profile page
- Feed page showing followed users' activity
- Leaderboard page with weekly leagues
- League assignment cron job (runs Monday)

### Phase 4: Polish
- Streak freeze feature (spend VC Coin)
- League promotion/demotion animations
- Profile customization (banner image, bio, display preferences)
- Mobile-optimized profile and leaderboard layouts
- Share achievements to social media

---

## Integration Points

- **Vote page (`vote-app.js`)**: Log activity when user selects issues, views bills, checks alignment
- **VC Coin system**: Award coins for actions, display balance on profile
- **Sidebar nav**: Show streak flame icon, notification dot for new badges
- **WordPress hooks**: `wp_login` → log activity, check streak; `init` → load social plugin

---

## Open Questions
- Should league placement be opt-in or automatic?
- What's the VC Coin reward for each badge?
- Should profiles be public by default or private?
- Do we want a "civic score" composite metric visible on profiles?
- Should the activity feed show on the sidebar or only on profile/feed pages?
