<?php
/**
 * Plugin Name: VoteCraft Data Sync
 * Description: Syncs OpenStates data to local WordPress database for faster queries and no rate limits.
 * Version: 1.0
 * Author: VoteCraft
 */

if (!defined('ABSPATH')) {
    exit;
}

// Database version for migrations
define('VOTECRAFT_SYNC_DB_VERSION', '2.0');

// OpenStates API key
define('VOTECRAFT_OPENSTATES_API_KEY', '8daa7ff0-13f1-4d79-b93d-691be91b3c10');

// Scheduled sync settings
define('VOTECRAFT_BATCH_API_CALLS', 80); // Max API calls per batch (500/day ÷ 6 runs = ~83)

// =============================================================================
// RATE LIMIT HANDLING
// =============================================================================

/**
 * Check if OpenStates API daily rate limit has been hit today
 */
function votecraft_is_rate_limited() {
    $rate_limit_date = get_option('votecraft_openstates_rate_limit_date', '');
    return $rate_limit_date === date('Y-m-d');
}

/**
 * Mark that we've hit the OpenStates daily rate limit
 */
function votecraft_set_rate_limited() {
    update_option('votecraft_openstates_rate_limit_date', date('Y-m-d'));
}

/**
 * Parse rate limit error response to determine if it's daily or per-minute
 * Returns: 'daily', 'minute', or false if not a rate limit error
 */
function votecraft_parse_rate_limit_error($response_body) {
    if (strpos($response_body, 'exceeded limit of') === false) {
        return false;
    }
    if (strpos($response_body, '/day') !== false) {
        return 'daily';
    }
    if (strpos($response_body, '/min') !== false) {
        return 'minute';
    }
    return 'unknown';
}

/**
 * Check if Congress.gov API hourly rate limit has been hit
 * Congress.gov has a 5,000 calls/hour limit
 */
function votecraft_is_congress_rate_limited() {
    $rate_limit_time = get_option('votecraft_congress_rate_limit_time', 0);
    // Rate limit expires after 1 hour
    return (time() - $rate_limit_time) < 3600;
}

/**
 * Mark that we've hit the Congress.gov rate limit
 */
function votecraft_set_congress_rate_limited() {
    update_option('votecraft_congress_rate_limit_time', time());
}

/**
 * Parse Congress.gov rate limit error
 * Congress.gov returns 429 with various messages
 */
function votecraft_parse_congress_rate_limit($response_body, $status_code) {
    if ($status_code === 429) {
        return true;
    }
    // Congress.gov may also return rate limit info in other ways
    if (strpos(strtolower($response_body), 'rate limit') !== false) {
        return true;
    }
    if (strpos(strtolower($response_body), 'too many requests') !== false) {
        return true;
    }
    return false;
}

/**
 * Track Congress.gov API calls with hourly reset
 */
function votecraft_track_congress_api_call($count = 1) {
    $usage = get_option('votecraft_congress_api_usage', array('calls' => 0, 'hour' => ''));
    $current_hour = gmdate('Y-m-d H');
    if ($usage['hour'] !== $current_hour) {
        $usage = array('calls' => 0, 'hour' => $current_hour);
    }
    $usage['calls'] += $count;
    update_option('votecraft_congress_api_usage', $usage);
    return $usage['calls'];
}

function votecraft_get_congress_api_calls() {
    $usage = get_option('votecraft_congress_api_usage', array('calls' => 0, 'hour' => ''));
    if ($usage['hour'] !== gmdate('Y-m-d H')) {
        return 0;
    }
    return $usage['calls'];
}

// =============================================================================
// SCHEDULED SYNC (WP-CRON)
// =============================================================================

// Register custom cron interval (every 4 hours = 6 times per day)
add_filter('cron_schedules', 'votecraft_add_cron_interval');
function votecraft_add_cron_interval($schedules) {
    $schedules['every_four_hours'] = array(
        'interval' => 4 * 60 * 60, // 4 hours in seconds
        'display'  => 'Every 4 Hours'
    );
    $schedules['monthly'] = array(
        'interval' => 30 * 24 * 60 * 60, // 30 days in seconds
        'display'  => 'Once Monthly'
    );
    return $schedules;
}

// Schedule the cron job on plugin activation
register_activation_hook(__FILE__, 'votecraft_schedule_sync');
function votecraft_schedule_sync() {
    if (!wp_next_scheduled('votecraft_scheduled_sync')) {
        wp_schedule_event(time(), 'every_four_hours', 'votecraft_scheduled_sync');
    }
}

// Unschedule on deactivation
register_deactivation_hook(__FILE__, 'votecraft_unschedule_sync');
function votecraft_unschedule_sync() {
    wp_clear_scheduled_hook('votecraft_scheduled_sync');
    wp_clear_scheduled_hook('votecraft_congress_monthly_sync');
}

// Hook the actual sync function
add_action('votecraft_scheduled_sync', 'votecraft_run_scheduled_batch');

// Hook the Congress daily sync (runs daily during sync period, then monthly)
add_action('votecraft_congress_daily_sync', 'votecraft_run_congress_daily_sync');

/**
 * Run the Congress.gov sync in daily batches
 * Runs daily until complete, then waits ~30 days before starting again
 * Respects the 500 API calls/day limit
 */
function votecraft_run_congress_daily_sync() {
    if (!get_option('votecraft_congress_scheduled_sync_enabled', false)) {
        return;
    }

    // Check if we hit the rate limit - if so, skip until next hour
    if (votecraft_is_congress_rate_limited()) {
        // Schedule retry in 1 hour instead of tomorrow
        wp_clear_scheduled_hook('votecraft_congress_daily_sync');
        wp_schedule_single_event(time() + 3600, 'votecraft_congress_daily_sync');
        return;
    }

    // Get current progress
    $progress = get_option('votecraft_congress_sync_progress', array(
        'chamber' => 'senate',
        'offset' => 0,
        'total_synced' => 0,
        'completed' => false,
        'last_run' => null,
        'sync_started' => null
    ));

    // If sync is complete, check if we should start a new cycle
    if ($progress['completed']) {
        $last_complete = isset($progress['last_complete']) ? strtotime($progress['last_complete']) : 0;
        $days_since_complete = (time() - $last_complete) / DAY_IN_SECONDS;

        // Wait 30 days before starting a new sync cycle
        if ($days_since_complete < 30) {
            // Schedule next check for tomorrow
            wp_clear_scheduled_hook('votecraft_congress_daily_sync');
            wp_schedule_single_event(strtotime('tomorrow 6:00 AM'), 'votecraft_congress_daily_sync');
            return;
        }

        // Start a new sync cycle
        votecraft_reset_congress_sync_progress();
        $progress = get_option('votecraft_congress_sync_progress');
        $progress['sync_started'] = gmdate('Y-m-d H:i:s');
        update_option('votecraft_congress_sync_progress', $progress);
    }

    // Run batches for today (limit to ~100 API calls to stay well under 500/day limit)
    // Each batch of 50 members uses ~2-3 API calls (member list + pagination)
    $batches_today = 3; // ~150 members, ~6-9 API calls
    for ($i = 0; $i < $batches_today; $i++) {
        $result = votecraft_sync_congress_members(50);
        if (isset($result['progress']['completed']) && $result['progress']['completed']) {
            // Mark completion time
            $progress = get_option('votecraft_congress_sync_progress');
            $progress['last_complete'] = gmdate('Y-m-d H:i:s');
            update_option('votecraft_congress_sync_progress', $progress);
            break;
        }
        usleep(500000); // Small delay between batches
    }

    // Schedule next run for tomorrow (continues daily until complete)
    wp_clear_scheduled_hook('votecraft_congress_daily_sync');
    wp_schedule_single_event(strtotime('tomorrow 6:00 AM'), 'votecraft_congress_daily_sync');
}

/**
 * Run a scheduled batch sync
 * Syncs legislators and bills in rotation, tracking progress
 */
function votecraft_run_scheduled_batch() {
    // Check if scheduled sync is enabled
    if (!get_option('votecraft_scheduled_sync_enabled', false)) {
        return;
    }

    // Check if we already hit the daily rate limit today
    if (votecraft_is_rate_limited()) {
        return; // Skip - will try again tomorrow
    }

    global $wpdb;
    $log_table = $wpdb->prefix . 'votecraft_sync_log';

    // Get progress
    $progress = get_option('votecraft_scheduled_progress', array(
        'state_index' => 0,
        'phase' => 'legislators', // 'legislators' or 'bills'
        'api_calls_today' => 0,
        'last_reset_date' => date('Y-m-d'),
        'completed_states' => array()
    ));

    // Reset daily counter if new day
    if ($progress['last_reset_date'] !== date('Y-m-d')) {
        $progress['api_calls_today'] = 0;
        $progress['last_reset_date'] = date('Y-m-d');
    }

    // Check if we've hit daily limit
    if ($progress['api_calls_today'] >= 200) { // Daily limit (v3 API = 250/day, leave 50 for manual syncs)
        return;
    }

    // All 50 states (Massachusetts first for priority testing)
    $states = array(
        'Massachusetts',
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
        'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
        'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
        'Maine', 'Maryland', 'Michigan', 'Minnesota', 'Mississippi',
        'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
        'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
        'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
        'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
        'West Virginia', 'Wisconsin', 'Wyoming'
    );

    $batch_calls = 0;
    $max_calls = min(VOTECRAFT_BATCH_API_CALLS, 200 - $progress['api_calls_today']);

    // Log start
    $wpdb->insert($log_table, array(
        'sync_type' => 'scheduled_batch',
        'state' => 'BATCH',
        'status' => 'running',
        'started_at' => gmdate('Y-m-d H:i:s')
    ));
    $log_id = $wpdb->insert_id;

    $synced_count = 0;
    $states_synced = array();

    try {
        $rate_limited = false;
        while ($progress['state_index'] < count($states) && !$rate_limited) {
            $state = $states[$progress['state_index']];

            // Check call limit only at the START of a new state, not mid-state
            if ($progress['phase'] === 'legislators' && $batch_calls >= $max_calls) {
                break; // Don't start a new state if we're over the limit
            }

            if ($progress['phase'] === 'legislators') {
                // Sync legislators for this state
                $result = votecraft_sync_legislators_batch($state, 999); // No call limit — finish the state
                $batch_calls += $result['api_calls'];
                $synced_count += $result['records'];

                // Check if rate limited
                if (!empty($result['rate_limited'])) {
                    $rate_limited = true;
                    break;
                }

                if ($result['complete']) {
                    $progress['phase'] = 'bills';
                    $states_synced[] = $state . ' (legislators)';
                }
            }

            if ($progress['phase'] === 'bills' && !$rate_limited) {
                // Always sync bills after legislators — finish the state
                $result = votecraft_sync_bills_batch($state, 999); // No call limit — finish the state
                $batch_calls += $result['api_calls'];
                $synced_count += $result['records'];

                // Check if rate limited
                if (!empty($result['rate_limited'])) {
                    $rate_limited = true;
                    break;
                }

                if ($result['complete']) {
                    $progress['phase'] = 'legislators';
                    $progress['state_index']++;
                    $progress['completed_states'][] = $state;
                    $states_synced[] = $state . ' (legislators + bills)';
                }
            }
        }

        // If rate limited, update the log message
        if ($rate_limited) {
            throw new Exception('⚠️ DAILY RATE LIMIT HIT - OpenStates limit reached. Will resume tomorrow.');
        }

        // Check if all states complete
        if ($progress['state_index'] >= count($states)) {
            $progress['state_index'] = 0;
            $progress['completed_states'] = array();
            // Full cycle complete!
        }

        $progress['api_calls_today'] += $batch_calls;
        update_option('votecraft_scheduled_progress', $progress);

        // Log success
        $wpdb->update($log_table, array(
            'status' => 'success',
            'records_synced' => $synced_count,
            'error_message' => 'States: ' . implode(', ', $states_synced) . ' | API calls: ' . $batch_calls,
            'completed_at' => gmdate('Y-m-d H:i:s')
        ), array('id' => $log_id));

    } catch (Exception $e) {
        update_option('votecraft_scheduled_progress', $progress);

        $wpdb->update($log_table, array(
            'status' => 'error',
            'error_message' => $e->getMessage(),
            'completed_at' => gmdate('Y-m-d H:i:s')
        ), array('id' => $log_id));
    }
}

/**
 * Sync legislators for a state with API call limit
 */
function votecraft_sync_legislators_batch($state, $max_calls) {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_legislators';

    // Check if already rate limited
    if (votecraft_is_rate_limited()) {
        return array('api_calls' => 0, 'records' => 0, 'complete' => false, 'rate_limited' => true);
    }

    $jurisdiction = votecraft_state_to_jurisdiction($state);
    $api_calls = 0;
    $count = 0;

    $page = 1;
    $per_page = 50;

    while ($api_calls < $max_calls) {
        $url = 'https://v3.openstates.org/people?' . http_build_query(array(
            'jurisdiction' => $jurisdiction,
            'per_page' => $per_page,
            'page' => $page,
            'apikey' => VOTECRAFT_OPENSTATES_API_KEY
        ));

        $response = wp_remote_get($url, array('timeout' => 30));
        $api_calls++;

        if (is_wp_error($response)) break;

        $status = wp_remote_retrieve_response_code($response);
        $raw_body = wp_remote_retrieve_body($response);

        if ($status === 429) {
            // Check if daily limit
            $limit_type = votecraft_parse_rate_limit_error($raw_body);
            if ($limit_type === 'daily') {
                votecraft_set_rate_limited();
                return array('api_calls' => $api_calls, 'records' => $count, 'complete' => false, 'rate_limited' => true);
            }
            // Per-minute limit - wait and stop batch (will resume on next batch)
            return array('api_calls' => $api_calls, 'records' => $count, 'complete' => false, 'rate_limited' => false);
        }
        if ($status >= 400) break;

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!isset($body['results'])) break;

        foreach ($body['results'] as $leg) {
            $current_role = isset($leg['current_role']) ? $leg['current_role'] : null;

            $wpdb->replace($table, array(
                'id' => $leg['id'],
                'name' => $leg['name'],
                'party' => isset($leg['party']) ? $leg['party'] : null,
                'state' => $state,
                'chamber' => $current_role ? ($current_role['org_classification'] ?? null) : null,
                'district' => $current_role ? ($current_role['district'] ?? null) : null,
                'photo_url' => isset($leg['image']) ? $leg['image'] : null,
                'email' => isset($leg['email']) ? $leg['email'] : null,
                'current_role' => $current_role ? json_encode($current_role) : null,
                'jurisdiction_id' => isset($leg['jurisdiction']['id']) ? $leg['jurisdiction']['id'] : null,
                'level' => 'state',
                'raw_data' => json_encode($leg),
                'updated_at' => gmdate('Y-m-d H:i:s')
            ));
            $count++;
        }

        $has_more = count($body['results']) === $per_page;
        if (!$has_more) {
            return array('api_calls' => $api_calls, 'records' => $count, 'complete' => true);
        }

        $page++;
        usleep(1500000); // Rate limit: 1.5s between requests
    }

    return array('api_calls' => $api_calls, 'records' => $count, 'complete' => false);
}

/**
 * Sync bills for a state with API call limit
 */
function votecraft_sync_bills_batch($state, $max_calls) {
    global $wpdb;
    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';

    // Check if already rate limited
    if (votecraft_is_rate_limited()) {
        return array('api_calls' => 0, 'records' => 0, 'complete' => false, 'rate_limited' => true);
    }

    $jurisdiction = votecraft_state_to_jurisdiction($state);
    $api_calls = 0;
    $count = 0;

    // Keywords from VoteCraft issues
    $keywords = array(
        'ranked choice', 'ranked choice voting', 'instant runoff', 'preferential voting', 'rcv',
        'student debt', 'predatory lending',
        'citizens united', 'campaign finance',
        'medicare', 'healthcare',
        'supreme court', 'judicial ethics',
        'local journalism'
    );

    $five_years_ago = date('Y-m-d', strtotime('-5 years'));

    foreach ($keywords as $keyword) {
        if ($api_calls >= $max_calls) break;

        $url = 'https://v3.openstates.org/bills?' . http_build_query(array(
            'jurisdiction' => $jurisdiction,
            'q' => $keyword,
            'created_since' => $five_years_ago,
            'include' => array('sponsorships', 'abstracts'),
            'per_page' => 20,
            'apikey' => VOTECRAFT_OPENSTATES_API_KEY
        ));

        $response = wp_remote_get($url, array('timeout' => 30));
        $api_calls++;

        if (is_wp_error($response)) continue;

        $status = wp_remote_retrieve_response_code($response);
        $raw_body = wp_remote_retrieve_body($response);

        if ($status === 429) {
            // Check if daily limit
            $limit_type = votecraft_parse_rate_limit_error($raw_body);
            if ($limit_type === 'daily') {
                votecraft_set_rate_limited();
                return array('api_calls' => $api_calls, 'records' => $count, 'complete' => false, 'rate_limited' => true);
            }
            // Per-minute limit - stop batch
            return array('api_calls' => $api_calls, 'records' => $count, 'complete' => false, 'rate_limited' => false);
        }
        if ($status >= 400) continue;

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!isset($body['results'])) continue;

        foreach ($body['results'] as $bill) {
            $bill_id = $bill['id'];
            $latest_action = isset($bill['latest_action']) ? $bill['latest_action'] : array();

            // Extract actual subjects and abstract from API response
            $api_subjects = isset($bill['subject']) && is_array($bill['subject']) ? $bill['subject'] : array();
            $api_abstract = '';
            if (isset($bill['abstracts']) && is_array($bill['abstracts']) && !empty($bill['abstracts'])) {
                $api_abstract = $bill['abstracts'][0]['abstract'] ?? '';
            }

            $wpdb->replace($bills_table, array(
                'id' => $bill_id,
                'identifier' => $bill['identifier'] ?? '',
                'title' => $bill['title'] ?? '',
                'state' => $state,
                'session' => $bill['session'] ?? '',
                'chamber' => $bill['from_organization']['classification'] ?? null,
                'classification' => is_array($bill['classification']) ? implode(',', $bill['classification']) : null,
                'subject' => $keyword,
                'issue_id' => $keyword,
                'subjects' => json_encode($api_subjects),
                'abstract' => $api_abstract,
                'latest_action_date' => $latest_action['date'] ?? null,
                'latest_action_description' => $latest_action['description'] ?? null,
                'openstates_url' => $bill['openstates_url'] ?? null,
                'raw_data' => json_encode($bill),
                'updated_at' => gmdate('Y-m-d H:i:s')
            ));

            // Sync sponsorships
            if (isset($bill['sponsorships'])) {
                foreach ($bill['sponsorships'] as $sponsor) {
                    $wpdb->replace($sponsorships_table, array(
                        'bill_id' => $bill_id,
                        'legislator_id' => $sponsor['person']['id'] ?? null,
                        'legislator_name' => $sponsor['name'] ?? '',
                        'sponsorship_type' => $sponsor['primary'] ? 'primary' : 'cosponsor',
                        'classification' => $sponsor['classification'] ?? null
                    ));
                }
            }
            $count++;
        }

        usleep(1500000); // Rate limit
    }

    return array('api_calls' => $api_calls, 'records' => $count, 'complete' => true);
}

// =============================================================================
// DATABASE SETUP
// =============================================================================

register_activation_hook(__FILE__, 'votecraft_sync_create_tables');
add_action('plugins_loaded', 'votecraft_sync_maybe_create_tables');

function votecraft_sync_maybe_create_tables() {
    $current_version = get_option('votecraft_sync_db_version', '0');
    if ($current_version !== VOTECRAFT_SYNC_DB_VERSION) {
        votecraft_sync_create_tables();

        // v2.0 migration: backfill issue_id, subjects, abstract from raw_data
        if (version_compare($current_version, '2.0', '<')) {
            votecraft_migrate_bill_subjects();
        }
    }
}

/**
 * One-time migration: populate issue_id, subjects, abstract from existing data
 */
function votecraft_migrate_bill_subjects() {
    global $wpdb;
    $bills_table = $wpdb->prefix . 'votecraft_bills';

    // Copy subject -> issue_id for all existing bills
    $wpdb->query("UPDATE $bills_table SET issue_id = subject WHERE issue_id IS NULL AND subject IS NOT NULL");

    // Backfill subjects and abstract from raw_data JSON
    $bills = $wpdb->get_results("SELECT id, state, raw_data FROM $bills_table WHERE subjects IS NULL AND raw_data IS NOT NULL LIMIT 5000");

    foreach ($bills as $bill) {
        $raw = json_decode($bill->raw_data, true);
        if (!$raw) continue;

        $subjects = '[]';
        $abstract = '';

        if ($bill->state === 'Federal') {
            // Congress.gov: extract policyArea
            if (isset($raw['policyArea']['name'])) {
                $subjects = json_encode(array($raw['policyArea']['name']));
            } elseif (isset($raw['policyArea']) && is_string($raw['policyArea'])) {
                $subjects = json_encode(array($raw['policyArea']));
            }
        } else {
            // OpenStates: extract subject array and first abstract
            if (isset($raw['subject']) && is_array($raw['subject'])) {
                $subjects = json_encode($raw['subject']);
            }
            if (isset($raw['abstracts']) && is_array($raw['abstracts']) && !empty($raw['abstracts'])) {
                $abstract = $raw['abstracts'][0]['abstract'] ?? '';
            }
        }

        $wpdb->update($bills_table, array(
            'subjects' => $subjects,
            'abstract' => $abstract
        ), array('id' => $bill->id));
    }
}

function votecraft_sync_create_tables() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();

    // Legislators table
    $legislators_table = $wpdb->prefix . 'votecraft_legislators';
    $sql_legislators = "CREATE TABLE IF NOT EXISTS $legislators_table (
        id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        party VARCHAR(50),
        state VARCHAR(50) NOT NULL,
        chamber VARCHAR(20),
        district VARCHAR(50),
        photo_url VARCHAR(500),
        email VARCHAR(255),
        current_role TEXT,
        jurisdiction_id VARCHAR(100),
        level VARCHAR(20) DEFAULT 'state',
        raw_data LONGTEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY state_chamber (state, chamber),
        KEY jurisdiction (jurisdiction_id)
    ) $charset;";

    // Bills table
    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $sql_bills = "CREATE TABLE IF NOT EXISTS $bills_table (
        id VARCHAR(100) NOT NULL,
        identifier VARCHAR(50) NOT NULL,
        title TEXT NOT NULL,
        state VARCHAR(50) NOT NULL,
        session VARCHAR(50),
        chamber VARCHAR(20),
        classification VARCHAR(100),
        subject TEXT,
        issue_id VARCHAR(50),
        subjects TEXT,
        abstract TEXT,
        latest_action_date DATE,
        latest_action_description TEXT,
        openstates_url VARCHAR(500),
        raw_data LONGTEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY state_session (state, session),
        KEY issue_search (state, issue_id)
    ) $charset;";

    // Bill sponsorships table (links bills to legislators)
    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';
    $sql_sponsorships = "CREATE TABLE IF NOT EXISTS $sponsorships_table (
        id INT AUTO_INCREMENT,
        bill_id VARCHAR(100) NOT NULL,
        legislator_id VARCHAR(100),
        legislator_name VARCHAR(255) NOT NULL,
        sponsorship_type VARCHAR(50) DEFAULT 'sponsor',
        classification VARCHAR(50),
        PRIMARY KEY (id),
        KEY bill_id (bill_id),
        KEY legislator_id (legislator_id),
        UNIQUE KEY unique_sponsorship (bill_id, legislator_name(100), sponsorship_type)
    ) $charset;";

    // Sync log table
    $log_table = $wpdb->prefix . 'votecraft_sync_log';
    $sql_log = "CREATE TABLE IF NOT EXISTS $log_table (
        id INT AUTO_INCREMENT,
        sync_type VARCHAR(50) NOT NULL,
        state VARCHAR(50),
        status VARCHAR(20) NOT NULL,
        records_synced INT DEFAULT 0,
        error_message TEXT,
        started_at DATETIME,
        completed_at DATETIME,
        PRIMARY KEY (id),
        KEY sync_type_status (sync_type, status)
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql_legislators);
    dbDelta($sql_bills);
    dbDelta($sql_sponsorships);
    dbDelta($sql_log);

    update_option('votecraft_sync_db_version', VOTECRAFT_SYNC_DB_VERSION);
}

// =============================================================================
// ADMIN PAGE
// =============================================================================

add_action('admin_menu', 'votecraft_sync_admin_menu');

function votecraft_sync_admin_menu() {
    // Main menu page under Tools
    add_management_page(
        'VoteCraft Data Sync',
        'VoteCraft Sync',
        'manage_options',
        'votecraft-sync',
        'votecraft_sync_admin_page'
    );

    // Add submenu for Bill Associations
    add_submenu_page(
        'tools.php',
        'VoteCraft Bill Associations',
        'VC Bill Associations',
        'manage_options',
        'votecraft-bill-associations',
        'votecraft_bill_associations_admin_page'
    );
}

function votecraft_sync_admin_page() {
    global $wpdb;

    // Clear any stuck background sync
    delete_option('votecraft_pending_bill_sync');
    wp_clear_scheduled_hook('votecraft_background_bill_sync');

    // Handle form submissions
    if (isset($_POST['votecraft_sync_action']) && wp_verify_nonce($_POST['_wpnonce'], 'votecraft_sync')) {
        echo '<div class="notice notice-warning"><p>DEBUG: Action received = ' . esc_html($_POST['votecraft_sync_action']) . '</p></div>';
        $action = sanitize_text_field($_POST['votecraft_sync_action']);
        $state = isset($_POST['state']) ? sanitize_text_field($_POST['state']) : null;

        // Prevent PHP timeout during sync operations
        @set_time_limit(300); // 5 minutes max

        // Track daily API calls (shared between manual and scheduled syncs)
        $progress = get_option('votecraft_scheduled_progress', array(
            'state_index' => 0,
            'phase' => 'legislators',
            'api_calls_today' => 0,
            'last_reset_date' => date('Y-m-d'),
            'completed_states' => array()
        ));
        if ($progress['last_reset_date'] !== date('Y-m-d')) {
            $progress['api_calls_today'] = 0;
            $progress['last_reset_date'] = date('Y-m-d');
        }

        // Show loading message for sync actions
        $sync_actions = array('sync_state', 'sync_legislators', 'sync_bills', 'sync_all_legislators', 'sync_all_issue_bills', 'sync_all_states', 'run_batch_now', 'sync_congress_members', 'sync_congress_issue_bills');
        if (in_array($action, $sync_actions)) {
            echo '<div class="notice notice-info" id="votecraft-sync-loading"><p>Syncing... please wait, this may take a minute.</p></div>';
            if (ob_get_level()) ob_flush();
            flush();
        }

        // OpenStates sync actions
        if ($action === 'sync_state' && $state) {
            // Run legislators first (fast)
            $leg_result = votecraft_sync_legislators($state);
            $leg_success = !empty($leg_result['success']);
            $leg_msg = isset($leg_result['message']) ? $leg_result['message'] : (isset($leg_result['error']) ? $leg_result['error'] : 'Unknown result');
            echo '<div class="notice notice-' . ($leg_success ? 'success' : 'error') . '"><p>Legislators: ' . esc_html($leg_msg) . '</p></div>';
            if (ob_get_level()) ob_flush();
            flush();
            // Run bills (saves each bill immediately — survives timeouts)
            $bill_result = votecraft_sync_bills($state);
            $bill_success = !empty($bill_result['success']);
            $bill_msg = isset($bill_result['message']) ? $bill_result['message'] : (isset($bill_result['error']) ? $bill_result['error'] : 'Unknown result');
            echo '<div class="notice notice-' . ($bill_success ? 'success' : 'error') . '"><p>Bills: ' . esc_html($bill_msg) . '</p></div>';
        } elseif ($action === 'sync_legislators' && $state) {
            $result = votecraft_sync_legislators($state);
            $msg = isset($result['message']) ? $result['message'] : (isset($result['error']) ? $result['error'] : 'Unknown result');
            echo '<div class="notice notice-' . (!empty($result['success']) ? 'success' : 'error') . '"><p>' . esc_html($msg) . '</p></div>';
        } elseif ($action === 'sync_bills' && $state) {
            $result = votecraft_sync_bills($state);
            $msg = isset($result['message']) ? $result['message'] : (isset($result['error']) ? $result['error'] : 'Unknown result');
            echo '<div class="notice notice-' . (!empty($result['success']) ? 'success' : 'error') . '"><p>' . esc_html($msg) . '</p></div>';
        } elseif ($action === 'sync_all_legislators') {
            $result = votecraft_sync_all_legislators();
            $msg = isset($result['message']) ? $result['message'] : 'Unknown result';
            echo '<div class="notice notice-' . (!empty($result['success']) ? 'success' : 'error') . '"><p>' . esc_html($msg) . '</p></div>';
        } elseif ($action === 'sync_all_issue_bills') {
            $result = votecraft_sync_all_issue_bills();
            $msg = isset($result['message']) ? $result['message'] : 'Unknown result';
            echo '<div class="notice notice-' . (!empty($result['success']) ? 'success' : 'error') . '"><p>' . esc_html($msg) . '</p></div>';
        } elseif ($action === 'sync_all_states') {
            $result = votecraft_sync_all_states();
            $msg = isset($result['message']) ? $result['message'] : 'Unknown result';
            echo '<div class="notice notice-' . (!empty($result['success']) ? 'success' : 'error') . '"><p>' . esc_html($msg) . '</p></div>';

        // Scheduled sync controls
        } elseif ($action === 'enable_scheduled_sync') {
            update_option('votecraft_scheduled_sync_enabled', true);
            if (!wp_next_scheduled('votecraft_scheduled_sync')) {
                wp_schedule_event(time(), 'every_four_hours', 'votecraft_scheduled_sync');
            }
            echo '<div class="notice notice-success"><p>Scheduled sync resumed! Will run every 4 hours.</p></div>';
        } elseif ($action === 'disable_scheduled_sync') {
            update_option('votecraft_scheduled_sync_enabled', false);
            echo '<div class="notice notice-success"><p>Scheduled sync paused.</p></div>';
        } elseif ($action === 'reset_scheduled_progress') {
            delete_option('votecraft_scheduled_progress');
            echo '<div class="notice notice-success"><p>Scheduled sync progress has been reset. Will start from Massachusetts.</p></div>';
        } elseif ($action === 'run_batch_now') {
            update_option('votecraft_scheduled_sync_enabled', true);
            votecraft_run_scheduled_batch();
            echo '<div class="notice notice-success"><p>Manual batch sync completed! Check progress below.</p></div>';

        // Congress sync actions
        } elseif ($action === 'sync_congress_members') {
            try {
                $result = votecraft_sync_congress_members();
                $status = !empty($result['success']) ? 'success' : 'error';
                $msg = isset($result['message']) ? $result['message'] : (isset($result['errors']) ? implode('; ', $result['errors']) : 'Unknown result');
                echo '<div class="notice notice-' . $status . '"><p>' . esc_html($msg) . '</p></div>';
            } catch (Exception $e) {
                echo '<div class="notice notice-error"><p>Congress sync error: ' . esc_html($e->getMessage()) . '</p></div>';
            } catch (Error $e) {
                echo '<div class="notice notice-error"><p>Congress sync fatal error: ' . esc_html($e->getMessage()) . ' in ' . esc_html($e->getFile()) . ' line ' . esc_html($e->getLine()) . '</p></div>';
            }
        } elseif ($action === 'sync_congress_issue_bills') {
            try {
                $result = votecraft_sync_congress_issue_bills();
                $status = !empty($result['success']) ? 'success' : 'error';
                $msg = isset($result['message']) ? $result['message'] : 'Unknown result';
                echo '<div class="notice notice-' . $status . '"><p>' . esc_html($msg) . '</p></div>';
            } catch (Exception $e) {
                echo '<div class="notice notice-error"><p>Bills sync error: ' . esc_html($e->getMessage()) . '</p></div>';
            } catch (Error $e) {
                echo '<div class="notice notice-error"><p>Bills sync fatal error: ' . esc_html($e->getMessage()) . ' in ' . esc_html($e->getFile()) . ' line ' . esc_html($e->getLine()) . '</p></div>';
            }
        } elseif ($action === 'clear_congress_cache') {
            $cache_table = $wpdb->prefix . 'votecraft_cache';
            $deleted = $wpdb->query("DELETE FROM $cache_table WHERE endpoint = 'congress' OR cache_key LIKE 'congress_%'");
            echo '<div class="notice notice-success"><p>Cleared ' . intval($deleted) . ' Congress.gov cache entries.</p></div>';
        } elseif ($action === 'clear_openstates_cache') {
            $cache_table = $wpdb->prefix . 'votecraft_cache';
            $deleted = $wpdb->query("DELETE FROM $cache_table WHERE endpoint != 'congress' AND cache_key NOT LIKE 'congress_%'");
            echo '<div class="notice notice-success"><p>Cleared ' . intval($deleted) . ' OpenStates cache entries.</p></div>';
        } elseif ($action === 'refresh_congress_member') {
            $member_name = isset($_POST['congress_member_name']) ? sanitize_text_field($_POST['congress_member_name']) : '';
            if ($member_name) {
                $result = votecraft_refresh_congress_member_cache($member_name);
                $msg = isset($result['message']) ? $result['message'] : 'Unknown result';
                echo '<div class="notice notice-' . (!empty($result['success']) ? 'success' : 'error') . '"><p>' . esc_html($msg) . '</p></div>';
            }
        } elseif ($action === 'reset_congress_progress') {
            $result = votecraft_reset_congress_sync_progress();
            $msg = isset($result['message']) ? $result['message'] : 'Progress reset.';
            echo '<div class="notice notice-success"><p>' . esc_html($msg) . '</p></div>';
        } elseif ($action === 'enable_congress_scheduled_sync') {
            update_option('votecraft_congress_scheduled_sync_enabled', true);
            wp_clear_scheduled_hook('votecraft_congress_daily_sync');
            wp_clear_scheduled_hook('votecraft_congress_monthly_sync');
            $tomorrow_6am = strtotime('tomorrow 6:00 AM');
            wp_schedule_single_event($tomorrow_6am, 'votecraft_congress_daily_sync');
            echo '<div class="notice notice-success"><p>Congress.gov sync resumed! Next run scheduled for ' . wp_date('M j, Y g:i A', $tomorrow_6am) . '.</p></div>';
        } elseif ($action === 'disable_congress_scheduled_sync') {
            update_option('votecraft_congress_scheduled_sync_enabled', false);
            wp_clear_scheduled_hook('votecraft_congress_daily_sync');
            wp_clear_scheduled_hook('votecraft_congress_monthly_sync');
            echo '<div class="notice notice-success"><p>Congress.gov sync paused.</p></div>';

        // Rate limit and keyword controls
        } elseif ($action === 'clear_rate_limit') {
            delete_option('votecraft_openstates_rate_limit_date');
            echo '<div class="notice notice-success"><p>Rate limit cleared. You can sync again.</p></div>';
        } elseif ($action === 'reset_daily_counter') {
            $progress['api_calls_today'] = 0;
            update_option('votecraft_scheduled_progress', $progress);
            echo '<div class="notice notice-success"><p>Daily API call counter reset to 0.</p></div>';
        } elseif ($action === 'save_keywords') {
            $keywords = array();
            $defaults = votecraft_get_default_keywords();
            foreach ($defaults as $issue_id => $issue_data) {
                $field_name = 'keywords_' . $issue_id;
                $raw_keywords = isset($_POST[$field_name]) ? sanitize_textarea_field($_POST[$field_name]) : '';
                $parsed = array_filter(array_map('trim', preg_split('/[\n,]+/', $raw_keywords)));
                $keywords[$issue_id] = array(
                    'title' => $issue_data['title'],
                    'keywords' => array_values($parsed)
                );
            }
            update_option('votecraft_issue_keywords', $keywords);
            echo '<div class="notice notice-success"><p>Keywords saved successfully!</p></div>';
        } elseif ($action === 'reset_keywords') {
            delete_option('votecraft_issue_keywords');
            echo '<div class="notice notice-info"><p>Keywords reset to defaults.</p></div>';
        }
    }

    // Get stats
    $legislators_table = $wpdb->prefix . 'votecraft_legislators';
    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $log_table = $wpdb->prefix . 'votecraft_sync_log';

    $legislator_count = $wpdb->get_var("SELECT COUNT(*) FROM $legislators_table");
    $congress_count = $wpdb->get_var("SELECT COUNT(*) FROM $legislators_table WHERE level = 'congress'");
    $state_leg_count = $wpdb->get_var("SELECT COUNT(*) FROM $legislators_table WHERE level = 'state' OR level IS NULL");
    $bill_count = $wpdb->get_var("SELECT COUNT(*) FROM $bills_table");
    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';
    $congress_bill_count = $wpdb->get_var("SELECT COUNT(*) FROM $bills_table WHERE state = 'Federal'");
    $state_bill_count = $wpdb->get_var("SELECT COUNT(*) FROM $bills_table WHERE state != 'Federal' OR state IS NULL");
    $states_with_data = $wpdb->get_col("SELECT DISTINCT state FROM $legislators_table ORDER BY state");
    $states_with_bills = $wpdb->get_col("SELECT DISTINCT state FROM $bills_table ORDER BY state");
    $congress_states_w_officials = $wpdb->get_var("SELECT COUNT(DISTINCT state) FROM $legislators_table WHERE level = 'congress'");
    $congress_states_w_bills = $wpdb->get_var("SELECT COUNT(DISTINCT l.state) FROM $sponsorships_table s INNER JOIN $legislators_table l ON s.legislator_id = l.id INNER JOIN $bills_table b ON s.bill_id = b.id WHERE l.level = 'congress' AND b.state = 'Federal'");
    $openstates_states_w_officials = $wpdb->get_var("SELECT COUNT(DISTINCT state) FROM $legislators_table WHERE level = 'state' OR level IS NULL");
    $openstates_states_w_bills = $wpdb->get_var("SELECT COUNT(DISTINCT state) FROM $bills_table WHERE state != 'Federal' AND state IS NOT NULL");
    $recent_syncs = $wpdb->get_results("SELECT * FROM $log_table WHERE sync_type IN ('legislators', 'bills') ORDER BY started_at DESC LIMIT 30");

    // Per-state counts for the stats table
    $per_state_legs = $wpdb->get_results("SELECT state, COUNT(*) as count FROM $legislators_table WHERE level = 'state' OR level IS NULL GROUP BY state ORDER BY state");
    $per_state_federal = $wpdb->get_results("SELECT state, COUNT(*) as count FROM $legislators_table WHERE level = 'congress' GROUP BY state ORDER BY state");
    $per_state_bills = $wpdb->get_results("SELECT state, COUNT(*) as count FROM $bills_table WHERE state != 'Federal' GROUP BY state ORDER BY state");
    $per_state_data = array();
    foreach ($per_state_legs as $row) {
        $per_state_data[$row->state]['legislators'] = (int)$row->count;
    }
    foreach ($per_state_federal as $row) {
        $per_state_data[$row->state]['federal'] = (int)$row->count;
    }
    foreach ($per_state_bills as $row) {
        $per_state_data[$row->state]['bills'] = (int)$row->count;
    }
    // Federal bills per state (via sponsorships by congress-level legislators)
    $per_state_fed_bills = $wpdb->get_results("SELECT l.state, COUNT(DISTINCT s.bill_id) as count FROM $sponsorships_table s INNER JOIN $legislators_table l ON s.legislator_id = l.id INNER JOIN $bills_table b ON s.bill_id = b.id WHERE l.level = 'congress' AND b.state = 'Federal' GROUP BY l.state ORDER BY l.state");
    foreach ($per_state_fed_bills as $row) {
        $per_state_data[$row->state]['fed_bills'] = (int)$row->count;
    }
    $federal_bills_count = (int)$congress_bill_count;

    // Congress.gov cache stats
    $cache_table = $wpdb->prefix . 'votecraft_cache';
    $congress_cache_count = $wpdb->get_var("SELECT COUNT(*) FROM $cache_table WHERE endpoint = 'congress' OR cache_key LIKE 'congress_%'");
    $congress_cache_recent = $wpdb->get_results(
        "SELECT cache_key, created_at FROM $cache_table
         WHERE endpoint = 'congress' OR cache_key LIKE 'congress_%'
         ORDER BY created_at DESC LIMIT 10"
    );
    $congress_cache_oldest = $wpdb->get_var(
        "SELECT MIN(created_at) FROM $cache_table WHERE endpoint = 'congress' OR cache_key LIKE 'congress_%'"
    );
    $congress_cache_newest = $wpdb->get_var(
        "SELECT MAX(created_at) FROM $cache_table WHERE endpoint = 'congress' OR cache_key LIKE 'congress_%'"
    );
    $openstates_cache_count = $wpdb->get_var("SELECT COUNT(*) FROM $cache_table WHERE endpoint != 'congress' AND cache_key NOT LIKE 'congress_%'");

    // Congress sync progress and schedule status
    $congress_sync_progress = get_option('votecraft_congress_sync_progress', array(
        'chamber' => 'senate',
        'offset' => 0,
        'total_synced' => 0,
        'completed' => false,
        'last_run' => null
    ));
    $congress_scheduled_enabled = get_option('votecraft_congress_scheduled_sync_enabled', false);
    $congress_next_scheduled = wp_next_scheduled('votecraft_congress_daily_sync');
    if (!$congress_next_scheduled) {
        $congress_next_scheduled = wp_next_scheduled('votecraft_congress_monthly_sync'); // Legacy fallback
    }

    // Group syncs by state for cleaner display
    $syncs_by_state = array();
    foreach ($recent_syncs as $sync) {
        $state = $sync->state ?: 'N/A';
        $date_key = date('Y-m-d H', strtotime($sync->started_at)); // Group by hour

        if (!isset($syncs_by_state[$state . '|' . $date_key])) {
            $syncs_by_state[$state . '|' . $date_key] = array(
                'state' => $state,
                'legislators' => null,
                'bills' => null,
                'started_at' => $sync->started_at,
                'status' => 'success',
                'error' => ''
            );
        }

        $entry = &$syncs_by_state[$state . '|' . $date_key];

        if ($sync->sync_type === 'legislators') {
            $entry['legislators'] = $sync->records_synced;
        } elseif ($sync->sync_type === 'bills') {
            $entry['bills'] = $sync->records_synced;
        }

        if ($sync->status === 'error') {
            $entry['status'] = 'error';
            $entry['error'] = $sync->error_message;
        } elseif ($sync->status === 'running' && $entry['status'] !== 'error') {
            $entry['status'] = 'running';
        }

        // Use earliest start time
        if (strtotime($sync->started_at) < strtotime($entry['started_at'])) {
            $entry['started_at'] = $sync->started_at;
        }
    }

    // Sort by date descending and limit to 15
    uasort($syncs_by_state, function($a, $b) {
        return strtotime($b['started_at']) - strtotime($a['started_at']);
    });
    $syncs_by_state = array_slice($syncs_by_state, 0, 15, true);

    // Issue keywords for counting bills
    $issue_keywords = array(
        'RCV' => array('ranked choice', 'ranked choice voting', 'instant runoff', 'preferential voting', 'alternative voting', 'final five voting', 'rcv', 'local option voting'),
        'Debt Reform' => array('public debt', 'predatory lending', 'student debt relief', 'debt transparency'),
        'Citizens United' => array('citizens united', 'campaign finance reform', 'dark money', 'political spending disclosure'),
        'Healthcare' => array('universal healthcare', 'medicare for all', 'public option', 'health coverage expansion'),
        'SCOTUS Reform' => array('supreme court reform', 'judicial term limits', 'court expansion', 'judicial ethics'),
        'News Paywalls' => array('local journalism', 'news access', 'press freedom', 'journalism funding')
    );

    // Count bills by issue and state, split into federal vs state legislator
    $issue_stats = array();
    $issue_totals_federal = array();
    $issue_totals_state = array();
    foreach ($issue_keywords as $issue => $keywords) {
        $issue_totals_federal[$issue] = 0;
        $issue_totals_state[$issue] = 0;
        $like_clauses = array();
        foreach ($keywords as $kw) {
            $like_clauses[] = $wpdb->prepare("title LIKE %s", '%' . $wpdb->esc_like($kw) . '%');
            $like_clauses[] = $wpdb->prepare("subjects LIKE %s", '%' . $wpdb->esc_like($kw) . '%');
            $like_clauses[] = $wpdb->prepare("abstract LIKE %s", '%' . $wpdb->esc_like($kw) . '%');
        }
        $where = implode(' OR ', $like_clauses);

        // Get counts per state
        $state_counts = $wpdb->get_results(
            "SELECT state, COUNT(*) as count FROM $bills_table WHERE ($where) GROUP BY state ORDER BY state"
        );

        foreach ($state_counts as $row) {
            if ($row->state === 'Federal') {
                $issue_totals_federal[$issue] += (int) $row->count;
            } else {
                if (!isset($issue_stats[$row->state])) {
                    $issue_stats[$row->state] = array();
                }
                $issue_stats[$row->state][$issue] = (int) $row->count;
                $issue_totals_state[$issue] += (int) $row->count;
            }
        }
    }

    // State list for dropdown
    $all_states = array(
        'Massachusetts',
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
        'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
        'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Michigan',
        'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
        'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
        'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
        'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
        'Wisconsin', 'Wyoming', 'District of Columbia'
    );

    // Scheduled sync status
    $scheduled_enabled = get_option('votecraft_scheduled_sync_enabled', false);
    $scheduled_progress = get_option('votecraft_scheduled_progress', array(
        'state_index' => 0,
        'phase' => 'legislators',
        'api_calls_today' => 0,
        'last_reset_date' => date('Y-m-d'),
        'completed_states' => array()
    ));
    $next_scheduled = wp_next_scheduled('votecraft_scheduled_sync');
    $all_states_list = array(
        'Massachusetts',
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
        'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
        'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
        'Maine', 'Maryland', 'Michigan', 'Minnesota', 'Mississippi',
        'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
        'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
        'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
        'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
        'West Virginia', 'Wisconsin', 'Wyoming'
    );
    $current_state = isset($all_states_list[$scheduled_progress['state_index']]) ? $all_states_list[$scheduled_progress['state_index']] : 'Complete';
    $completed_count = count($scheduled_progress['completed_states']);

    // Get recent batch syncs
    $recent_batches = $wpdb->get_results(
        "SELECT * FROM $log_table WHERE sync_type = 'scheduled_batch' ORDER BY started_at DESC LIMIT 10"
    );

    // Get recent Congress sync logs
    $congress_recent_syncs = $wpdb->get_results(
        "SELECT * FROM $log_table WHERE sync_type IN ('congress_batch', 'congress_bills_batch') ORDER BY started_at DESC LIMIT 10"
    );

    ?>
    <style>
        .votecraft-accordion {
            max-width: 1200px;
            margin-bottom: 10px;
            border: 1px solid #c3c4c7;
            border-radius: 4px;
            background: #fff;
        }
        .votecraft-accordion summary {
            padding: 12px 15px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            background: #f6f7f7;
            border-bottom: 1px solid #c3c4c7;
            list-style: none;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .votecraft-accordion summary::-webkit-details-marker {
            display: none;
        }
        .votecraft-accordion summary::before {
            content: '▶';
            font-size: 10px;
            transition: transform 0.2s;
        }
        .votecraft-accordion[open] summary::before {
            transform: rotate(90deg);
        }
        .votecraft-accordion[open] summary {
            border-bottom: 1px solid #c3c4c7;
        }
        .votecraft-accordion .accordion-content {
            padding: 15px;
        }
        .votecraft-accordion.status-enabled summary {
            background: #d4edda;
            border-color: #c3e6cb;
        }
        .votecraft-accordion.status-disabled summary {
            background: #fff3cd;
            border-color: #ffc107;
        }
        .status-badge {
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
            margin-left: auto;
        }
        .status-badge.enabled { background: #28a745; color: white; }
        .status-badge.disabled { background: #ffc107; color: #333; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 10px 0;
        }
        .stat-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        .stat-box .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2271b1;
        }
        .stat-box .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
        }
        /* Loading overlay */
        .votecraft-sync-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.85);
            z-index: 99999;
            justify-content: center;
            align-items: center;
            flex-direction: column;
        }
        .votecraft-sync-overlay.active {
            display: flex;
        }
        .votecraft-sync-overlay .spinner-text {
            font-size: 18px;
            color: #2271b1;
            margin-top: 15px;
            font-weight: 500;
        }
        .votecraft-sync-overlay .wp-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e0e0e0;
            border-top: 4px solid #2271b1;
            border-radius: 50%;
            animation: vc-spin 0.8s linear infinite;
        }
        @keyframes vc-spin {
            to { transform: rotate(360deg); }
        }
    </style>

    <div class="votecraft-sync-overlay" id="votecraft-sync-overlay">
        <div class="wp-spinner"></div>
        <div class="spinner-text" id="votecraft-sync-text">Syncing... please wait</div>
    </div>

    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Show loading overlay when any sync form is submitted
        var forms = document.querySelectorAll('form[method="post"]');
        forms.forEach(function(form) {
            form.addEventListener('submit', function(e) {
                var btn = e.submitter;
                if (btn && btn.name === 'votecraft_sync_action') {
                    var overlay = document.getElementById('votecraft-sync-overlay');
                    var text = document.getElementById('votecraft-sync-text');
                    text.textContent = 'Syncing ' + (btn.textContent.trim()) + '... please wait';
                    overlay.classList.add('active');
                }
            });
        });
    });
    </script>

    <div class="wrap">
        <h1>VoteCraft Data Sync</h1>

        <!-- OPENSTATES SCHEDULED SYNC -->
        <details class="votecraft-accordion <?php echo $scheduled_enabled ? 'status-enabled' : 'status-disabled'; ?>" open>
            <summary>
                🗂️ OpenStates Scheduled Sync
                <span class="status-badge <?php echo $scheduled_enabled ? 'enabled' : 'disabled'; ?>">
                    <?php echo $scheduled_enabled ? 'ENABLED' : 'PAUSED'; ?>
                </span>
            </summary>
            <div class="accordion-content">
            <p><strong>Status:</strong>
                <?php if ($scheduled_enabled): ?>
                    <span style="color: green; font-weight: bold;">✓ ENABLED</span> - Running every 4 hours
                <?php else: ?>
                    <span style="color: orange; font-weight: bold;">⏸ PAUSED</span>
                <?php endif; ?>
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0;">
                <div style="background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                    <h4 style="margin-top: 0;">Progress</h4>
                    <?php if (votecraft_is_rate_limited()): ?>
                        <p style="color: #dc3545; font-weight: bold;">DAILY RATE LIMIT HIT</p>
                    <?php endif; ?>
                    <p><strong>Current State:</strong> <?php echo esc_html($current_state); ?></p>
                    <p><strong>Current Phase:</strong> <?php echo ucfirst($scheduled_progress['phase']); ?></p>
                    <p><strong>States Completed:</strong> <?php echo $completed_count; ?> / 50</p>
                    <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
                        <div style="background: <?php echo votecraft_is_rate_limited() ? '#dc3545' : '#4caf50'; ?>; height: 100%; width: <?php echo ($completed_count / 50) * 100; ?>%;"></div>
                    </div>
                </div>

                <div style="background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                    <h4 style="margin-top: 0;">API Usage Today</h4>
                    <?php if (votecraft_is_rate_limited()): ?>
                        <p style="color: #dc3545; font-weight: bold;">DAILY RATE LIMIT HIT</p>
                        <p><strong>Calls Used:</strong> 250 / 250</p>
                        <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
                            <div style="background: #dc3545; height: 100%; width: 100%;"></div>
                        </div>
                    <?php else: ?>
                        <p><strong>Calls Used:</strong> <?php echo $scheduled_progress['api_calls_today']; ?> / 250</p>
                        <p><strong>Remaining:</strong> <?php echo max(0, 250 - $scheduled_progress['api_calls_today']); ?></p>
                        <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
                            <div style="background: <?php echo $scheduled_progress['api_calls_today'] > 200 ? '#ff9800' : '#2196f3'; ?>; height: 100%; width: <?php echo min(100, ($scheduled_progress['api_calls_today'] / 250) * 100); ?>%;"></div>
                        </div>
                    <?php endif; ?>
                    <p style="font-size: 0.85em; color: #666;"><strong>Next Run:</strong>
                        <?php echo $next_scheduled ? wp_date('M j, Y g:i A', $next_scheduled) : 'Not scheduled'; ?>
                    </p>
                </div>
            </div>

            <form method="post" style="margin-top: 15px;">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <?php if ($scheduled_enabled): ?>
                    <button type="submit" name="votecraft_sync_action" value="disable_scheduled_sync" class="button">⏸ Pause Scheduled Sync</button>
                <?php else: ?>
                    <button type="submit" name="votecraft_sync_action" value="enable_scheduled_sync" class="button button-primary">▶ Resume Scheduled Sync</button>
                <?php endif; ?>
                <button type="submit" name="votecraft_sync_action" value="clear_openstates_cache" class="button" onclick="return confirm('Clear all OpenStates cached data?');">🗑️ Clear Cache</button>
            </form>

            <?php if (!empty($scheduled_progress['completed_states'])): ?>
            <details style="margin-top: 15px; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <summary style="cursor: pointer; font-weight: bold;">Completed States (<?php echo $completed_count; ?>)</summary>
                <p style="margin-top: 10px; font-size: 0.9em;">
                    <?php echo esc_html(implode(', ', $scheduled_progress['completed_states'])); ?>
                </p>
            </details>
            <?php endif; ?>

            <?php if (!empty($recent_batches)): ?>
            <details style="margin-top: 15px; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <summary style="cursor: pointer; font-weight: bold;">Batch Run History (<?php echo count($recent_batches); ?>)</summary>
                <table class="widefat" style="margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>When</th>
                            <th>Result</th>
                            <th>Records Updated</th>
                            <th>API Calls</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($recent_batches as $batch): ?>
                        <tr>
                            <td><?php echo esc_html(wp_date('M j, g:i A', strtotime($batch->started_at))); ?></td>
                            <td>
                                <?php if ($batch->status === 'success'): ?>
                                    <span style="color: green;">✓ Complete</span>
                                <?php elseif ($batch->status === 'running'): ?>
                                    <span style="color: blue;">⏳ In Progress</span>
                                <?php else: ?>
                                    <span style="color: red;">✗ Failed</span>
                                <?php endif; ?>
                            </td>
                            <td><?php $records = intval($batch->records_synced); echo $records > 0 ? number_format($records) . ' updated' : '<span style="color: #888;">No changes</span>'; ?></td>
                            <td style="font-size: 0.85em;">
                                <?php
                                $details = $batch->error_message;
                                if (preg_match('/API calls?:\s*(\d+)/i', $details, $matches)) {
                                    echo $matches[1];
                                } elseif (!empty($details)) {
                                    echo esc_html(substr($details, 0, 80));
                                } else {
                                    echo '<span style="color: #888;">—</span>';
                                }
                                ?>
                            </td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </details>
            <?php endif; ?>

            <?php if (!empty($syncs_by_state)): ?>
            <details style="margin-top: 10px; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <summary style="cursor: pointer; font-weight: bold;">Per-State Sync History (<?php echo count($syncs_by_state); ?>)</summary>
                <table class="widefat" style="margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>State</th>
                            <th style="text-align: right;">Legislators</th>
                            <th style="text-align: right;">Bills</th>
                            <th>Started</th>
                            <th>Status</th>
                            <th>Error</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($syncs_by_state as $entry): ?>
                        <tr>
                            <td><strong><?php echo esc_html($entry['state']); ?></strong></td>
                            <td style="text-align: right;"><?php echo $entry['legislators'] !== null ? number_format($entry['legislators']) : '<span style="color: #999;">-</span>'; ?></td>
                            <td style="text-align: right;"><?php echo $entry['bills'] !== null ? number_format($entry['bills']) : '<span style="color: #999;">-</span>'; ?></td>
                            <td><?php echo esc_html(wp_date('M j, g:i A', strtotime($entry['started_at']))); ?></td>
                            <td>
                                <?php if ($entry['status'] === 'success'): ?>
                                    <span style="color: green;">✓ Success</span>
                                <?php elseif ($entry['status'] === 'running'): ?>
                                    <span style="color: blue;">⏳ Running</span>
                                <?php else: ?>
                                    <span style="color: red;">✗ Error</span>
                                <?php endif; ?>
                            </td>
                            <td style="font-size: 0.85em; max-width: 200px; overflow: hidden; text-overflow: ellipsis;"><?php echo esc_html($entry['error'] ?: '-'); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </details>
            <?php endif; ?>

            </div>
        </details>

        <!-- CONGRESS.GOV SCHEDULED SYNC -->
        <details class="votecraft-accordion <?php echo $congress_scheduled_enabled ? 'status-enabled' : 'status-disabled'; ?>">
            <summary>
                🏛️ Congress.gov Scheduled Sync
                <span class="status-badge <?php echo $congress_scheduled_enabled ? 'enabled' : 'disabled'; ?>">
                    <?php echo $congress_scheduled_enabled ? 'ENABLED' : 'PAUSED'; ?>
                </span>
            </summary>
            <div class="accordion-content">
            <p><strong>Status:</strong>
                <?php if ($congress_scheduled_enabled): ?>
                    <span style="color: green; font-weight: bold;">✓ ENABLED</span> - Runs daily until complete, then waits 30 days
                <?php else: ?>
                    <span style="color: orange; font-weight: bold;">⏸ PAUSED</span>
                <?php endif; ?>
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0;">
                <div style="background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                    <h4 style="margin-top: 0;">Progress</h4>
                    <?php if (votecraft_is_congress_rate_limited()): ?>
                        <p style="color: #dc3545; font-weight: bold;">HOURLY RATE LIMIT HIT</p>
                    <?php endif; ?>
                    <p><strong>Current Chamber:</strong> <?php echo ucfirst($congress_sync_progress['chamber']); ?></p>
                    <p><strong>Members Synced:</strong> <?php echo number_format($congress_sync_progress['total_synced']); ?></p>
                    <p><strong>Status:</strong> <?php echo $congress_sync_progress['completed'] ? '<span style="color: green;">✓ Complete</span>' : '<span style="color: blue;">In Progress</span>'; ?></p>
                </div>

                <div style="background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                    <h4 style="margin-top: 0;">API Usage This Hour</h4>
                    <?php
                    $congress_calls = votecraft_get_congress_api_calls();
                    ?>
                    <?php if (votecraft_is_congress_rate_limited()): ?>
                        <p style="color: #dc3545; font-weight: bold;">HOURLY RATE LIMIT HIT</p>
                        <p><strong>Calls Used:</strong> 5,000 / 5,000</p>
                        <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
                            <div style="background: #dc3545; height: 100%; width: 100%;"></div>
                        </div>
                        <p style="font-size: 0.85em; color: #666;">Resets in ~1 hour</p>
                    <?php else: ?>
                        <p><strong>Calls Used:</strong> <?php echo number_format($congress_calls); ?> / 5,000</p>
                        <p><strong>Remaining:</strong> <?php echo number_format(max(0, 5000 - $congress_calls)); ?></p>
                        <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
                            <div style="background: <?php echo $congress_calls > 4000 ? '#ff9800' : '#2196f3'; ?>; height: 100%; width: <?php echo min(100, ($congress_calls / 5000) * 100); ?>%;"></div>
                        </div>
                    <?php endif; ?>
                    <p style="font-size: 0.85em; color: #666;"><strong>Next Run:</strong>
                        <?php echo $congress_next_scheduled ? wp_date('M j, Y g:i A', $congress_next_scheduled) : 'Not scheduled'; ?>
                    </p>
                </div>
            </div>

            <form method="post" style="margin-top: 15px;">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <?php if ($congress_scheduled_enabled): ?>
                    <button type="submit" name="votecraft_sync_action" value="disable_congress_scheduled_sync" class="button">⏸ Pause Scheduled Sync</button>
                <?php else: ?>
                    <button type="submit" name="votecraft_sync_action" value="enable_congress_scheduled_sync" class="button button-primary">▶ Resume Sync</button>
                <?php endif; ?>
                <button type="submit" name="votecraft_sync_action" value="clear_congress_cache" class="button" onclick="return confirm('Clear all Congress.gov cache?');">🗑️ Clear Cache</button>
            </form>

            <?php if (!empty($congress_recent_syncs)): ?>
            <details style="margin-top: 15px; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                <summary style="cursor: pointer; font-weight: bold;">Recent Sync Activity (<?php echo count($congress_recent_syncs); ?>)</summary>
                <table class="widefat" style="margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>When</th>
                            <th>Type</th>
                            <th>Result</th>
                            <th>Records</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($congress_recent_syncs as $sync): ?>
                        <tr>
                            <td><?php echo esc_html(wp_date('M j, g:i A', strtotime($sync->started_at))); ?></td>
                            <td><?php echo $sync->sync_type === 'congress_batch' ? 'Members' : 'Bills'; ?></td>
                            <td>
                                <?php if ($sync->status === 'success'): ?>
                                    <span style="color: green;">✓ Success</span>
                                <?php elseif ($sync->status === 'running'): ?>
                                    <span style="color: blue;">⏳ Running</span>
                                <?php else: ?>
                                    <span style="color: red;">✗ Error</span>
                                <?php endif; ?>
                            </td>
                            <td><?php echo $sync->records_synced ? number_format($sync->records_synced) : '<span style="color: #888;">-</span>'; ?></td>
                            <td style="font-size: 0.85em; max-width: 200px; overflow: hidden; text-overflow: ellipsis;"><?php echo esc_html($sync->error_message ?: '-'); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </details>
            <?php endif; ?>

            </div>
        </details>

        <!-- DATABASE STATS -->
        <details class="votecraft-accordion" open>
            <summary>📈 States Count <span style="margin-left: auto; font-weight: normal; color: #666;"><?php echo number_format($legislator_count); ?> legislators, <?php echo number_format($bill_count); ?> bills</span></summary>
            <div class="accordion-content">

            <table class="widefat" style="margin-bottom: 20px;">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th style="text-align: right;">Number of Officials</th>
                        <th style="text-align: right;">States w/ Bills</th>
                        <th style="text-align: right;">Data Cached</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Congress.gov (Federal Officials)</strong></td>
                        <td style="text-align: right;"><?php echo number_format($congress_count); ?></td>
                        <td style="text-align: right;"><?php echo number_format($congress_states_w_bills); ?> / 50</td>
                        <td style="text-align: right;"><?php echo number_format($congress_cache_count); ?></td>
                    </tr>
                    <tr>
                        <td><strong>OpenStates (Legislators)</strong></td>
                        <td style="text-align: right;"><?php echo number_format($state_leg_count); ?> / 7,386</td>
                        <td style="text-align: right;"><?php echo number_format($openstates_states_w_bills); ?> / 50</td>
                        <td style="text-align: right;"><?php echo number_format($openstates_cache_count); ?></td>
                    </tr>
                </tbody>
            </table>

            <?php if (!empty($per_state_data)): ?>
            <h4>📊 Per-State Data</h4>
            <div style="max-height: 400px; overflow-y: auto;">
                <table class="widefat" style="border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="position: sticky; top: 0; background: #f0f0f1; z-index: 1;">State</th>
                            <th style="position: sticky; top: 0; background: #f0f0f1; z-index: 1; text-align: right;">Federal Officials</th>
                            <th style="position: sticky; top: 0; background: #f0f0f1; z-index: 1; text-align: right;">Federal Bills</th>
                            <th style="position: sticky; top: 0; background: #f0f0f1; z-index: 1; text-align: right;">Legislators</th>
                            <th style="position: sticky; top: 0; background: #f0f0f1; z-index: 1; text-align: right;">Bills</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        ksort($per_state_data);
                        unset($per_state_data['Federal']);
                        foreach ($per_state_data as $st => $counts):
                            $leg_ct = isset($counts['legislators']) ? $counts['legislators'] : 0;
                            $bill_ct = isset($counts['bills']) ? $counts['bills'] : 0;
                            $fed_ct = isset($counts['federal']) ? $counts['federal'] : 0;
                            $fed_bill_ct = isset($counts['fed_bills']) ? $counts['fed_bills'] : 0;
                        ?>
                        <tr>
                            <td><strong><?php echo esc_html($st); ?></strong></td>
                            <td style="text-align: right;"><?php echo $fed_ct ? number_format($fed_ct) : '-'; ?></td>
                            <td style="text-align: right;"><?php echo $fed_bill_ct ? number_format($fed_bill_ct) : '-'; ?></td>
                            <td style="text-align: right;"><?php echo $leg_ct ? number_format($leg_ct) : '-'; ?></td>
                            <td style="text-align: right;"><?php echo $bill_ct ? number_format($bill_ct) : '-'; ?></td>
                        </tr>
                        <?php
                        endforeach;
                        $total_legs = $total_bills = $total_feds = $total_fed_bills = 0;
                        foreach ($per_state_data as $c) {
                            $total_legs += isset($c['legislators']) ? $c['legislators'] : 0;
                            $total_bills += isset($c['bills']) ? $c['bills'] : 0;
                            $total_feds += isset($c['federal']) ? $c['federal'] : 0;
                            $total_fed_bills += isset($c['fed_bills']) ? $c['fed_bills'] : 0;
                        }
                        ?>
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold;">
                            <td style="position: sticky; bottom: 0; background: #f0f0f1; z-index: 1;">Total</td>
                            <td style="position: sticky; bottom: 0; background: #f0f0f1; z-index: 1; text-align: right;"><?php echo number_format($total_feds); ?></td>
                            <td style="position: sticky; bottom: 0; background: #f0f0f1; z-index: 1; text-align: right;"><?php echo number_format($total_fed_bills); ?></td>
                            <td style="position: sticky; bottom: 0; background: #f0f0f1; z-index: 1; text-align: right;"><?php echo number_format($total_legs); ?></td>
                            <td style="position: sticky; bottom: 0; background: #f0f0f1; z-index: 1; text-align: right;"><?php echo number_format($total_bills); ?></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <?php endif; ?>

            </div>
        </details>

        <!-- BILLS BY ISSUE -->
        <details class="votecraft-accordion">
            <summary>📋 Bills Count <span style="margin-left: auto; font-weight: normal; color: #666;"><?php echo number_format(array_sum($issue_totals_federal) + array_sum($issue_totals_state)); ?> total</span></summary>
            <div class="accordion-content">
            <p>Count of synced bills matching each issue's keywords:</p>

            <!-- National Totals -->
            <h4 style="margin-top: 15px;">National Totals</h4>
            <table class="widefat">
                <thead>
                    <tr>
                        <th>Issue</th>
                        <th style="text-align: right;">Federal Bills</th>
                        <th style="text-align: right;">State Legislator Bills</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($issue_totals_federal as $issue => $fed_count): ?>
                    <tr>
                        <td><strong><?php echo esc_html($issue); ?></strong></td>
                        <td style="text-align: right;"><?php echo number_format($fed_count); ?></td>
                        <td style="text-align: right;"><?php echo number_format($issue_totals_state[$issue]); ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <tr style="background: #f0f0f0; font-weight: bold;">
                        <td>Total (all issues)</td>
                        <td style="text-align: right;"><?php echo number_format(array_sum($issue_totals_federal)); ?></td>
                        <td style="text-align: right;"><?php echo number_format(array_sum($issue_totals_state)); ?></td>
                    </tr>
                </tbody>
            </table>

            <!-- By State -->
            <h3 style="margin-top: 20px;">By State</h3>
            <div style="max-height: 400px; overflow-y: auto;">
                <table class="widefat">
                    <thead>
                        <tr>
                            <th>State</th>
                            <?php foreach (array_keys($issue_totals_state) as $issue): ?>
                            <th style="text-align: right; font-size: 0.85em;"><?php echo esc_html($issue); ?></th>
                            <?php endforeach; ?>
                            <th style="text-align: right;"><strong>Total</strong></th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        ksort($issue_stats);
                        foreach ($issue_stats as $state => $issues):
                            $state_total = array_sum($issues);
                        ?>
                        <tr>
                            <td><strong><?php echo esc_html($state); ?></strong></td>
                            <?php foreach (array_keys($issue_totals_state) as $issue): ?>
                            <td style="text-align: right;"><?php echo isset($issues[$issue]) ? number_format($issues[$issue]) : '0'; ?></td>
                            <?php endforeach; ?>
                            <td style="text-align: right; font-weight: bold;"><?php echo number_format($state_total); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
            </div>
        </details>

        <!-- MANUAL SYNC -->
        <details class="votecraft-accordion">
            <summary>🔧 Manual Sync Controls</summary>
            <div class="accordion-content">

            <h4>🗂️ OpenStates Sync</h4>
            <p style="font-size: 0.9em; color: #666;">
                <strong>Stats:</strong> <?php echo number_format($state_leg_count); ?> state legislators, <?php echo number_format($state_bill_count); ?> state bills across <?php echo count($states_with_data); ?> states.
                <strong>Rate limit:</strong> <?php echo votecraft_is_rate_limited() ? '<span style="color: #dc3545;">Daily limit hit (resets tomorrow)</span>' : '<span style="color: #28a745;">OK</span>'; ?>
                <strong>Daily calls:</strong> <?php echo $scheduled_progress['api_calls_today']; ?> / 250
            </p>

            <h4>Sync Single State</h4>
            <form method="post">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <p>
                    <label for="state">Select State:</label><br>
                    <select name="state" id="state" style="width: 100%;">
                        <?php foreach ($all_states as $state): ?>
                            <option value="<?php echo esc_attr($state); ?>"><?php echo esc_html($state); ?></option>
                        <?php endforeach; ?>
                    </select>
                </p>
                <p>
                    <button type="submit" name="votecraft_sync_action" value="sync_state" class="button button-primary">
                        Sync State (Legislators + Bills)
                    </button>
                    <span style="font-size: 0.85em; color: #666;">(~34 API calls)</span>
                </p>
                <p>
                    <button type="submit" name="votecraft_sync_action" value="sync_legislators" class="button">
                        Sync Legislators Only
                    </button>
                    <span style="font-size: 0.85em; color: #666;">(1 API call)</span>
                    <button type="submit" name="votecraft_sync_action" value="sync_bills" class="button" style="margin-left: 10px;">
                        Sync Bills Only
                    </button>
                    <span style="font-size: 0.85em; color: #666;">(~33 API calls)</span>
                </p>
            </form>

            <hr style="margin: 20px 0;">

            <h4>🏛️ Congress.gov Sync <span style="font-weight: normal; color: #666; font-size: 0.9em;">(<?php echo number_format($congress_cache_count); ?> cached, <?php echo number_format($congress_count); ?> in DB)</span></h4>
            <p style="font-size: 0.9em; color: #666;">Sync federal legislators from Congress.gov. <strong>Note:</strong> 500 API calls/day limit.</p>

            <form method="post" style="display: inline-block; margin-right: 10px;">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <button type="submit" name="votecraft_sync_action" value="sync_congress_members" class="button">
                    Sync All Members
                </button>
                <?php
                    $cong_progress = get_option('votecraft_congress_sync_progress', array('chamber' => 'senate', 'offset' => 0, 'total_synced' => 0, 'completed' => false));
                    $cong_synced = isset($cong_progress['total_synced']) ? $cong_progress['total_synced'] : 0;
                    $cong_chamber = isset($cong_progress['chamber']) ? ucfirst($cong_progress['chamber']) : 'Senate';
                    $cong_done = isset($cong_progress['completed']) && $cong_progress['completed'];
                ?>
                <span style="font-size: 0.85em; color: #666; margin-left: 5px;">(50 per batch)</span>
                <?php if ($cong_synced > 0): ?>
                <br><span style="font-size: 0.85em; color: <?php echo $cong_done ? '#28a745' : '#d63384'; ?>; margin-left: 5px;">
                    Progress: <?php echo $cong_synced; ?> members synced<?php echo $cong_done ? ' ✓ Complete' : ' — next: ' . $cong_chamber . ', click again to continue'; ?>
                </span>
                <?php endif; ?>
            </form>
            <form method="post" style="display: inline-block;">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <button type="submit" name="votecraft_sync_action" value="sync_congress_issue_bills" class="button">
                    Sync Issue-Related Bills
                </button>
                <?php
                    $bills_progress = get_option('votecraft_congress_bills_sync_progress', array('offset' => 0, 'total_synced' => 0, 'bills_found' => 0, 'completed' => false));
                    $bills_batch = 25;
                    $bills_offset = isset($bills_progress['offset']) ? $bills_progress['offset'] : 0;
                    $bills_total = isset($bills_progress['total_synced']) ? $bills_progress['total_synced'] : 0;
                    $bills_found = isset($bills_progress['bills_found']) ? $bills_progress['bills_found'] : 0;
                    $bills_done = isset($bills_progress['completed']) && $bills_progress['completed'];
                ?>
                <span style="font-size: 0.85em; color: #666; margin-left: 5px;">
                    (<?php echo $bills_batch; ?> members per batch, ~<?php echo $bills_batch * 4; ?> API calls)
                </span>
                <?php if ($bills_total > 0 || $bills_found > 0): ?>
                <br><span style="font-size: 0.85em; color: <?php echo $bills_done ? '#28a745' : '#d63384'; ?>; margin-left: 5px;">
                    Progress: <?php echo $bills_total; ?>/<?php echo number_format($congress_count); ?> members processed, <?php echo $bills_found; ?> bills found
                    <?php echo $bills_done ? ' ✓ Complete' : ' — click again to continue'; ?>
                </span>
                <?php endif; ?>
            </form>

            </div>
        </details>

        <!-- ISSUE KEYWORDS EDITOR -->
        <?php $vc_keywords = votecraft_get_keywords(); ?>
        <details class="votecraft-accordion">
            <summary>📝 Keyword Controls <span style="margin-left: auto; font-weight: normal; color: #666;"><?php echo array_sum(array_map(function($d) { return count($d['keywords']); }, $vc_keywords)); ?> keywords across <?php echo count($vc_keywords); ?> issues</span></summary>
            <div class="accordion-content">
            <p>These keywords are used to filter bills from both OpenStates and Congress.gov. Edit below and save, or reset to defaults.</p>

            <form method="post">
            <?php wp_nonce_field('votecraft_sync'); ?>
            <table class="widefat">
                <thead>
                    <tr>
                        <th style="width: 140px;">Issue</th>
                        <th>Keywords <span style="font-weight: normal; color: #666;">(one per line or comma-separated)</span></th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($vc_keywords as $issue_id => $issue_data): ?>
                    <tr>
                        <td><strong><?php echo esc_html($issue_data['title']); ?></strong><br><span style="color: #666; font-size: 0.85em;"><?php echo count($issue_data['keywords']); ?> keywords</span></td>
                        <td>
                            <textarea name="keywords_<?php echo esc_attr($issue_id); ?>" rows="3" style="width: 100%; font-size: 0.9em;"><?php echo esc_textarea(implode(', ', $issue_data['keywords'])); ?></textarea>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <p style="margin-top: 10px;">
                <button type="submit" name="votecraft_sync_action" value="save_keywords" class="button button-primary">Save Keywords</button>
                <button type="submit" name="votecraft_sync_action" value="reset_keywords" class="button" onclick="return confirm('Reset all keywords to defaults?');">Reset to Defaults</button>
                <span style="margin-left: 15px; font-size: 0.85em; color: #666;">API endpoint: <code><?php echo esc_url(rest_url('votecraft/v1/keywords')); ?></code></span>
            </p>
            </form>

            </div>
        </details>


    </div>
    <?php
}

// =============================================================================
// SYNC FUNCTIONS
// =============================================================================

/**
 * Sync legislators for a single state
 */
function votecraft_sync_legislators($state) {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_legislators';
    $log_table = $wpdb->prefix . 'votecraft_sync_log';

    // Log start
    $wpdb->insert($log_table, array(
        'sync_type' => 'legislators',
        'state' => $state,
        'status' => 'running',
        'started_at' => gmdate('Y-m-d H:i:s')
    ));
    $log_id = $wpdb->insert_id;

    try {
        // Convert state name to OpenStates jurisdiction (2-letter abbreviation)
        $jurisdiction = votecraft_state_to_jurisdiction($state);

        $all_legislators = array();
        $page = 1;
        $per_page = 50;

        // Fetch all pages
        do {
            $url = 'https://v3.openstates.org/people?' . http_build_query(array(
                'jurisdiction' => $jurisdiction,
                'per_page' => $per_page,
                'page' => $page,
                'apikey' => VOTECRAFT_OPENSTATES_API_KEY
            ));

            $response = wp_remote_get($url, array('timeout' => 30));

            if (is_wp_error($response)) {
                throw new Exception('API request failed: ' . $response->get_error_message());
            }

            $status = wp_remote_retrieve_response_code($response);
            $raw_body = wp_remote_retrieve_body($response);

            // Handle rate limiting
            if ($status === 429) {
                // Check if this is a daily or per-minute limit
                $limit_type = votecraft_parse_rate_limit_error($raw_body);

                if ($limit_type === 'daily') {
                    // Daily limit hit - stop all syncing for today
                    votecraft_set_rate_limited();
                    throw new Exception('⚠️ DAILY RATE LIMIT HIT - Syncing paused until tomorrow');
                }

                // Per-minute limit - wait 65 seconds and retry once
                sleep(65);
                $response = wp_remote_get($url, array('timeout' => 30));
                if (is_wp_error($response)) {
                    throw new Exception('API request failed after retry');
                }
                $status = wp_remote_retrieve_response_code($response);
                $raw_body = wp_remote_retrieve_body($response);

                // If still rate limited after retry, check if daily limit
                if ($status === 429) {
                    $limit_type = votecraft_parse_rate_limit_error($raw_body);
                    if ($limit_type === 'daily') {
                        votecraft_set_rate_limited();
                        throw new Exception('⚠️ DAILY RATE LIMIT HIT - Syncing paused until tomorrow');
                    }
                    throw new Exception('⚠️ RATE LIMIT - Too many requests per minute');
                }
            }

            // Check for HTTP errors
            if ($status >= 400) {
                // Check if this is a rate limit error (429 might have been missed)
                if (strpos($raw_body, 'exceeded limit') !== false) {
                    $limit_type = votecraft_parse_rate_limit_error($raw_body);
                    if ($limit_type === 'daily') {
                        votecraft_set_rate_limited();
                        throw new Exception('⚠️ DAILY RATE LIMIT HIT - Syncing paused until tomorrow');
                    }
                }
                throw new Exception("API returned HTTP $status: " . substr($raw_body, 0, 200));
            }

            $body = json_decode($raw_body, true);
            if ($body === null) {
                throw new Exception('JSON parse error: ' . substr($raw_body, 0, 200));
            }
            if (!isset($body['results'])) {
                // OpenStates returns 'detail' key for errors
                if (isset($body['detail'])) {
                    throw new Exception('OpenStates error: ' . $body['detail']);
                }
                $keys = is_array($body) ? implode(', ', array_keys($body)) : 'not an array';
                throw new Exception("Invalid API response - got keys: $keys - " . substr($raw_body, 0, 300));
            }

            $all_legislators = array_merge($all_legislators, $body['results']);
            $has_more = count($body['results']) === $per_page;
            $page++;

            // Brief delay between pages
            usleep(500000); // 0.5 second

        } while ($has_more && $page <= 20); // Safety limit

        // Insert/update legislators
        $count = 0;
        $congress_count = 0;
        foreach ($all_legislators as $leg) {
            $current_role = isset($leg['current_role']) ? $leg['current_role'] : null;

            // Determine if this is a Congress member, state legislator, or executive
            $role_title = $current_role ? strtolower($current_role['title'] ?? '') : '';
            $role_org = $current_role ? strtolower($current_role['org_classification'] ?? '') : '';
            $jurisdiction_id = isset($leg['jurisdiction']['id']) ? strtolower($leg['jurisdiction']['id']) : '';

            $is_congress = (
                strpos($role_title, 'u.s.') !== false ||
                strpos($role_title, 'united states') !== false ||
                strpos($role_org, 'congress') !== false ||
                strpos($jurisdiction_id, 'country:us/government') !== false
            );

            // Check if this is an executive branch official
            $is_executive = (
                strpos($role_title, 'governor') !== false ||
                strpos($role_title, 'lieutenant governor') !== false ||
                strpos($role_title, 'attorney general') !== false ||
                strpos($role_title, 'secretary of') !== false ||
                strpos($role_title, 'treasurer') !== false ||
                strpos($role_title, 'auditor') !== false ||
                strpos($role_title, 'comptroller') !== false ||
                strpos($role_title, 'executive council') !== false ||
                strpos($role_org, 'executive') !== false
            );

            // Set level based on type
            $level = 'state';
            if ($is_congress) {
                $level = 'congress';
                $congress_count++;
            } elseif ($is_executive) {
                $level = 'executive';
            }

            $wpdb->replace($table, array(
                'id' => $leg['id'],
                'name' => $leg['name'],
                'party' => isset($leg['party']) ? $leg['party'] : null,
                'state' => $state,
                'chamber' => $current_role ? ($current_role['org_classification'] ?? null) : null,
                'district' => $current_role ? ($current_role['district'] ?? null) : null,
                'photo_url' => isset($leg['image']) ? $leg['image'] : null,
                'email' => isset($leg['email']) ? $leg['email'] : null,
                'current_role' => $current_role ? json_encode($current_role) : null,
                'jurisdiction_id' => isset($leg['jurisdiction']['id']) ? $leg['jurisdiction']['id'] : null,
                'level' => $level,
                'raw_data' => json_encode($leg),
                'updated_at' => gmdate('Y-m-d H:i:s')
            ));
            $count++;
        }

        // Log success
        $wpdb->update($log_table, array(
            'status' => 'success',
            'records_synced' => $count,
            'completed_at' => gmdate('Y-m-d H:i:s')
        ), array('id' => $log_id));

        $msg = "Synced $count legislators for $state";
        if ($congress_count > 0) {
            $msg .= " ($congress_count Congress members)";
        }
        return array('success' => true, 'message' => $msg);

    } catch (Exception $e) {
        // Log error
        $wpdb->update($log_table, array(
            'status' => 'error',
            'error_message' => $e->getMessage(),
            'completed_at' => gmdate('Y-m-d H:i:s')
        ), array('id' => $log_id));

        return array('success' => false, 'message' => 'Error: ' . $e->getMessage());
    }
}

/**
 * Sync bills for a single state (searches by VoteCraft issue keywords)
 * Only fetches bills from the last 5 years
 */
function votecraft_sync_bills($state) {
    global $wpdb;
    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';
    $log_table = $wpdb->prefix . 'votecraft_sync_log';

    // Keywords matching VoteCraft's 6 core issues only
    $keywords = array(
        // RCV / Voting Reform (9)
        'ranked choice', 'ranked choice voting', 'instant runoff', 'preferential voting',
        'alternative voting', 'final five voting', 'rank the vote', 'rcv', 'local option voting',
        // Debt / Consumer Finance (6)
        'student loan', 'student debt', 'predatory lending', 'payday loan', 'debt relief', 'debt collection',
        // Campaign Finance / Citizens United (5)
        'citizens united', 'campaign finance', 'dark money', 'super pac', 'political spending',
        // Healthcare (6)
        'medicare for all', 'universal health', 'public option', 'medicaid expansion', 'single payer', 'drug pricing',
        // SCOTUS / Judicial Reform (4)
        'supreme court reform', 'judicial term limits', 'court expansion', 'judicial ethics',
        // News / Media (3)
        'local journalism', 'journalism funding', 'news deserts'
    );
    // Total: ~33 keywords = ~33 API calls per state

    // Only bills from last 5 years
    $five_years_ago = date('Y-m-d', strtotime('-5 years'));

    // Log start
    $wpdb->insert($log_table, array(
        'sync_type' => 'bills',
        'state' => $state,
        'status' => 'running',
        'started_at' => gmdate('Y-m-d H:i:s')
    ));
    $log_id = $wpdb->insert_id;

    try {
        $count = 0;
        $seen_ids = array();

        // Convert state name to OpenStates jurisdiction (2-letter abbreviation)
        $jurisdiction = votecraft_state_to_jurisdiction($state);

        foreach ($keywords as $keyword) {
            // Build URL — use string concatenation for include params (OpenStates needs repeated include=)
            $base_params = array(
                'jurisdiction' => $jurisdiction,
                'q' => $keyword,
                'per_page' => 20,
                'sort' => 'latest_action_desc',
                'created_since' => $five_years_ago,
                'apikey' => VOTECRAFT_OPENSTATES_API_KEY
            );
            $url = 'https://v3.openstates.org/bills?' . http_build_query($base_params) . '&include=sponsorships&include=abstracts';

            $response = wp_remote_get($url, array('timeout' => 15));

            if (is_wp_error($response)) {
                continue;
            }

            $status = wp_remote_retrieve_response_code($response);
            $raw_body = wp_remote_retrieve_body($response);

            if ($status === 429) {
                $limit_type = votecraft_parse_rate_limit_error($raw_body);
                if ($limit_type === 'daily') {
                    votecraft_set_rate_limited();
                    throw new Exception('⚠️ DAILY RATE LIMIT HIT after ' . $count . ' bills. Syncing paused until tomorrow.');
                }
                // Per-minute limit - skip this keyword
                continue;
            }

            if ($status >= 400) {
                if (strpos($raw_body, 'exceeded limit') !== false && strpos($raw_body, '/day') !== false) {
                    votecraft_set_rate_limited();
                    throw new Exception('⚠️ DAILY RATE LIMIT HIT after ' . $count . ' bills.');
                }
                continue;
            }

            $body = json_decode($raw_body, true);
            if ($body && isset($body['results'])) {
                // Save each bill immediately (no batching — survives timeouts)
                foreach ($body['results'] as $bill) {
                    if (isset($seen_ids[$bill['id']])) continue;
                    $seen_ids[$bill['id']] = true;

                    $latest_action = isset($bill['latest_action_date']) ? $bill['latest_action_date'] : null;
                    $api_subjects = isset($bill['subject']) && is_array($bill['subject']) ? $bill['subject'] : array();
                    $api_abstract = '';
                    if (isset($bill['abstracts']) && is_array($bill['abstracts']) && !empty($bill['abstracts'])) {
                        $api_abstract = isset($bill['abstracts'][0]['abstract']) ? $bill['abstracts'][0]['abstract'] : '';
                    }

                    $wpdb->replace($bills_table, array(
                        'id' => $bill['id'],
                        'identifier' => $bill['identifier'],
                        'title' => $bill['title'],
                        'state' => $state,
                        'session' => isset($bill['session']) ? $bill['session'] : null,
                        'chamber' => isset($bill['from_organization']['classification']) ? $bill['from_organization']['classification'] : null,
                        'classification' => isset($bill['classification']) ? (is_array($bill['classification']) ? implode(', ', $bill['classification']) : $bill['classification']) : null,
                        'subject' => $keyword,
                        'issue_id' => $keyword,
                        'subjects' => json_encode($api_subjects),
                        'abstract' => $api_abstract,
                        'latest_action_date' => $latest_action,
                        'latest_action_description' => isset($bill['latest_action_description']) ? $bill['latest_action_description'] : null,
                        'openstates_url' => isset($bill['openstates_url']) ? $bill['openstates_url'] : null,
                        'raw_data' => json_encode($bill),
                        'updated_at' => gmdate('Y-m-d H:i:s')
                    ));

                    // Save sponsorships immediately too
                    if (isset($bill['sponsorships']) && is_array($bill['sponsorships'])) {
                        foreach ($bill['sponsorships'] as $sponsor) {
                            $wpdb->replace($sponsorships_table, array(
                                'bill_id' => $bill['id'],
                                'legislator_id' => isset($sponsor['person']['id']) ? $sponsor['person']['id'] : null,
                                'legislator_name' => $sponsor['name'],
                                'sponsorship_type' => isset($sponsor['primary']) && $sponsor['primary'] ? 'primary' : 'cosponsor',
                                'classification' => isset($sponsor['classification']) ? $sponsor['classification'] : null
                            ));
                        }
                    }

                    $count++;
                }
            }

            // Brief delay between keywords
            usleep(200000); // 0.2 second
        }

        // Log success
        $wpdb->update($log_table, array(
            'status' => 'success',
            'records_synced' => $count,
            'completed_at' => gmdate('Y-m-d H:i:s')
        ), array('id' => $log_id));

        return array('success' => true, 'message' => "Synced $count bills for $state");

    } catch (Exception $e) {
        // Log error — but $count bills were already saved
        $wpdb->update($log_table, array(
            'status' => 'error',
            'records_synced' => $count,
            'error_message' => $e->getMessage(),
            'completed_at' => gmdate('Y-m-d H:i:s')
        ), array('id' => $log_id));

        return array('success' => false, 'message' => 'Error: ' . $e->getMessage());
    }
}

/**
 * Get list of all US states
 */
function votecraft_get_all_states() {
    return array(
        'Massachusetts',
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
        'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
        'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Michigan',
        'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
        'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
        'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
        'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
        'Wisconsin', 'Wyoming', 'District of Columbia'
    );
}

/**
 * Convert state name to OpenStates jurisdiction (2-letter abbreviation)
 */
function votecraft_state_to_jurisdiction($state) {
    $abbrevs = array(
        'Alabama' => 'al', 'Alaska' => 'ak', 'Arizona' => 'az', 'Arkansas' => 'ar',
        'California' => 'ca', 'Colorado' => 'co', 'Connecticut' => 'ct', 'Delaware' => 'de',
        'Florida' => 'fl', 'Georgia' => 'ga', 'Hawaii' => 'hi', 'Idaho' => 'id',
        'Illinois' => 'il', 'Indiana' => 'in', 'Iowa' => 'ia', 'Kansas' => 'ks',
        'Kentucky' => 'ky', 'Louisiana' => 'la', 'Maine' => 'me', 'Maryland' => 'md',
        'Massachusetts' => 'ma', 'Michigan' => 'mi', 'Minnesota' => 'mn', 'Mississippi' => 'ms',
        'Missouri' => 'mo', 'Montana' => 'mt', 'Nebraska' => 'ne', 'Nevada' => 'nv',
        'New Hampshire' => 'nh', 'New Jersey' => 'nj', 'New Mexico' => 'nm', 'New York' => 'ny',
        'North Carolina' => 'nc', 'North Dakota' => 'nd', 'Ohio' => 'oh', 'Oklahoma' => 'ok',
        'Oregon' => 'or', 'Pennsylvania' => 'pa', 'Rhode Island' => 'ri', 'South Carolina' => 'sc',
        'South Dakota' => 'sd', 'Tennessee' => 'tn', 'Texas' => 'tx', 'Utah' => 'ut',
        'Vermont' => 'vt', 'Virginia' => 'va', 'Washington' => 'wa', 'West Virginia' => 'wv',
        'Wisconsin' => 'wi', 'Wyoming' => 'wy', 'District of Columbia' => 'dc'
    );
    return isset($abbrevs[$state]) ? $abbrevs[$state] : strtolower(str_replace(' ', '-', $state));
}

/**
 * Sync ALL legislators across all 50 states + DC
 * This is the bulk people download
 */
function votecraft_sync_all_legislators() {
    global $wpdb;
    $log_table = $wpdb->prefix . 'votecraft_sync_log';

    $states = votecraft_get_all_states();
    $total = 0;
    $errors = array();
    $completed = 0;

    // Log bulk sync start
    $wpdb->insert($log_table, array(
        'sync_type' => 'bulk_legislators',
        'state' => 'ALL',
        'status' => 'running',
        'started_at' => gmdate('Y-m-d H:i:s')
    ));
    $log_id = $wpdb->insert_id;

    foreach ($states as $state) {
        $result = votecraft_sync_legislators($state);
        if ($result['success']) {
            preg_match('/(\d+)/', $result['message'], $matches);
            $total += isset($matches[1]) ? (int)$matches[1] : 0;
            $completed++;
        } else {
            $errors[] = $state . ': ' . $result['message'];
        }

        // Longer delay between states to avoid rate limiting
        sleep(3);
    }

    // Log completion
    $wpdb->update($log_table, array(
        'status' => empty($errors) ? 'success' : 'partial',
        'records_synced' => $total,
        'error_message' => !empty($errors) ? 'Failed states: ' . implode(', ', $errors) : null,
        'completed_at' => gmdate('Y-m-d H:i:s')
    ), array('id' => $log_id));

    $message = "Synced $total legislators across $completed states.";
    if (!empty($errors)) {
        $message .= " Failed (" . count($errors) . "): " . implode('; ', array_slice($errors, 0, 3));
    }

    return array('success' => $completed > 0, 'message' => $message);
}

/**
 * Sync issue-related bills across all 50 states + DC
 * Only bills matching the 6 VoteCraft issues, last 5 years
 */
function votecraft_sync_all_issue_bills() {
    global $wpdb;
    $log_table = $wpdb->prefix . 'votecraft_sync_log';

    $states = votecraft_get_all_states();
    $total = 0;
    $errors = array();
    $completed = 0;

    // Log bulk sync start
    $wpdb->insert($log_table, array(
        'sync_type' => 'bulk_issue_bills',
        'state' => 'ALL',
        'status' => 'running',
        'started_at' => gmdate('Y-m-d H:i:s')
    ));
    $log_id = $wpdb->insert_id;

    foreach ($states as $state) {
        $result = votecraft_sync_bills($state);
        if ($result['success']) {
            preg_match('/(\d+)/', $result['message'], $matches);
            $total += isset($matches[1]) ? (int)$matches[1] : 0;
            $completed++;
        } else {
            $errors[] = $state;
        }

        // Longer rate limit for bills (more API calls per state)
        sleep(2);
    }

    // Log completion
    $wpdb->update($log_table, array(
        'status' => empty($errors) ? 'success' : 'partial',
        'records_synced' => $total,
        'error_message' => !empty($errors) ? 'Failed states: ' . implode(', ', $errors) : null,
        'completed_at' => gmdate('Y-m-d H:i:s')
    ), array('id' => $log_id));

    $message = "Synced $total issue-related bills (last 5 years) across $completed states.";
    if (!empty($errors)) {
        $message .= " Failed: " . implode(', ', array_slice($errors, 0, 5));
    }

    return array('success' => empty($errors), 'message' => $message);
}

/**
 * Sync all states (legislators and bills) - legacy function
 */
function votecraft_sync_all_states() {
    $states = votecraft_get_all_states();

    $total_legislators = 0;
    $total_bills = 0;
    $errors = array();

    foreach ($states as $state) {
        // Sync legislators
        $result = votecraft_sync_legislators($state);
        if ($result['success']) {
            preg_match('/(\d+)/', $result['message'], $matches);
            $total_legislators += isset($matches[1]) ? (int)$matches[1] : 0;
        } else {
            $errors[] = "$state legislators: " . $result['message'];
        }

        // Sync bills
        $result = votecraft_sync_bills($state);
        if ($result['success']) {
            preg_match('/(\d+)/', $result['message'], $matches);
            $total_bills += isset($matches[1]) ? (int)$matches[1] : 0;
        } else {
            $errors[] = "$state bills: " . $result['message'];
        }

        // Longer delay between states
        sleep(2);
    }

    $message = "Synced $total_legislators legislators and $total_bills bills across " . count($states) . " states.";
    if (!empty($errors)) {
        $message .= " Errors: " . implode('; ', array_slice($errors, 0, 5));
    }

    return array('success' => empty($errors), 'message' => $message);
}

// =============================================================================
// LOCAL DATABASE QUERY FUNCTIONS (for use by proxy)
// =============================================================================

/**
 * Search bills in local database
 */
function votecraft_local_search_bills($state, $keyword, $limit = 20) {
    global $wpdb;
    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';

    // Search by keyword in actual bill content (title, subjects, abstract)
    $like_kw = '%' . $wpdb->esc_like($keyword) . '%';
    $bills = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $bills_table
         WHERE state = %s
         AND (title LIKE %s OR subjects LIKE %s OR abstract LIKE %s)
         ORDER BY latest_action_date DESC
         LIMIT %d",
        $state,
        $like_kw,
        $like_kw,
        $like_kw,
        $limit
    ));

    // Attach sponsorships
    foreach ($bills as &$bill) {
        $bill->sponsorships = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $sponsorships_table WHERE bill_id = %s",
            $bill->id
        ));
        // Parse raw_data for full bill info
        if ($bill->raw_data) {
            $bill->raw = json_decode($bill->raw_data);
        }
    }

    return $bills;
}

/**
 * Get legislators for a state from local database
 */
function votecraft_local_get_legislators($state, $chamber = null) {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_legislators';

    $sql = "SELECT * FROM $table WHERE state = %s";
    $params = array($state);

    if ($chamber) {
        $sql .= " AND chamber = %s";
        $params[] = $chamber;
    }

    $sql .= " ORDER BY name ASC";

    return $wpdb->get_results($wpdb->prepare($sql, ...$params));
}

/**
 * Check if we have local data for a state
 */
function votecraft_has_local_data($state, $type = 'legislators') {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_' . ($type === 'bills' ? 'bills' : 'legislators');

    $count = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $table WHERE state = %s",
        $state
    ));

    return $count > 0;
}

// =============================================================================
/**
 * Get state capitals for address lookups
 */
function votecraft_get_state_capitals() {
    return array(
        'Alabama' => 'Montgomery, AL',
        'Alaska' => 'Juneau, AK',
        'Arizona' => 'Phoenix, AZ',
        'Arkansas' => 'Little Rock, AR',
        'California' => 'Sacramento, CA',
        'Colorado' => 'Denver, CO',
        'Connecticut' => 'Hartford, CT',
        'Delaware' => 'Dover, DE',
        'Florida' => 'Tallahassee, FL',
        'Georgia' => 'Atlanta, GA',
        'Hawaii' => 'Honolulu, HI',
        'Idaho' => 'Boise, ID',
        'Illinois' => 'Springfield, IL',
        'Indiana' => 'Indianapolis, IN',
        'Iowa' => 'Des Moines, IA',
        'Kansas' => 'Topeka, KS',
        'Kentucky' => 'Frankfort, KY',
        'Louisiana' => 'Baton Rouge, LA',
        'Maine' => 'Augusta, ME',
        'Maryland' => 'Annapolis, MD',
        'Massachusetts' => 'Boston, MA',
        'Michigan' => 'Lansing, MI',
        'Minnesota' => 'Saint Paul, MN',
        'Mississippi' => 'Jackson, MS',
        'Missouri' => 'Jefferson City, MO',
        'Montana' => 'Helena, MT',
        'Nebraska' => 'Lincoln, NE',
        'Nevada' => 'Carson City, NV',
        'New Hampshire' => 'Concord, NH',
        'New Jersey' => 'Trenton, NJ',
        'New Mexico' => 'Santa Fe, NM',
        'New York' => 'Albany, NY',
        'North Carolina' => 'Raleigh, NC',
        'North Dakota' => 'Bismarck, ND',
        'Ohio' => 'Columbus, OH',
        'Oklahoma' => 'Oklahoma City, OK',
        'Oregon' => 'Salem, OR',
        'Pennsylvania' => 'Harrisburg, PA',
        'Rhode Island' => 'Providence, RI',
        'South Carolina' => 'Columbia, SC',
        'South Dakota' => 'Pierre, SD',
        'Tennessee' => 'Nashville, TN',
        'Texas' => 'Austin, TX',
        'Utah' => 'Salt Lake City, UT',
        'Vermont' => 'Montpelier, VT',
        'Virginia' => 'Richmond, VA',
        'Washington' => 'Olympia, WA',
        'West Virginia' => 'Charleston, WV',
        'Wisconsin' => 'Madison, WI',
        'Wyoming' => 'Cheyenne, WY',
        'District of Columbia' => 'Washington, DC'
    );
}

/**
 * Get Congress members for a state from local database
 */
function votecraft_local_get_congress_legislators($state = null) {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_legislators';

    if ($state) {
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table WHERE level = 'congress' AND state = %s ORDER BY chamber ASC, name ASC",
            $state
        ));
    }

    return $wpdb->get_results(
        "SELECT * FROM $table WHERE level = 'congress' ORDER BY state ASC, chamber ASC, name ASC"
    );
}

/**
 * Get bills sponsored by a specific legislator
 */
function votecraft_get_bills_by_sponsor($legislator_name, $state = null, $limit = 20) {
    global $wpdb;
    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';

    $sql = "SELECT b.* FROM $bills_table b
            INNER JOIN $sponsorships_table s ON b.id = s.bill_id
            WHERE s.legislator_name LIKE %s";
    $params = array('%' . $wpdb->esc_like($legislator_name) . '%');

    if ($state) {
        $sql .= " AND b.state = %s";
        $params[] = $state;
    }

    $sql .= " ORDER BY b.latest_action_date DESC LIMIT %d";
    $params[] = $limit;

    $bills = $wpdb->get_results($wpdb->prepare($sql, ...$params));

    // Attach sponsorships to each bill
    foreach ($bills as &$bill) {
        $bill->sponsorships = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $sponsorships_table WHERE bill_id = %s",
            $bill->id
        ));
    }

    return $bills;
}

// =============================================================================
// SCHEDULED SYNC (WP CRON)
// =============================================================================

// Register monthly cron schedule
add_filter('cron_schedules', 'votecraft_add_cron_schedules');
function votecraft_add_cron_schedules($schedules) {
    $schedules['monthly'] = array(
        'interval' => 30 * DAY_IN_SECONDS,
        'display'  => 'Once Monthly'
    );
    return $schedules;
}

// Schedule monthly sync on plugin activation
register_activation_hook(__FILE__, 'votecraft_schedule_monthly_sync');
function votecraft_schedule_monthly_sync() {
    if (!wp_next_scheduled('votecraft_monthly_sync')) {
        wp_schedule_event(time(), 'monthly', 'votecraft_monthly_sync');
    }
}

// Clear schedule on deactivation
register_deactivation_hook(__FILE__, 'votecraft_clear_scheduled_sync');
function votecraft_clear_scheduled_sync() {
    wp_clear_scheduled_hook('votecraft_monthly_sync');
}

// The monthly sync action
add_action('votecraft_monthly_sync', 'votecraft_run_monthly_sync');
function votecraft_run_monthly_sync() {
    // Get list of states that already have data (only re-sync those)
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_legislators';
    $states_with_data = $wpdb->get_col("SELECT DISTINCT state FROM $table");

    if (empty($states_with_data)) {
        return; // No data to refresh
    }

    foreach ($states_with_data as $state) {
        votecraft_sync_legislators($state);
        sleep(2);
        votecraft_sync_bills($state);
        sleep(2);
    }
}

// =============================================================================
// ISSUE KEYWORDS MANAGEMENT
// =============================================================================

/**
 * Get default keywords (matches issues-data.js)
 */
function votecraft_get_default_keywords() {
    return array(
        'rcv' => array(
            'title' => 'Rank Choice Voting',
            'keywords' => array('ranked choice', 'ranked-choice', 'instant runoff', 'preferential voting', 'alternative voting', 'final five voting', 'rank the vote', 'voting method', 'voting system reform')
        ),
        'debt-profiteering' => array(
            'title' => 'Public Debt Profiteering',
            'keywords' => array('public debt', 'predatory lending', 'student debt', 'student loan', 'debt relief', 'debt collection', 'payday loan', 'loan forgiveness', 'borrower', 'consumer financial')
        ),
        'citizens-united' => array(
            'title' => "Ending Citizen's United",
            'keywords' => array('citizens united', 'campaign finance', 'dark money', 'super pac', 'political action committee', 'corporate political', 'campaign spending', 'political contribution', 'money in politics', 'disclose act', 'for the people act', 'freedom to vote', 'democracy for all', 'honest ads', 'foreign money', 'election integrity', 'voter disclosure', 'political spending', 'corporate money')
        ),
        'healthcare' => array(
            'title' => 'Universal Basic Healthcare',
            'keywords' => array('universal health', 'medicare for all', 'public option', 'medicaid expansion', 'single payer', 'affordable care', 'healthcare for all', 'drug pricing', 'prescription drug', 'health care coverage', 'health insurance')
        ),
        'scotus' => array(
            'title' => 'Supreme Court Reform',
            'keywords' => array('supreme court', 'judicial term limits', 'court expansion', 'judicial ethics', 'court reform', 'judicial accountability', 'scotus', 'justice term limit')
        ),
        'news-paywalls' => array(
            'title' => 'News Paywall Reform',
            'keywords' => array('local journalism', 'journalism funding', 'local news', 'news deserts', 'journalism tax credit', 'community news', 'newsroom', 'journalism preservation')
        )
    );
}

/**
 * Get keywords (from options or defaults)
 */
function votecraft_get_keywords() {
    $saved = get_option('votecraft_issue_keywords');
    if ($saved && is_array($saved)) {
        return $saved;
    }
    return votecraft_get_default_keywords();
}

// =============================================================================
// BILL ASSOCIATIONS MANAGEMENT
// =============================================================================

/**
 * Get bill associations
 */
function votecraft_get_bill_associations() {
    $saved = get_option('votecraft_bill_associations');
    if ($saved && is_array($saved)) {
        return $saved;
    }
    return array();
}

/**
 * Bill associations admin page
 */
function votecraft_bill_associations_admin_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $keywords = votecraft_get_keywords();
    $associations = votecraft_get_bill_associations();

    // Handle form submission - Add new association
    if (isset($_POST['votecraft_add_association']) && check_admin_referer('votecraft_associations_nonce')) {
        $legislator_name = sanitize_text_field($_POST['legislator_name'] ?? '');
        $issue_id = sanitize_text_field($_POST['issue_id'] ?? '');
        $bill_id = sanitize_text_field($_POST['bill_id'] ?? '');
        $bill_title = sanitize_text_field($_POST['bill_title'] ?? '');
        $bill_url = esc_url_raw($_POST['bill_url'] ?? '');

        if ($legislator_name && $issue_id && $bill_id) {
            if (!isset($associations[$legislator_name])) {
                $associations[$legislator_name] = array();
            }
            if (!isset($associations[$legislator_name][$issue_id])) {
                $associations[$legislator_name][$issue_id] = array();
            }

            // Add the bill
            $associations[$legislator_name][$issue_id][] = array(
                'id' => $bill_id,
                'title' => $bill_title,
                'url' => $bill_url
            );

            update_option('votecraft_bill_associations', $associations);
            echo '<div class="notice notice-success is-dismissible"><p>Bill association added successfully!</p></div>';
        } else {
            echo '<div class="notice notice-error is-dismissible"><p>Please fill in all required fields.</p></div>';
        }
    }

    // Handle delete association
    if (isset($_POST['votecraft_delete_association']) && check_admin_referer('votecraft_associations_nonce')) {
        $delete_legislator = sanitize_text_field($_POST['delete_legislator'] ?? '');
        $delete_issue = sanitize_text_field($_POST['delete_issue'] ?? '');
        $delete_index = intval($_POST['delete_index'] ?? -1);

        if ($delete_legislator && $delete_issue && $delete_index >= 0) {
            if (isset($associations[$delete_legislator][$delete_issue][$delete_index])) {
                array_splice($associations[$delete_legislator][$delete_issue], $delete_index, 1);

                // Clean up empty arrays
                if (empty($associations[$delete_legislator][$delete_issue])) {
                    unset($associations[$delete_legislator][$delete_issue]);
                }
                if (empty($associations[$delete_legislator])) {
                    unset($associations[$delete_legislator]);
                }

                update_option('votecraft_bill_associations', $associations);
                echo '<div class="notice notice-info is-dismissible"><p>Bill association removed.</p></div>';
            }
        }
    }

    // Refresh associations after any changes
    $associations = votecraft_get_bill_associations();
    ?>
    <div class="wrap">
        <h1>Bill Associations</h1>
        <p>Manage bill-legislator associations and curate which bills appear for each issue.</p>

        <h2>View & Manage Keyword Matches</h2>
        <p>Look up bills matched for any legislator (state or federal). Search from your synced database.</p>

        <?php
        // Search for legislators in local database
        global $wpdb;
        $legislators_table = $wpdb->prefix . 'votecraft_legislators';
        $search_results = array();
        $selected_legislator = null;
        $search_term = isset($_POST['search_name']) ? sanitize_text_field($_POST['search_name']) : '';
        $selected_legislator_id = isset($_POST['legislator_id']) ? sanitize_text_field($_POST['legislator_id']) : '';

        // If we have a search term, find matching legislators
        if ($search_term) {
            $search_results = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM $legislators_table WHERE name LIKE %s ORDER BY level DESC, name ASC LIMIT 50",
                '%' . $wpdb->esc_like($search_term) . '%'
            ));
        }

        // If a legislator was selected, get their details
        // Note: legislator ID is VARCHAR (OpenStates format), not integer
        if ($selected_legislator_id) {
            $selected_legislator = $wpdb->get_row($wpdb->prepare(
                "SELECT * FROM $legislators_table WHERE id = %s",
                $selected_legislator_id
            ));
        }
        ?>

        <!-- Step 1: Search for legislator -->
        <form method="post" action="">
            <?php wp_nonce_field('votecraft_associations_nonce'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="search_name">Search Legislator</label></th>
                    <td>
                        <input type="text" name="search_name" id="search_name" class="regular-text"
                               placeholder="e.g., Cynthia Creem or Elizabeth Warren"
                               value="<?php echo esc_attr($search_term); ?>">
                        <input type="submit" name="votecraft_search_legislator" class="button" value="Search Database">
                        <p class="description">Search for legislators in your synced database (both state and federal)</p>
                    </td>
                </tr>
            </table>
        </form>

        <?php if (!empty($search_results)): ?>
        <!-- Step 2: Select from search results -->
        <div style="background: #f9f9f9; padding: 15px; margin: 15px 0; border: 1px solid #ddd; border-radius: 4px;">
            <h3 style="margin-top: 0;">Search Results (<?php echo count($search_results); ?> found)</h3>
            <form method="post" action="">
                <?php wp_nonce_field('votecraft_associations_nonce'); ?>
                <input type="hidden" name="search_name" value="<?php echo esc_attr($search_term); ?>">
                <table class="widefat" style="margin-bottom: 15px;">
                    <thead>
                        <tr>
                            <th style="width: 30px;"></th>
                            <th>Name</th>
                            <th>Level</th>
                            <th>State</th>
                            <th>Office</th>
                            <th>Party</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($search_results as $leg): ?>
                        <tr>
                            <td>
                                <input type="radio" name="legislator_id" value="<?php echo esc_attr($leg->id); ?>"
                                       <?php checked($selected_legislator_id, $leg->id); ?>>
                            </td>
                            <td><strong><?php echo esc_html($leg->name); ?></strong></td>
                            <td>
                                <?php if ($leg->level === 'congress'): ?>
                                    <span style="background: #0073aa; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">FEDERAL</span>
                                <?php elseif ($leg->level === 'state'): ?>
                                    <span style="background: #46b450; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;">STATE</span>
                                <?php else: ?>
                                    <span style="background: #666; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px;"><?php echo esc_html(strtoupper($leg->level ?: 'unknown')); ?></span>
                                <?php endif; ?>
                            </td>
                            <td><?php echo esc_html($leg->state); ?></td>
                            <td><?php echo esc_html($leg->office ?: $leg->chamber); ?></td>
                            <td><?php echo esc_html($leg->party); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
                <input type="submit" name="votecraft_lookup_bills" class="button button-primary" value="Look Up Bills for Selected Legislator">
            </form>
        </div>
        <?php elseif ($search_term && empty($search_results)): ?>
        <div class="notice notice-warning" style="margin: 15px 0;">
            <p>No legislators found matching "<strong><?php echo esc_html($search_term); ?></strong>" in your database. Make sure you've synced legislator data.</p>
        </div>
        <?php endif; ?>

        <?php
        // Track the looked-up legislator name for pre-filling forms
        $looked_up_legislator = '';

        // Get excluded bills
        $excluded_bills = get_option('votecraft_excluded_bills', array());

        // Handle exclude bill action
        if (isset($_POST['votecraft_exclude_bill']) && check_admin_referer('votecraft_associations_nonce')) {
            $exc_legislator = sanitize_text_field($_POST['exc_legislator'] ?? '');
            $exc_issue = sanitize_text_field($_POST['exc_issue'] ?? '');
            $exc_bill_id = sanitize_text_field($_POST['exc_bill_id'] ?? '');
            $looked_up_legislator = $exc_legislator; // Remember for form pre-fill

            if ($exc_legislator && $exc_issue && $exc_bill_id) {
                if (!isset($excluded_bills[$exc_legislator])) {
                    $excluded_bills[$exc_legislator] = array();
                }
                if (!isset($excluded_bills[$exc_legislator][$exc_issue])) {
                    $excluded_bills[$exc_legislator][$exc_issue] = array();
                }
                if (!in_array($exc_bill_id, $excluded_bills[$exc_legislator][$exc_issue])) {
                    $excluded_bills[$exc_legislator][$exc_issue][] = $exc_bill_id;
                    update_option('votecraft_excluded_bills', $excluded_bills);
                    echo '<div class="notice notice-success is-dismissible"><p>Bill excluded from ' . esc_html($exc_issue) . '. Click "Look Up Bills" to refresh results.</p></div>';
                }
            }
        }

        // Handle restore bill action
        if (isset($_POST['votecraft_restore_bill']) && check_admin_referer('votecraft_associations_nonce')) {
            $rest_legislator = sanitize_text_field($_POST['rest_legislator'] ?? '');
            $rest_issue = sanitize_text_field($_POST['rest_issue'] ?? '');
            $rest_bill_id = sanitize_text_field($_POST['rest_bill_id'] ?? '');
            $looked_up_legislator = $rest_legislator; // Remember for form pre-fill

            if ($rest_legislator && $rest_issue && $rest_bill_id) {
                if (isset($excluded_bills[$rest_legislator][$rest_issue])) {
                    $key = array_search($rest_bill_id, $excluded_bills[$rest_legislator][$rest_issue]);
                    if ($key !== false) {
                        array_splice($excluded_bills[$rest_legislator][$rest_issue], $key, 1);
                        if (empty($excluded_bills[$rest_legislator][$rest_issue])) {
                            unset($excluded_bills[$rest_legislator][$rest_issue]);
                        }
                        if (empty($excluded_bills[$rest_legislator])) {
                            unset($excluded_bills[$rest_legislator]);
                        }
                        update_option('votecraft_excluded_bills', $excluded_bills);
                        echo '<div class="notice notice-info is-dismissible"><p>Bill restored.</p></div>';
                    }
                }
            }
        }

        // Refresh excluded bills
        $excluded_bills = get_option('votecraft_excluded_bills', array());

        // Handle bill lookup - show accordion by issue
        if (isset($_POST['votecraft_lookup_bills']) && check_admin_referer('votecraft_associations_nonce')) {
            $legislator_id = sanitize_text_field($_POST['legislator_id'] ?? '');

            // Get the selected legislator from the database
            // Note: legislator ID is VARCHAR (OpenStates ID like ocd-person/...), not integer
            $lookup_legislator = null;
            if ($legislator_id) {
                $lookup_legislator = $wpdb->get_row($wpdb->prepare(
                    "SELECT * FROM $legislators_table WHERE id = %s",
                    $legislator_id
                ));
            }

            if ($lookup_legislator) {
                $lookup_name = $lookup_legislator->name;
                $lookup_state = $lookup_legislator->state;
                $lookup_level = $lookup_legislator->level;
                // For state legislators, the id IS the OpenStates ID (ocd-person/...)
                $openstates_id = $lookup_legislator->id;

                // Route to correct API based on legislator level
                if ($lookup_level === 'congress') {
                    // Federal legislator - use Congress.gov API
                    $all_matched = votecraft_lookup_congress_bills_by_issue($lookup_name, $keywords, $lookup_state);
                    $api_source = 'Congress.gov API';
                } else {
                    // State legislator - use local database (synced from OpenStates)
                    $all_matched = votecraft_lookup_openstates_bills_by_issue($lookup_name, $keywords, $lookup_state, $openstates_id);
                    $api_source = 'Local Database (OpenStates)';
                }

                $legislator_display = $all_matched['legislator_name'] ?? $lookup_name;
                $looked_up_legislator = $legislator_display; // Remember for form pre-fill
                $bills_by_issue = $all_matched['by_issue'] ?? array();
                $legislator_excluded = isset($excluded_bills[$legislator_display]) ? $excluded_bills[$legislator_display] : array();

                echo '<div class="lookup-results" style="margin-top: 20px;">';

                // Show level badge
                $level_badge = $lookup_level === 'congress'
                    ? ' <span style="background: #0073aa; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 8px; display: inline-block; vertical-align: middle;">FEDERAL</span>'
                    : ' <span style="background: #46b450; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; margin-left: 8px; display: inline-block; vertical-align: middle;">STATE</span>';

                // Show debug info
                $total_bills = isset($all_matched['total_bills']) ? $all_matched['total_bills'] : 0;
                $error_msg = isset($all_matched['error']) ? $all_matched['error'] : '';

                if ($error_msg) {
                    echo '<div class="notice notice-error" style="margin: 10px 0; padding: 10px;"><strong>Error:</strong> ' . esc_html($error_msg) . '</div>';
                } elseif ($total_bills > 0) {
                    echo '<p style="color: #666;">Found ' . $total_bills . ' total bills from ' . esc_html($api_source) . ', matched against issue keywords.</p>';
                }

                echo '<h3>Matched Bills for: <strong>' . esc_html($legislator_display) . '</strong>' . $level_badge . '</h3>';

                // Always show debug info
                $debug = isset($all_matched['debug']) ? $all_matched['debug'] : array();
                echo '<details style="margin-bottom: 15px; background: #f0f0f1; padding: 10px; border-radius: 4px;">';
                echo '<summary style="cursor: pointer; font-weight: 600;">Debug Info (click to expand)</summary>';
                echo '<div style="margin-top: 10px; font-size: 12px;">';
                echo '<p><strong>Data source:</strong> ' . esc_html($api_source) . '</p>';
                echo '<p><strong>Total bills fetched:</strong> ' . $total_bills . '</p>';
                if (!empty($debug)) {
                    if (isset($debug['source'])) echo '<p><strong>Source:</strong> ' . esc_html($debug['source']) . '</p>';
                    if (isset($debug['member_found'])) echo '<p><strong>Member found:</strong> ' . esc_html($debug['member_found']) . '</p>';
                    if (isset($debug['state_filter']) || isset($debug['state'])) echo '<p><strong>State:</strong> ' . esc_html($debug['state_filter'] ?? $debug['state']) . '</p>';
                    if (isset($debug['bioguideId'])) echo '<p><strong>BioguideID:</strong> ' . esc_html($debug['bioguideId']) . '</p>';
                    if (isset($debug['openstates_id'])) echo '<p><strong>OpenStates ID:</strong> ' . esc_html($debug['openstates_id']) . '</p>';
                    if (isset($debug['sponsored_status'])) echo '<p><strong>Sponsored API status:</strong> ' . esc_html($debug['sponsored_status']) . '</p>';
                    if (isset($debug['sponsored_count'])) echo '<p><strong>Sponsored bills raw:</strong> ' . esc_html($debug['sponsored_count']) . '</p>';
                    if (isset($debug['sponsored_error'])) echo '<p style="color:red;"><strong>Sponsored error:</strong> ' . esc_html($debug['sponsored_error']) . '</p>';
                    if (isset($debug['cosponsored_status'])) echo '<p><strong>Cosponsored API status:</strong> ' . esc_html($debug['cosponsored_status']) . '</p>';
                    if (isset($debug['cosponsored_count'])) echo '<p><strong>Cosponsored bills raw:</strong> ' . esc_html($debug['cosponsored_count']) . '</p>';
                    if (isset($debug['cosponsored_error'])) echo '<p style="color:red;"><strong>Cosponsored error:</strong> ' . esc_html($debug['cosponsored_error']) . '</p>';
                } else {
                    echo '<p style="color: orange;">No debug info available - this may indicate an early return in the lookup function.</p>';
                    if ($error_msg) echo '<p><strong>Error:</strong> ' . esc_html($error_msg) . '</p>';
                }
                echo '</div></details>';

                if (empty($bills_by_issue)) {
                    echo '<p>No matching bills found.</p>';
                    if ($total_bills == 0 && !$error_msg) {
                        if ($lookup_level === 'congress') {
                            echo '<p style="color: #666;">The Congress.gov API returned no bills. This could be a temporary API issue - please try again.</p>';
                        } else {
                            echo '<p style="color: #666;">No bills found in the local database. Make sure bills have been synced for ' . esc_html($lookup_state) . '.</p>';
                        }
                    } elseif ($total_bills > 0) {
                        echo '<p style="color: #666;">Bills were fetched (' . $total_bills . '), but none matched the issue keywords. Check keywords in VC Keywords.</p>';
                    }
                } else {
                    // Accordion styles
                    echo '<style>
                        .vc-accordion { border: 1px solid #c3c4c7; border-radius: 4px; margin-bottom: 10px; }
                        .vc-accordion summary { padding: 12px 15px; cursor: pointer; background: #f6f7f7; font-weight: 600; }
                        .vc-accordion summary:hover { background: #f0f0f1; }
                        .vc-accordion[open] summary { border-bottom: 1px solid #c3c4c7; }
                        .vc-accordion .acc-content { padding: 15px; background: #fff; }
                        .vc-accordion .bill-count { float: right; font-weight: normal; color: #666; }
                        .excluded-row { background: #fcf0f0 !important; }
                        .excluded-row td { color: #999; }
                    </style>';

                    foreach ($keywords as $issue_id => $issue_data) {
                        $issue_bills = isset($bills_by_issue[$issue_id]) ? $bills_by_issue[$issue_id] : array();
                        $issue_excluded = isset($legislator_excluded[$issue_id]) ? $legislator_excluded[$issue_id] : array();
                        $active_count = 0;
                        foreach ($issue_bills as $b) {
                            if (!in_array($b['billNumber'], $issue_excluded)) $active_count++;
                        }
                        $excluded_count = count($issue_excluded);

                        echo '<details class="vc-accordion"' . ($active_count > 0 ? ' open' : '') . '>';
                        echo '<summary>' . esc_html($issue_data['title']);
                        echo '<span class="bill-count">' . $active_count . ' active' . ($excluded_count > 0 ? ', ' . $excluded_count . ' excluded' : '') . '</span>';
                        echo '</summary>';
                        echo '<div class="acc-content">';

                        if (empty($issue_bills) && empty($issue_excluded)) {
                            echo '<p style="color: #666; font-style: italic;">No bills matched for this issue.</p>';
                        } else {
                            echo '<table class="wp-list-table widefat fixed striped">';
                            echo '<thead><tr><th style="width:100px;">Bill</th><th>Title</th><th style="width:80px;">Type</th><th style="width:100px;">Action</th></tr></thead>';
                            echo '<tbody>';

                            // Show active bills
                            foreach ($issue_bills as $bill) {
                                $is_excluded = in_array($bill['billNumber'], $issue_excluded);
                                if ($is_excluded) continue; // Show excluded separately

                                $bill_url = !empty($bill['url']) ? $bill['url'] : '#';
                                echo '<tr>';
                                echo '<td><a href="' . esc_url($bill_url) . '" target="_blank">' . esc_html($bill['billNumber']) . '</a></td>';
                                echo '<td>' . esc_html(substr($bill['title'], 0, 100)) . (strlen($bill['title']) > 100 ? '...' : '') . '</td>';
                                echo '<td>' . esc_html($bill['sponsorshipType']) . '</td>';
                                echo '<td>';
                                echo '<form method="post" style="display:inline;">';
                                wp_nonce_field('votecraft_associations_nonce');
                                echo '<input type="hidden" name="legislator_id" value="' . esc_attr($legislator_id) . '">';
                                echo '<input type="hidden" name="search_name" value="' . esc_attr($search_term) . '">';
                                echo '<input type="hidden" name="exc_legislator" value="' . esc_attr($legislator_display) . '">';
                                echo '<input type="hidden" name="exc_issue" value="' . esc_attr($issue_id) . '">';
                                echo '<input type="hidden" name="exc_bill_id" value="' . esc_attr($bill['billNumber']) . '">';
                                echo '<input type="submit" name="votecraft_exclude_bill" class="button button-small" value="Exclude" onclick="return confirm(\'Exclude this bill from ' . esc_js($issue_data['title']) . '?\');">';
                                echo '</form>';
                                echo '</td>';
                                echo '</tr>';
                            }

                            // Show excluded bills (greyed out with restore option)
                            foreach ($issue_bills as $bill) {
                                $is_excluded = in_array($bill['billNumber'], $issue_excluded);
                                if (!$is_excluded) continue;

                                $bill_url = !empty($bill['url']) ? $bill['url'] : '#';
                                echo '<tr class="excluded-row">';
                                echo '<td><del>' . esc_html($bill['billNumber']) . '</del></td>';
                                echo '<td><del>' . esc_html(substr($bill['title'], 0, 100)) . '</del></td>';
                                echo '<td>' . esc_html($bill['sponsorshipType']) . '</td>';
                                echo '<td>';
                                echo '<form method="post" style="display:inline;">';
                                wp_nonce_field('votecraft_associations_nonce');
                                echo '<input type="hidden" name="legislator_id" value="' . esc_attr($legislator_id) . '">';
                                echo '<input type="hidden" name="search_name" value="' . esc_attr($search_term) . '">';
                                echo '<input type="hidden" name="rest_legislator" value="' . esc_attr($legislator_display) . '">';
                                echo '<input type="hidden" name="rest_issue" value="' . esc_attr($issue_id) . '">';
                                echo '<input type="hidden" name="rest_bill_id" value="' . esc_attr($bill['billNumber']) . '">';
                                echo '<input type="submit" name="votecraft_restore_bill" class="button button-small" value="Restore">';
                                echo '</form>';
                                echo '</td>';
                                echo '</tr>';
                            }

                            // Show excluded bills that aren't in current results (from previous lookups)
                            foreach ($issue_excluded as $exc_bill_id) {
                                $found_in_current = false;
                                foreach ($issue_bills as $b) {
                                    if ($b['billNumber'] === $exc_bill_id) { $found_in_current = true; break; }
                                }
                                if (!$found_in_current) {
                                    echo '<tr class="excluded-row">';
                                    echo '<td><del>' . esc_html($exc_bill_id) . '</del></td>';
                                    echo '<td><em style="color:#999;">Previously excluded</em></td>';
                                    echo '<td>-</td>';
                                    echo '<td>';
                                    echo '<form method="post" style="display:inline;">';
                                    wp_nonce_field('votecraft_associations_nonce');
                                    echo '<input type="hidden" name="legislator_id" value="' . esc_attr($legislator_id) . '">';
                                    echo '<input type="hidden" name="search_name" value="' . esc_attr($search_term) . '">';
                                    echo '<input type="hidden" name="rest_legislator" value="' . esc_attr($legislator_display) . '">';
                                    echo '<input type="hidden" name="rest_issue" value="' . esc_attr($issue_id) . '">';
                                    echo '<input type="hidden" name="rest_bill_id" value="' . esc_attr($exc_bill_id) . '">';
                                    echo '<input type="submit" name="votecraft_restore_bill" class="button button-small" value="Restore">';
                                    echo '</form>';
                                    echo '</td>';
                                    echo '</tr>';
                                }
                            }

                            echo '</tbody></table>';
                        }
                        echo '</div></details>';
                    }
                }
                echo '</div>';
            } else {
                echo '<div class="notice notice-warning"><p>Please select a legislator from the search results first.</p></div>';
            }
        }
        ?>

        <hr>

        <h2>Current Associations</h2>
        <?php if (empty($associations)): ?>
            <p>No bill associations have been added yet.</p>
        <?php else: ?>
            <table class="wp-list-table widefat fixed striped">
                <thead>
                    <tr>
                        <th>Legislator</th>
                        <th>Issue</th>
                        <th>Bill ID</th>
                        <th>Bill Title</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($associations as $legislator => $issues): ?>
                        <?php foreach ($issues as $issue_id => $bills): ?>
                            <?php foreach ($bills as $index => $bill): ?>
                            <tr>
                                <td><?php echo esc_html($legislator); ?></td>
                                <td><?php echo esc_html($keywords[$issue_id]['title'] ?? $issue_id); ?></td>
                                <td>
                                    <?php if (!empty($bill['url'])): ?>
                                        <a href="<?php echo esc_url($bill['url']); ?>" target="_blank"><?php echo esc_html($bill['id']); ?></a>
                                    <?php else: ?>
                                        <?php echo esc_html($bill['id']); ?>
                                    <?php endif; ?>
                                </td>
                                <td><?php echo esc_html($bill['title'] ?: '-'); ?></td>
                                <td>
                                    <form method="post" action="" style="display:inline;">
                                        <?php wp_nonce_field('votecraft_associations_nonce'); ?>
                                        <input type="hidden" name="delete_legislator" value="<?php echo esc_attr($legislator); ?>">
                                        <input type="hidden" name="delete_issue" value="<?php echo esc_attr($issue_id); ?>">
                                        <input type="hidden" name="delete_index" value="<?php echo esc_attr($index); ?>">
                                        <input type="submit" name="votecraft_delete_association" class="button button-small" value="Remove"
                                               onclick="return confirm('Remove this association?');">
                                    </form>
                                </td>
                            </tr>
                            <?php endforeach; ?>
                        <?php endforeach; ?>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>

        <hr>

        <h2>Add Manual Association</h2>
        <p>Manually associate specific bills with legislators. These associations will appear regardless of keyword matching.</p>
        <form method="post" action="">
            <?php wp_nonce_field('votecraft_associations_nonce'); ?>

            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="legislator_name">Name *</label></th>
                    <td>
                        <input type="text" name="legislator_name" id="legislator_name" class="regular-text" required
                               placeholder="e.g., Elizabeth Warren"
                               value="<?php echo esc_attr($selected_legislator ? $selected_legislator->name : $looked_up_legislator); ?>">
                        <p class="description">Enter the legislator's name exactly as it appears in the app (e.g., "Elizabeth Warren")</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="issue_id">Issue *</label></th>
                    <td>
                        <select name="issue_id" id="issue_id" required>
                            <option value="">Select an issue...</option>
                            <?php foreach ($keywords as $id => $data): ?>
                            <option value="<?php echo esc_attr($id); ?>"><?php echo esc_html($data['title']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="bill_id">Bill ID *</label></th>
                    <td>
                        <input type="text" name="bill_id" id="bill_id" class="regular-text" required
                               placeholder="e.g., S 5048 or HR 1">
                        <p class="description">The bill identifier (e.g., "S 5048", "HR 1", "H.R. 8873")</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="bill_title">Bill Title</label></th>
                    <td>
                        <input type="text" name="bill_title" id="bill_title" class="large-text"
                               placeholder="e.g., Ranked Choice Voting Act">
                        <p class="description">Optional: The full title of the bill</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="bill_url">Bill URL</label></th>
                    <td>
                        <input type="url" name="bill_url" id="bill_url" class="large-text"
                               placeholder="e.g., https://www.congress.gov/bill/118th-congress/senate-bill/5048">
                        <p class="description">Optional: Link to the bill on Congress.gov or state legislature</p>
                    </td>
                </tr>
            </table>

            <p class="submit">
                <input type="submit" name="votecraft_add_association" class="button button-primary" value="Add Association">
            </p>
        </form>

        <hr>

        <h2>How It Works</h2>
        <ul>
            <li>Manual associations are <strong>in addition to</strong> keyword-matched bills</li>
            <li>Use this to ensure specific legislators show up for specific issues</li>
            <li>Example: Add Elizabeth Warren + "Rank Choice Voting" + "S 5048" to ensure she appears for RCV</li>
            <li>The legislator name must match exactly how it appears in the app</li>
        </ul>

        <h2>API Endpoint</h2>
        <p>Associations are served via: <code><?php echo esc_url(rest_url('votecraft/v1/bill-associations')); ?></code></p>
    </div>
    <?php
}

/**
 * Look up bills from Congress.gov for a legislator and match against issue keywords
 */
function votecraft_lookup_congress_bills($name, $issue_id, $keywords) {
    // Use the internal REST API proxy to fetch bills (same as frontend)
    $request = new WP_REST_Request('GET', '/votecraft/v1/congress');
    $request->set_param('endpoint', 'member/bills');
    $request->set_param('name', $name);
    $request->set_param('limit', '250');

    $response = rest_do_request($request);
    $data = $response->get_data();

    if ($response->is_error() || empty($data['bills'])) {
        return array();
    }

    $allBills = $data['bills'];

    // Now match bills against issue keywords
    $matchedBills = array();

    // Determine which issues to check
    $issuesToCheck = array();
    if ($issue_id && isset($keywords[$issue_id])) {
        $issuesToCheck[$issue_id] = $keywords[$issue_id];
    } else {
        $issuesToCheck = $keywords;
    }

    foreach ($allBills as $bill) {
        $title = strtolower($bill['title'] ?? '');
        // Handle policyArea - could be string or object
        $policyArea = '';
        if (isset($bill['policyArea'])) {
            if (is_array($bill['policyArea']) && isset($bill['policyArea']['name'])) {
                $policyArea = strtolower($bill['policyArea']['name']);
            } elseif (is_string($bill['policyArea'])) {
                $policyArea = strtolower($bill['policyArea']);
            }
        }

        foreach ($issuesToCheck as $issueKey => $issueData) {
            $issueKeywords = $issueData['keywords'];
            foreach ($issueKeywords as $keyword) {
                $keywordLower = strtolower($keyword);
                if (strpos($title, $keywordLower) !== false || strpos($policyArea, $keywordLower) !== false) {
                    $billNumber = $bill['billNumber'] ?? (($bill['type'] ?? '') . ' ' . ($bill['number'] ?? ''));
                    $matchedBills[] = array(
                        'billNumber' => $billNumber,
                        'title' => $bill['title'] ?? '',
                        'url' => $bill['url'] ?? '',
                        'matchedIssue' => $issueData['title'],
                        'matchedKeyword' => $keyword,
                        'sponsorshipType' => $bill['sponsorshipType'] ?? 'sponsor'
                    );
                    break 2; // Only count each bill once
                }
            }
        }
    }

    return $matchedBills;
}

/**
 * Look up bills from Congress.gov organized by issue (for accordion display)
 * @param string $name - Legislator name to search for
 * @param array $keywords - Keywords array organized by issue
 * @param string $state - Optional state code (e.g., 'MA') to filter results
 */
function votecraft_lookup_congress_bills_by_issue($name, $keywords, $state = '', $bioguide_id = '') {
    // Use the internal REST API proxy to fetch bills (same as frontend)
    // This ensures caching works and we use the same data source
    $request = new WP_REST_Request('GET', '/votecraft/v1/congress');
    $request->set_param('endpoint', 'member/bills');
    $request->set_param('name', $name);
    $request->set_param('limit', '250');
    if (!empty($bioguide_id)) {
        $request->set_param('bioguideId', $bioguide_id);
    }
    if (!empty($state)) {
        $request->set_param('state', $state);
    }

    $response = rest_do_request($request);
    $data = $response->get_data();

    // Check for errors
    if ($response->is_error()) {
        $error = $response->as_error();
        return array('success' => false, 'legislator_name' => $name, 'bills' => array(), 'by_issue' => array(), 'total_bills' => 0, 'error' => $error->get_error_message());
    }

    // Get bills from response
    $allBills = isset($data['bills']) ? $data['bills'] : array();
    $member = isset($data['member']) ? $data['member'] : null;

    // Determine legislator name
    $legislatorName = $name;
    if ($member && isset($member['name'])) {
        $legislatorName = $member['name'];
        // Normalize name to "First Last" format
        if (strpos($legislatorName, ',') !== false) {
            $parts = explode(',', $legislatorName);
            $legislatorName = trim($parts[1]) . ' ' . trim($parts[0]);
        }
    }

    if (empty($allBills)) {
        $debugMsg = 'No bills found';
        if (empty($member)) {
            $debugMsg = 'No member found matching "' . $name . '"';
            if (!empty($state)) {
                $debugMsg .= ' in state ' . $state;
            }
        }
        return array('success' => false, 'legislator_name' => $legislatorName, 'bills' => array(), 'by_issue' => array(), 'total_bills' => 0, 'error' => $debugMsg);
    }

    // Organize bills by issue
    $billsByIssue = array();

    foreach ($allBills as $bill) {
        $title = strtolower($bill['title'] ?? '');
        // Handle policyArea - could be string or object
        $policyArea = '';
        if (isset($bill['policyArea'])) {
            if (is_array($bill['policyArea']) && isset($bill['policyArea']['name'])) {
                $policyArea = strtolower($bill['policyArea']['name']);
            } elseif (is_string($bill['policyArea'])) {
                $policyArea = strtolower($bill['policyArea']);
            }
        }

        foreach ($keywords as $issueKey => $issueData) {
            // Handle both formats:
            // 1) Structured: array('rcv' => array('keywords' => array('ranked choice', ...)))
            // 2) Flat: array('ranked choice', 'instant runoff', ...)
            if (is_array($issueData) && isset($issueData['keywords'])) {
                $issueKeywords = $issueData['keywords'];
            } elseif (is_string($issueData)) {
                $issueKeywords = array($issueData);
            } else {
                continue;
            }

            foreach ($issueKeywords as $keyword) {
                $keywordLower = strtolower($keyword);
                if (strpos($title, $keywordLower) !== false || strpos($policyArea, $keywordLower) !== false) {
                    if (!isset($billsByIssue[$issueKey])) {
                        $billsByIssue[$issueKey] = array();
                    }
                    // Use billNumber from proxy response, or construct from type+number
                    $billNumber = $bill['billNumber'] ?? (($bill['type'] ?? '') . ' ' . ($bill['number'] ?? ''));
                    $billsByIssue[$issueKey][] = array(
                        'billNumber' => $billNumber,
                        'title' => $bill['title'] ?? '',
                        'url' => $bill['url'] ?? '',
                        'congress' => $bill['congress'] ?? '',
                        'type' => $bill['type'] ?? '',
                        'number' => $bill['number'] ?? '',
                        'latestAction' => $bill['latestAction'] ?? null,
                        'policyArea' => $bill['policyArea'] ?? null,
                        'matchedKeyword' => $keyword,
                        'sponsorshipType' => $bill['sponsorshipType'] ?? 'sponsor'
                    );
                    break; // Only add to this issue once, but continue to other issues
                }
            }
        }
    }

    // Flatten all matched bills into one array (dedup by billNumber)
    $allMatchedBills = array();
    $seenBills = array();
    foreach ($billsByIssue as $bills) {
        foreach ($bills as $bill) {
            if (!isset($seenBills[$bill['billNumber']])) {
                $seenBills[$bill['billNumber']] = true;
                $allMatchedBills[] = $bill;
            }
        }
    }

    return array(
        'success' => true,
        'legislator_name' => $legislatorName,
        'bills' => $allMatchedBills,
        'by_issue' => $billsByIssue,
        'total_bills' => count($allBills)
    );
}

/**
 * Look up bills for a state legislator from local database and match to issues
 */
function votecraft_lookup_openstates_bills_by_issue($legislator_name, $keywords, $state = '', $openstates_id = '') {
    // Query bills from local database only - no external API calls
    // Checks: 1) Synced tables (bills + sponsorships), 2) Cache table (stored API responses)
    global $wpdb;

    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';
    $cache_table = $wpdb->prefix . 'votecraft_cache';

    $allBills = array();
    $debug = array(
        'source' => 'local_database',
        'state' => $state,
        'openstates_id' => $openstates_id,
        'legislator_name' => $legislator_name
    );

    // Convert state name to jurisdiction for cache lookups
    $jurisdiction = votecraft_state_to_jurisdiction($state);

    // For each issue, search bills by keyword
    foreach ($keywords as $issueKey => $issueData) {
        $issueKeywords = $issueData['keywords'];

        foreach ($issueKeywords as $keyword) {
            // First try: Search synced bills/sponsorships tables
            // Search actual bill content only (not issue_id — that stores the search keyword, not bill content)
            $like_kw = '%' . $wpdb->esc_like($keyword) . '%';
            $bills = $wpdb->get_results($wpdb->prepare(
                "SELECT b.*, s.legislator_name as sponsor_name, s.legislator_id, s.sponsorship_type, s.classification
                 FROM $bills_table b
                 INNER JOIN $sponsorships_table s ON b.id = s.bill_id
                 WHERE b.state = %s
                 AND (b.title LIKE %s OR b.subjects LIKE %s OR b.abstract LIKE %s)
                 AND (s.legislator_id = %s OR s.legislator_name LIKE %s)
                 ORDER BY b.latest_action_date DESC
                 LIMIT 50",
                $state,
                $like_kw, $like_kw, $like_kw,
                $openstates_id,
                '%' . $wpdb->esc_like($legislator_name) . '%'
            ));

            // Process synced table results - validate keyword matches with word boundaries
            foreach ($bills as $bill) {
                $keywordPattern = '/\b' . preg_quote(strtolower($keyword), '/') . '\b/i';
                $titleMatches = preg_match($keywordPattern, strtolower($bill->title));
                $subjectsMatch = preg_match($keywordPattern, strtolower($bill->subjects ?? ''));
                $abstractMatch = preg_match($keywordPattern, strtolower($bill->abstract ?? ''));

                if (!$titleMatches && !$subjectsMatch && !$abstractMatch) {
                    continue; // Skip false positive matches
                }

                $billId = $bill->identifier;
                $exists = false;
                foreach ($allBills as $existing) {
                    if ($existing['billNumber'] === $billId && $existing['issue'] === $issueKey) {
                        $exists = true;
                        break;
                    }
                }
                if (!$exists) {
                    $sponsorshipType = 'sponsor';
                    if ($bill->sponsorship_type === 'primary' || $bill->classification === 'primary') {
                        $sponsorshipType = 'primary';
                    } elseif ($bill->sponsorship_type === 'cosponsor' || $bill->classification === 'cosponsor') {
                        $sponsorshipType = 'cosponsor';
                    }

                    $allBills[] = array(
                        'billNumber' => $billId,
                        'title' => $bill->title,
                        'url' => $bill->openstates_url ?: 'https://openstates.org/' . strtolower($state) . '/bills/' . ($bill->session ?: '') . '/' . urlencode($billId),
                        'matchedKeyword' => $keyword,
                        'sponsorshipType' => $sponsorshipType,
                        'issue' => $issueKey,
                        'source' => 'sync_table'
                    );
                }
            }

            // Second try: Search cache table for stored API responses
            // Cache keys are MD5 hashes, so we search response_data for the keyword
            // Search for cached responses that contain this keyword in the JSON
            $cached_responses = $wpdb->get_results($wpdb->prepare(
                "SELECT response_data FROM $cache_table
                 WHERE endpoint = 'bills'
                 AND response_data LIKE %s
                 ORDER BY created_at DESC
                 LIMIT 20",
                '%' . $wpdb->esc_like($keyword) . '%'
            ));

            foreach ($cached_responses as $cached) {
                $data = json_decode($cached->response_data, true);

                // Handle different response formats: 'results' array or 'bills' array
                $billsArray = array();
                if (isset($data['results']) && is_array($data['results'])) {
                    $billsArray = $data['results'];
                } elseif (isset($data['bills']) && is_array($data['bills'])) {
                    $billsArray = $data['bills'];
                } else {
                    continue;
                }

                foreach ($billsArray as $bill) {
                    // Check if this bill matches the keyword as a whole phrase (not partial words)
                    $title = isset($bill['title']) ? strtolower($bill['title']) : '';
                    $identifier = isset($bill['identifier']) ? strtolower($bill['identifier']) : '';
                    $keywordLower = strtolower($keyword);

                    // Use word boundary matching to avoid false positives like "dark-sky" matching "dark money"
                    // For multi-word keywords, require the full phrase to match
                    $keywordPattern = '/\b' . preg_quote($keywordLower, '/') . '\b/i';
                    $titleMatches = preg_match($keywordPattern, $title);
                    $identifierMatches = preg_match($keywordPattern, $identifier);

                    if (!$titleMatches && !$identifierMatches) {
                        continue;
                    }

                    // Check if legislator sponsors this bill
                    $sponsorships = isset($bill['sponsorships']) ? $bill['sponsorships'] : array();
                    $isSponsored = false;
                    $sponsorshipType = 'sponsor';

                    // Extract last name for matching (handles "Cynthia Creem" -> "Creem")
                    $nameParts = explode(' ', $legislator_name);
                    $lastName = end($nameParts);

                    foreach ($sponsorships as $sponsor) {
                        $sponsorName = isset($sponsor['name']) ? $sponsor['name'] : '';
                        $sponsorId = isset($sponsor['person']['id']) ? $sponsor['person']['id'] : '';

                        // Match by OpenStates ID, full name, or last name
                        if (($openstates_id && $sponsorId === $openstates_id) ||
                            stripos($sponsorName, $legislator_name) !== false ||
                            stripos($legislator_name, $sponsorName) !== false ||
                            stripos($sponsorName, $lastName) !== false) {
                            $isSponsored = true;
                            $sponsorshipType = (isset($sponsor['primary']) && $sponsor['primary']) ? 'primary' : 'cosponsor';
                            break;
                        }
                    }

                    if ($isSponsored) {
                        $billId = $bill['identifier'] ?? '';
                        $exists = false;
                        foreach ($allBills as $existing) {
                            if ($existing['billNumber'] === $billId && $existing['issue'] === $issueKey) {
                                $exists = true;
                                break;
                            }
                        }
                        if (!$exists) {
                            $allBills[] = array(
                                'billNumber' => $billId,
                                'title' => $bill['title'] ?? '',
                                'url' => $bill['openstates_url'] ?? 'https://openstates.org/' . strtolower($state) . '/bills/' . ($bill['session'] ?? '') . '/' . urlencode($billId),
                                'matchedKeyword' => $keyword,
                                'sponsorshipType' => $sponsorshipType,
                                'issue' => $issueKey,
                                'source' => 'cache_table'
                            );
                        }
                    }
                }
            }
        }
    }

    // Organize bills by issue
    $billsByIssue = array();
    foreach ($allBills as $bill) {
        $issueKey = $bill['issue'];
        unset($bill['issue']); // Remove issue from bill data
        unset($bill['source']); // Remove source from bill data
        if (!isset($billsByIssue[$issueKey])) {
            $billsByIssue[$issueKey] = array();
        }
        $billsByIssue[$issueKey][] = $bill;
    }

    $debug['total_db_bills'] = count($allBills);

    return array(
        'legislator_name' => $legislator_name,
        'by_issue' => $billsByIssue,
        'total_bills' => count($allBills),
        'debug' => $debug
    );
}

/**
 * Get excluded bills
 */
function votecraft_get_excluded_bills() {
    $saved = get_option('votecraft_excluded_bills');
    if ($saved && is_array($saved)) {
        return $saved;
    }
    return array();
}

// =============================================================================
// CONGRESS.GOV SYNC FUNCTIONS
// =============================================================================

/**
 * Sync Congress members from Congress.gov API in batches
 * Fetches current members of both chambers and caches them locally
 * Uses progress tracking to allow resuming and prevent timeouts
 */
function votecraft_sync_congress_members($batch_size = 50) {
    global $wpdb;

    // Check if we're rate limited
    if (votecraft_is_congress_rate_limited()) {
        return array(
            'synced' => 0,
            'errors' => array('⚠️ RATE LIMIT - Congress.gov rate limit hit. Waiting 1 hour before retrying.'),
            'progress' => get_option('votecraft_congress_sync_progress', array())
        );
    }

    $apiKey = 'hAwu5fqahUrcpjdzEJpsPzMleub3epvnX64pmBNV';
    $baseUrl = 'https://api.congress.gov/v3';

    // Get current progress
    $progress = get_option('votecraft_congress_sync_progress', array(
        'chamber' => 'senate',  // 'senate' or 'house'
        'offset' => 0,
        'total_synced' => 0,
        'completed' => false,
        'last_run' => null
    ));

    // Reset daily counter if new day
    if (!isset($progress['api_calls_today'])) $progress['api_calls_today'] = 0;
    if (!isset($progress['last_reset_date'])) $progress['last_reset_date'] = gmdate('Y-m-d');
    if ($progress['last_reset_date'] !== gmdate('Y-m-d')) {
        $progress['api_calls_today'] = 0;
        $progress['last_reset_date'] = gmdate('Y-m-d');
    }

    // If completed, reset for new sync
    if ($progress['completed']) {
        $progress = array(
            'chamber' => 'senate',
            'offset' => 0,
            'total_synced' => 0,
            'completed' => false,
            'last_run' => null,
            'api_calls_today' => $progress['api_calls_today'],
            'last_reset_date' => $progress['last_reset_date']
        );
    }

    $synced = 0;
    $errors = array();
    $chamber = $progress['chamber'];
    $offset = $progress['offset'];
    $table = $wpdb->prefix . 'votecraft_legislators';

    // Fetch one batch
    $url = $baseUrl . '/member?api_key=' . $apiKey . '&format=json&limit=' . $batch_size . '&offset=' . $offset;
    $url .= '&chamber=' . $chamber . '&currentMember=true';

    $response = wp_remote_get($url, array('timeout' => 30));
    votecraft_track_congress_api_call();

    if (is_wp_error($response)) {
        $errors[] = ucfirst($chamber) . ': ' . $response->get_error_message();
    } else {
        $status_code = wp_remote_retrieve_response_code($response);
        $raw_body = wp_remote_retrieve_body($response);

        // Check for rate limiting
        if (votecraft_parse_congress_rate_limit($raw_body, $status_code)) {
            votecraft_set_congress_rate_limited();
            return array(
                'synced' => 0,
                'errors' => array('⚠️ RATE LIMIT HIT - Congress.gov rate limit exceeded. Waiting 1 hour.'),
                'progress' => $progress
            );
        }

        $body = json_decode($raw_body, true);
        $members = isset($body['members']) ? $body['members'] : array();

        foreach ($members as $member) {
            $bioguideId = $member['bioguideId'] ?? '';
            $name = $member['name'] ?? '';
            $state = $member['state'] ?? '';
            $party = $member['partyName'] ?? '';
            $district = $member['district'] ?? null;

            // Normalize name to "First Last" format
            if (strpos($name, ',') !== false) {
                $parts = explode(',', $name);
                $name = trim($parts[1]) . ' ' . trim($parts[0]);
            }

            $office = ($chamber === 'senate') ? 'U.S. Senator' : 'U.S. Representative';

            // Upsert into legislators table
            $congress_id = 'congress-' . $bioguideId;
            $existing = $wpdb->get_var($wpdb->prepare(
                "SELECT id FROM $table WHERE id = %s",
                $congress_id
            ));

            $data = array(
                'id' => $congress_id,
                'name' => $name,
                'party' => $party,
                'state' => $state,
                'chamber' => $chamber,
                'district' => $district,
                'current_role' => json_encode(array('title' => $office, 'org_classification' => $chamber)),
                'level' => 'congress',
                'photo_url' => $member['depiction']['imageUrl'] ?? null,
                'raw_data' => json_encode($member),
                'updated_at' => gmdate('Y-m-d H:i:s')
            );

            if ($existing) {
                $wpdb->update($table, $data, array('id' => $congress_id));
            } else {
                $wpdb->insert($table, $data);
            }

            $synced++;
        }

        // Update progress
        if (count($members) < $batch_size) {
            // This chamber is done, move to next or complete
            if ($chamber === 'senate') {
                $progress['chamber'] = 'house';
                $progress['offset'] = 0;
            } else {
                $progress['completed'] = true;
            }
        } else {
            $progress['offset'] = $offset + $batch_size;
        }
    }

    $progress['total_synced'] += $synced;
    $progress['last_run'] = gmdate('Y-m-d H:i:s');
    update_option('votecraft_congress_sync_progress', $progress);

    // Log the sync
    $log_table = $wpdb->prefix . 'votecraft_sync_log';
    $wpdb->insert($log_table, array(
        'sync_type' => 'congress_batch',
        'state' => 'Federal (' . ucfirst($chamber) . ')',
        'status' => empty($errors) ? 'success' : 'error',
        'records_synced' => $synced,
        'error_message' => empty($errors) ? 'Offset: ' . $offset : implode('; ', $errors),
        'started_at' => gmdate('Y-m-d H:i:s')
    ));

    if (!empty($errors)) {
        return array(
            'success' => false,
            'message' => 'Batch error: ' . implode('; ', $errors),
            'progress' => $progress
        );
    }

    if ($progress['completed']) {
        return array(
            'success' => true,
            'message' => 'Sync complete! Total: ' . $progress['total_synced'] . ' Congress members synced.',
            'progress' => $progress
        );
    }

    return array(
        'success' => true,
        'message' => 'Batch synced ' . $synced . ' ' . ucfirst($chamber) . ' members. Total so far: ' . $progress['total_synced'] . '. Click again to continue.',
        'progress' => $progress
    );
}

/**
 * Reset Congress sync progress
 */
function votecraft_reset_congress_sync_progress() {
    delete_option('votecraft_congress_sync_progress');
    return array(
        'success' => true,
        'message' => 'Congress sync progress reset. Ready to start fresh.'
    );
}

/**
 * Fetch detailed subjects (legislativeSubjects + policyArea) for a Congress bill
 * Returns array of subject strings, e.g. ["Health", "Medicare", "Prescription drugs"]
 */
function votecraft_fetch_congress_bill_subjects($congress, $type, $number) {
    $apiKey = 'hAwu5fqahUrcpjdzEJpsPzMleub3epvnX64pmBNV';
    $url = "https://api.congress.gov/v3/bill/{$congress}/" . strtolower($type) . "/{$number}/subjects?api_key={$apiKey}&format=json";

    $response = wp_remote_get($url, array('timeout' => 10));
    if (is_wp_error($response)) return array();

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (!$body) return array();

    $subjects = array();
    if (isset($body['subjects']['policyArea']['name'])) {
        $subjects[] = $body['subjects']['policyArea']['name'];
    }
    if (isset($body['subjects']['legislativeSubjects']) && is_array($body['subjects']['legislativeSubjects'])) {
        foreach ($body['subjects']['legislativeSubjects'] as $subject) {
            if (isset($subject['name'])) {
                $subjects[] = $subject['name'];
            }
        }
    }
    return array_unique($subjects);
}

/**
 * Fetch bill summary text from Congress.gov
 * Returns plain text summary (HTML stripped), or empty string
 */
function votecraft_fetch_congress_bill_summary($congress, $type, $number) {
    $apiKey = 'hAwu5fqahUrcpjdzEJpsPzMleub3epvnX64pmBNV';
    $url = "https://api.congress.gov/v3/bill/{$congress}/" . strtolower($type) . "/{$number}/summaries?api_key={$apiKey}&format=json";

    $response = wp_remote_get($url, array('timeout' => 10));
    if (is_wp_error($response)) return '';

    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (!$body || !isset($body['summaries']) || empty($body['summaries'])) return '';

    // Get the latest summary
    $latest = end($body['summaries']);
    return strip_tags($latest['text'] ?? '');
}

/**
 * Sync issue-related bills for Congress members
 * Fetches bills for each Congress member and filters by issue keywords
 */
function votecraft_sync_congress_issue_bills($batch_size = 25) {
    global $wpdb;

    // Check if we're rate limited
    if (votecraft_is_congress_rate_limited()) {
        return array(
            'success' => false,
            'message' => '⚠️ RATE LIMIT - Congress.gov rate limit hit. Waiting 1 hour before retrying.',
            'progress' => get_option('votecraft_congress_bills_sync_progress', array())
        );
    }

    $table = $wpdb->prefix . 'votecraft_legislators';
    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';

    // Get progress
    $progress = get_option('votecraft_congress_bills_sync_progress', array(
        'offset' => 0,
        'total_synced' => 0,
        'bills_found' => 0,
        'completed' => false,
        'last_run' => null
    ));

    // Reset if completed
    if ($progress['completed']) {
        $progress = array(
            'offset' => 0,
            'total_synced' => 0,
            'bills_found' => 0,
            'completed' => false,
            'last_run' => null
        );
    }

    // Get batch of Congress members
    $members = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $table WHERE level = 'congress' ORDER BY name LIMIT %d OFFSET %d",
        $batch_size,
        $progress['offset']
    ));

    if (empty($members)) {
        $progress['completed'] = true;
        $progress['last_run'] = gmdate('Y-m-d H:i:s');
        update_option('votecraft_congress_bills_sync_progress', $progress);
        return array(
            'success' => true,
            'message' => 'Sync complete! Processed ' . $progress['total_synced'] . ' members, found ' . $progress['bills_found'] . ' issue-related bills.',
            'progress' => $progress
        );
    }

    // Get issue keywords from ISSUES_CATALOG equivalent
    $issues = votecraft_get_issues_catalog();
    $synced = 0;
    $bills_found = 0;

    foreach ($members as $member) {
        // Extract bioguideId from member id (format: "congress-{bioguideId}")
        $bioguide_id = str_replace('congress-', '', $member->id);

        // Lookup bills for this member using internal REST API
        foreach ($issues as $issue) {
            $result = votecraft_lookup_congress_bills_by_issue($member->name, $issue['billKeywords'], $member->state, $bioguide_id);
            votecraft_track_congress_api_call(2); // member lookup + bills page

            if ($result['success'] && !empty($result['bills'])) {
                foreach ($result['bills'] as $bill) {
                    $bill_number = $bill['billNumber'] ?? $bill['identifier'] ?? '';
                    if (empty($bill_number)) continue;

                    // Generate a unique bill ID for Congress bills
                    $congress_num = $bill['congress'] ?? '';
                    $bill_type = $bill['type'] ?? '';
                    $bill_num = $bill['number'] ?? '';
                    $bill_id = $congress_num ? "congress-{$congress_num}-{$bill_type}-{$bill_num}" : 'congress-' . md5($bill_number . ($bill['title'] ?? ''));

                    // Upsert bill into bills table
                    $existing_bill = $wpdb->get_var($wpdb->prepare(
                        "SELECT id FROM $bills_table WHERE id = %s",
                        $bill_id
                    ));

                    // Extract latestAction from bill data
                    $latest_action_date = null;
                    $latest_action_desc = null;
                    if (isset($bill['latestAction'])) {
                        $la = $bill['latestAction'];
                        $latest_action_date = $la['actionDate'] ?? null;
                        $latest_action_desc = $la['text'] ?? null;
                    }

                    // Fetch detailed subjects (legislativeSubjects + policyArea) from Congress.gov
                    $subjects = array();
                    $abstract = '';
                    if ($congress_num && $bill_type && $bill_num) {
                        $subjects = votecraft_fetch_congress_bill_subjects($congress_num, $bill_type, $bill_num);
                        votecraft_track_congress_api_call();
                        $abstract = votecraft_fetch_congress_bill_summary($congress_num, $bill_type, $bill_num);
                        votecraft_track_congress_api_call();
                        usleep(100000); // 100ms delay to respect rate limits
                    }

                    // Fallback to policyArea if subjects endpoint returned nothing
                    if (empty($subjects)) {
                        $policy_area = '';
                        if (isset($bill['policyArea']['name'])) {
                            $policy_area = $bill['policyArea']['name'];
                        } elseif (isset($bill['policyArea']) && is_string($bill['policyArea'])) {
                            $policy_area = $bill['policyArea'];
                        }
                        if ($policy_area) {
                            $subjects = array($policy_area);
                        }
                    }

                    $bill_data = array(
                        'id' => $bill_id,
                        'identifier' => $bill_number,
                        'title' => $bill['title'] ?? '',
                        'state' => 'Federal',
                        'session' => $congress_num ? $congress_num . 'th Congress' : null,
                        'chamber' => $bill_type ? (in_array(strtoupper($bill_type), array('S', 'SRES', 'SJRES', 'SCONRES')) ? 'upper' : 'lower') : null,
                        'subject' => $issue['id'],
                        'issue_id' => $issue['id'],
                        'subjects' => json_encode($subjects),
                        'abstract' => $abstract,
                        'latest_action_date' => $latest_action_date,
                        'latest_action_description' => $latest_action_desc,
                        'openstates_url' => $bill['url'] ?? '',
                        'raw_data' => json_encode($bill),
                        'updated_at' => gmdate('Y-m-d H:i:s')
                    );

                    if ($existing_bill) {
                        $wpdb->update($bills_table, $bill_data, array('id' => $bill_id));
                    } else {
                        $wpdb->insert($bills_table, $bill_data);
                    }

                    // Upsert sponsorship link
                    $existing_sponsorship = $wpdb->get_var($wpdb->prepare(
                        "SELECT id FROM $sponsorships_table WHERE bill_id = %s AND legislator_id = %s",
                        $bill_id, $member->id
                    ));

                    if (!$existing_sponsorship) {
                        $wpdb->insert($sponsorships_table, array(
                            'bill_id' => $bill_id,
                            'legislator_id' => $member->id,
                            'legislator_name' => $member->name,
                            'sponsorship_type' => $bill['sponsorshipType'] ?? 'sponsor',
                            'classification' => $bill['sponsorshipType'] ?? 'sponsor'
                        ));
                        $bills_found++;
                    }
                }
            }
        }
        $synced++;
    }

    // Update progress
    $progress['offset'] += count($members);
    $progress['total_synced'] += $synced;
    $progress['bills_found'] += $bills_found;
    $progress['last_run'] = gmdate('Y-m-d H:i:s');

    if (count($members) < $batch_size) {
        $progress['completed'] = true;
    }

    update_option('votecraft_congress_bills_sync_progress', $progress);

    // Log the sync
    $log_table = $wpdb->prefix . 'votecraft_sync_log';
    $wpdb->insert($log_table, array(
        'sync_type' => 'congress_bills_batch',
        'state' => 'Federal',
        'status' => 'success',
        'records_synced' => $bills_found,
        'error_message' => 'Members: ' . $synced . ', Bills: ' . $bills_found,
        'started_at' => gmdate('Y-m-d H:i:s')
    ));

    if ($progress['completed']) {
        return array(
            'success' => true,
            'message' => 'Sync complete! Processed ' . $progress['total_synced'] . ' members, found ' . $progress['bills_found'] . ' issue-related bills.',
            'progress' => $progress
        );
    }

    return array(
        'success' => true,
        'message' => 'Batch processed ' . $synced . ' members (' . $bills_found . ' bills). Total so far: ' . $progress['total_synced'] . ' members. Click again to continue.',
        'progress' => $progress
    );
}

/**
 * Get issues catalog with keywords
 */
function votecraft_get_issues_catalog() {
    return array(
        array(
            'id' => 'rcv',
            'billKeywords' => array('ranked choice', 'ranked-choice', 'ranked choice voting', 'instant runoff', 'preferential voting', 'alternative voting', 'final five voting', 'rank the vote', 'rcv', 'local option voting')
        ),
        array(
            'id' => 'debt-profiteering',
            'billKeywords' => array('public debt', 'predatory lending', 'student debt', 'student loan', 'debt relief', 'debt collection', 'payday loan', 'loan forgiveness', 'borrower', 'consumer financial')
        ),
        array(
            'id' => 'citizens-united',
            'billKeywords' => array('citizens united', 'campaign finance', 'dark money', 'super pac', 'political action committee', 'corporate political', 'campaign spending', 'political contribution', 'money in politics', 'disclose act', 'for the people act', 'freedom to vote', 'democracy for all', 'honest ads', 'foreign money', 'election integrity', 'voter disclosure', 'political spending', 'corporate money')
        ),
        array(
            'id' => 'healthcare',
            'billKeywords' => array('universal health', 'medicare for all', 'public option', 'medicaid expansion', 'single payer', 'affordable care', 'healthcare for all', 'drug pricing', 'prescription drug', 'health care coverage', 'health insurance')
        ),
        array(
            'id' => 'scotus',
            'billKeywords' => array('supreme court', 'judicial term limits', 'court expansion', 'judicial ethics', 'court reform', 'judicial accountability', 'scotus', 'justice term limit')
        ),
        array(
            'id' => 'news-paywalls',
            'billKeywords' => array('local journalism', 'journalism funding', 'local news', 'news deserts', 'journalism tax credit', 'community news', 'newsroom', 'journalism preservation')
        )
    );
}

/**
 * Refresh cache for a specific Congress member
 */
function votecraft_refresh_congress_member_cache($member_name) {
    global $wpdb;

    $cache_table = $wpdb->prefix . 'votecraft_cache';

    // Delete any cache entries for this member
    $deleted = $wpdb->query($wpdb->prepare(
        "DELETE FROM $cache_table WHERE (endpoint = 'congress' OR cache_key LIKE 'congress_%')
         AND cache_key LIKE %s",
        '%' . $wpdb->esc_like($member_name) . '%'
    ));

    if ($deleted === false) {
        return array(
            'success' => false,
            'message' => 'Database error clearing cache for "' . $member_name . '".'
        );
    }

    if ($deleted === 0) {
        // No cached entries found - try to fetch fresh data
        $request = new WP_REST_Request('GET', '/votecraft/v1/congress');
        $request->set_param('endpoint', 'member/bills');
        $request->set_param('name', $member_name);
        $request->set_param('limit', '250');
        $request->set_param('nocache', '1');

        $response = rest_do_request($request);
        $data = $response->get_data();

        if ($response->is_error()) {
            return array(
                'success' => false,
                'message' => 'Error fetching fresh data for "' . $member_name . '": ' . $response->as_error()->get_error_message()
            );
        }

        $bill_count = isset($data['bills']) ? count($data['bills']) : 0;
        return array(
            'success' => true,
            'message' => 'Fetched fresh data for "' . $member_name . '": ' . $bill_count . ' bills found and cached.'
        );
    }

    return array(
        'success' => true,
        'message' => 'Cleared ' . $deleted . ' cache entries for "' . $member_name . '". Fresh data will be fetched on next request.'
    );
}

// =============================================================================
// REST API ENDPOINTS FOR KEYWORDS AND BILL ASSOCIATIONS
// =============================================================================

add_action('rest_api_init', 'votecraft_register_rest_endpoints');
function votecraft_register_rest_endpoints() {
    // Keywords endpoint
    register_rest_route('votecraft/v1', '/keywords', array(
        'methods' => 'GET',
        'callback' => 'votecraft_get_keywords_api',
        'permission_callback' => '__return_true',
    ));

    // Bill associations endpoint
    register_rest_route('votecraft/v1', '/bill-associations', array(
        'methods' => 'GET',
        'callback' => 'votecraft_get_bill_associations_api',
        'permission_callback' => '__return_true',
    ));

    // Excluded bills endpoint
    register_rest_route('votecraft/v1', '/excluded-bills', array(
        'methods' => 'GET',
        'callback' => 'votecraft_get_excluded_bills_api',
        'permission_callback' => '__return_true',
    ));
}

function votecraft_get_keywords_api($request) {
    $keywords = votecraft_get_keywords();

    // Transform to match frontend format
    $result = array();
    foreach ($keywords as $issue_id => $issue_data) {
        $result[$issue_id] = $issue_data['keywords'];
    }

    return new WP_REST_Response($result, 200);
}

function votecraft_get_bill_associations_api($request) {
    return new WP_REST_Response(votecraft_get_bill_associations(), 200);
}

function votecraft_get_excluded_bills_api($request) {
    return new WP_REST_Response(votecraft_get_excluded_bills(), 200);
}
