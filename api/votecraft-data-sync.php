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
define('VOTECRAFT_SYNC_DB_VERSION', '1.0');

// OpenStates API key
define('VOTECRAFT_OPENSTATES_API_KEY', 'd2917281-d734-4e26-a557-eeb50ea60f78');

// Congress.gov API key (for federal legislators and bills)
// Get your free key at: https://api.congress.gov/sign-up/
define('VOTECRAFT_CONGRESS_API_KEY', 'hAwu5fqahUrcpjdzEJpsPzMleub3epvnX64pmBNV');

// Scheduled sync settings
define('VOTECRAFT_BATCH_API_CALLS', 80); // Max API calls per batch (500/day ÷ 6 runs = ~83)

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
}

// Hook the actual sync function
add_action('votecraft_scheduled_sync', 'votecraft_run_scheduled_batch');

/**
 * Run a scheduled batch sync
 * Syncs legislators and bills in rotation, tracking progress
 */
function votecraft_run_scheduled_batch() {
    // Check if scheduled sync is enabled
    if (!get_option('votecraft_scheduled_sync_enabled', false)) {
        return;
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
    if ($progress['api_calls_today'] >= 450) { // Leave buffer of 50
        return;
    }

    // All 50 states
    $states = array(
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
        'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
        'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
        'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
        'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
        'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma',
        'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
        'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
        'West Virginia', 'Wisconsin', 'Wyoming'
    );

    $batch_calls = 0;
    $max_calls = min(VOTECRAFT_BATCH_API_CALLS, 450 - $progress['api_calls_today']);

    // Log start
    $wpdb->insert($log_table, array(
        'sync_type' => 'scheduled_batch',
        'state' => 'BATCH',
        'status' => 'running',
        'started_at' => current_time('mysql')
    ));
    $log_id = $wpdb->insert_id;

    $synced_count = 0;
    $states_synced = array();

    try {
        while ($batch_calls < $max_calls && $progress['state_index'] < count($states)) {
            $state = $states[$progress['state_index']];

            if ($progress['phase'] === 'legislators') {
                // Sync legislators for this state
                $result = votecraft_sync_legislators_batch($state, $max_calls - $batch_calls);
                $batch_calls += $result['api_calls'];
                $synced_count += $result['records'];

                if ($result['complete']) {
                    $progress['phase'] = 'bills';
                    $states_synced[] = $state . ' (legislators)';
                }
            } else {
                // Sync bills for this state
                $result = votecraft_sync_bills_batch($state, $max_calls - $batch_calls);
                $batch_calls += $result['api_calls'];
                $synced_count += $result['records'];

                if ($result['complete']) {
                    $progress['phase'] = 'legislators';
                    $progress['state_index']++;
                    $progress['completed_states'][] = $state;
                    $states_synced[] = $state . ' (bills)';
                }
            }

            // Safety check
            if ($batch_calls >= $max_calls) break;
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
            'completed_at' => current_time('mysql')
        ), array('id' => $log_id));

    } catch (Exception $e) {
        update_option('votecraft_scheduled_progress', $progress);

        $wpdb->update($log_table, array(
            'status' => 'error',
            'error_message' => $e->getMessage(),
            'completed_at' => current_time('mysql')
        ), array('id' => $log_id));
    }
}

/**
 * Sync legislators for a state with API call limit
 */
function votecraft_sync_legislators_batch($state, $max_calls) {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_legislators';

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
        if ($status === 429) {
            usleep(3000000); // Wait 3 seconds on rate limit
            continue;
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
                'updated_at' => current_time('mysql')
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

    $jurisdiction = votecraft_state_to_jurisdiction($state);
    $api_calls = 0;
    $count = 0;

    // Keywords from VoteCraft issues
    $keywords = array(
        'ranked choice voting', 'instant runoff',
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
            'include' => 'sponsorships',
            'per_page' => 20,
            'apikey' => VOTECRAFT_OPENSTATES_API_KEY
        ));

        $response = wp_remote_get($url, array('timeout' => 30));
        $api_calls++;

        if (is_wp_error($response)) continue;

        $status = wp_remote_retrieve_response_code($response);
        if ($status === 429) {
            usleep(3000000);
            continue;
        }
        if ($status >= 400) continue;

        $body = json_decode(wp_remote_retrieve_body($response), true);
        if (!isset($body['results'])) continue;

        foreach ($body['results'] as $bill) {
            $bill_id = $bill['id'];
            $latest_action = isset($bill['latest_action']) ? $bill['latest_action'] : array();

            $wpdb->replace($bills_table, array(
                'id' => $bill_id,
                'identifier' => $bill['identifier'] ?? '',
                'title' => $bill['title'] ?? '',
                'state' => $state,
                'session' => $bill['session'] ?? '',
                'chamber' => $bill['from_organization']['classification'] ?? null,
                'classification' => is_array($bill['classification']) ? implode(',', $bill['classification']) : null,
                'subject' => $keyword,
                'latest_action_date' => $latest_action['date'] ?? null,
                'latest_action_description' => $latest_action['description'] ?? null,
                'openstates_url' => $bill['openstates_url'] ?? null,
                'raw_data' => json_encode($bill),
                'updated_at' => current_time('mysql')
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
    if (get_option('votecraft_sync_db_version') !== VOTECRAFT_SYNC_DB_VERSION) {
        votecraft_sync_create_tables();
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
        latest_action_date DATE,
        latest_action_description TEXT,
        openstates_url VARCHAR(500),
        raw_data LONGTEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY state_session (state, session),
        KEY subject_search (state, subject(100)),
        FULLTEXT KEY title_search (title)
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
    add_management_page(
        'VoteCraft Data Sync',
        'VoteCraft Sync',
        'manage_options',
        'votecraft-sync',
        'votecraft_sync_admin_page'
    );
}

function votecraft_sync_admin_page() {
    global $wpdb;

    // Handle form submissions
    if (isset($_POST['votecraft_sync_action']) && wp_verify_nonce($_POST['_wpnonce'], 'votecraft_sync')) {
        $action = sanitize_text_field($_POST['votecraft_sync_action']);
        $state = isset($_POST['state']) ? sanitize_text_field($_POST['state']) : null;

        if ($action === 'sync_legislators' && $state) {
            $result = votecraft_sync_legislators($state);
            echo '<div class="notice notice-' . ($result['success'] ? 'success' : 'error') . '"><p>' . esc_html($result['message']) . '</p></div>';
        } elseif ($action === 'sync_bills' && $state) {
            $result = votecraft_sync_bills($state);
            echo '<div class="notice notice-' . ($result['success'] ? 'success' : 'error') . '"><p>' . esc_html($result['message']) . '</p></div>';
        } elseif ($action === 'sync_all_legislators') {
            $result = votecraft_sync_all_legislators();
            echo '<div class="notice notice-' . ($result['success'] ? 'success' : 'error') . '"><p>' . esc_html($result['message']) . '</p></div>';
        } elseif ($action === 'sync_all_issue_bills') {
            $result = votecraft_sync_all_issue_bills();
            echo '<div class="notice notice-' . ($result['success'] ? 'success' : 'error') . '"><p>' . esc_html($result['message']) . '</p></div>';
        } elseif ($action === 'sync_all_states') {
            $result = votecraft_sync_all_states();
            echo '<div class="notice notice-' . ($result['success'] ? 'success' : 'error') . '"><p>' . esc_html($result['message']) . '</p></div>';
        } elseif ($action === 'sync_federal_legislators') {
            $result = votecraft_sync_federal_legislators();
            echo '<div class="notice notice-' . ($result['success'] ? 'success' : 'error') . '"><p>' . esc_html($result['message']) . '</p></div>';
        } elseif ($action === 'sync_federal_bills') {
            $result = votecraft_sync_federal_bills();
            echo '<div class="notice notice-' . ($result['success'] ? 'success' : 'error') . '"><p>' . esc_html($result['message']) . '</p></div>';
        } elseif ($action === 'reset_federal_bills') {
            delete_option('votecraft_federal_bills_progress');
            echo '<div class="notice notice-success"><p>Federal bills sync progress has been reset.</p></div>';
        } elseif ($action === 'enable_scheduled_sync') {
            update_option('votecraft_scheduled_sync_enabled', true);
            // Schedule if not already scheduled
            if (!wp_next_scheduled('votecraft_scheduled_sync')) {
                wp_schedule_event(time(), 'every_four_hours', 'votecraft_scheduled_sync');
            }
            echo '<div class="notice notice-success"><p>Scheduled sync enabled! Will run every 4 hours.</p></div>';
        } elseif ($action === 'disable_scheduled_sync') {
            update_option('votecraft_scheduled_sync_enabled', false);
            echo '<div class="notice notice-success"><p>Scheduled sync disabled.</p></div>';
        } elseif ($action === 'reset_scheduled_progress') {
            delete_option('votecraft_scheduled_progress');
            echo '<div class="notice notice-success"><p>Scheduled sync progress has been reset. Will start from Alabama.</p></div>';
        } elseif ($action === 'run_batch_now') {
            update_option('votecraft_scheduled_sync_enabled', true);
            votecraft_run_scheduled_batch();
            echo '<div class="notice notice-success"><p>Manual batch sync completed! Check progress below.</p></div>';
        }
    }

    // Get stats
    $legislators_table = $wpdb->prefix . 'votecraft_legislators';
    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $log_table = $wpdb->prefix . 'votecraft_sync_log';

    $legislator_count = $wpdb->get_var("SELECT COUNT(*) FROM $legislators_table");
    $federal_count = $wpdb->get_var("SELECT COUNT(*) FROM $legislators_table WHERE level = 'federal'");
    $state_leg_count = $wpdb->get_var("SELECT COUNT(*) FROM $legislators_table WHERE level = 'state' OR level IS NULL");
    $bill_count = $wpdb->get_var("SELECT COUNT(*) FROM $bills_table");
    $states_with_data = $wpdb->get_col("SELECT DISTINCT state FROM $legislators_table ORDER BY state");
    $states_with_bills = $wpdb->get_col("SELECT DISTINCT state FROM $bills_table ORDER BY state");
    $recent_syncs = $wpdb->get_results("SELECT * FROM $log_table ORDER BY started_at DESC LIMIT 10");

    // Issue keywords for counting bills
    $issue_keywords = array(
        'RCV' => array('ranked choice voting', 'instant runoff', 'preferential voting'),
        'Debt Reform' => array('public debt', 'predatory lending', 'student debt relief', 'debt transparency'),
        'Citizens United' => array('citizens united', 'campaign finance reform', 'dark money', 'political spending disclosure'),
        'Healthcare' => array('universal healthcare', 'medicare for all', 'public option', 'health coverage expansion'),
        'SCOTUS Reform' => array('supreme court reform', 'judicial term limits', 'court expansion', 'judicial ethics'),
        'News Paywalls' => array('local journalism', 'news access', 'press freedom', 'journalism funding')
    );

    // Count bills by issue and state
    $issue_stats = array();
    $issue_totals = array();
    foreach ($issue_keywords as $issue => $keywords) {
        $issue_totals[$issue] = 0;
        $like_clauses = array();
        foreach ($keywords as $kw) {
            $like_clauses[] = $wpdb->prepare("title LIKE %s", '%' . $wpdb->esc_like($kw) . '%');
            $like_clauses[] = $wpdb->prepare("subject LIKE %s", '%' . $wpdb->esc_like($kw) . '%');
        }
        $where = implode(' OR ', $like_clauses);

        // Get counts per state
        $state_counts = $wpdb->get_results(
            "SELECT state, COUNT(*) as count FROM $bills_table WHERE ($where) GROUP BY state ORDER BY state"
        );

        foreach ($state_counts as $row) {
            if (!isset($issue_stats[$row->state])) {
                $issue_stats[$row->state] = array();
            }
            $issue_stats[$row->state][$issue] = (int) $row->count;
            $issue_totals[$issue] += (int) $row->count;
        }
    }

    // State list for dropdown
    $all_states = array(
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
        'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
        'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
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
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
        'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
        'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
        'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
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

    ?>
    <div class="wrap">
        <h1>VoteCraft Data Sync</h1>

        <!-- SCHEDULED SYNC DASHBOARD -->
        <div class="card" style="max-width: 800px; margin-bottom: 20px; background: <?php echo $scheduled_enabled ? '#e7f5e7' : '#fff3cd'; ?>;">
            <h2>📅 Scheduled Sync Dashboard</h2>
            <p><strong>Status:</strong>
                <?php if ($scheduled_enabled): ?>
                    <span style="color: green; font-weight: bold;">✓ ENABLED</span> - Running every 4 hours
                <?php else: ?>
                    <span style="color: orange; font-weight: bold;">⏸ DISABLED</span>
                <?php endif; ?>
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0;">
                <div style="background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                    <h4 style="margin-top: 0;">Progress</h4>
                    <p><strong>Current State:</strong> <?php echo esc_html($current_state); ?></p>
                    <p><strong>Current Phase:</strong> <?php echo ucfirst($scheduled_progress['phase']); ?></p>
                    <p><strong>States Completed:</strong> <?php echo $completed_count; ?> / 50</p>
                    <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
                        <div style="background: #4caf50; height: 100%; width: <?php echo ($completed_count / 50) * 100; ?>%;"></div>
                    </div>
                </div>

                <div style="background: #fff; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                    <h4 style="margin-top: 0;">API Usage Today</h4>
                    <p><strong>Calls Used:</strong> <?php echo $scheduled_progress['api_calls_today']; ?> / 500</p>
                    <p><strong>Remaining:</strong> <?php echo max(0, 500 - $scheduled_progress['api_calls_today']); ?></p>
                    <div style="background: #e0e0e0; height: 20px; border-radius: 10px; overflow: hidden;">
                        <div style="background: <?php echo $scheduled_progress['api_calls_today'] > 400 ? '#ff9800' : '#2196f3'; ?>; height: 100%; width: <?php echo min(100, ($scheduled_progress['api_calls_today'] / 500) * 100); ?>%;"></div>
                    </div>
                    <p style="font-size: 0.85em; color: #666;"><strong>Next Run:</strong>
                        <?php echo $next_scheduled ? date('M j, Y g:i A', $next_scheduled) : 'Not scheduled'; ?>
                    </p>
                </div>
            </div>

            <form method="post" style="margin-top: 15px;">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <?php if ($scheduled_enabled): ?>
                    <button type="submit" name="votecraft_sync_action" value="disable_scheduled_sync" class="button">⏸ Disable Scheduled Sync</button>
                <?php else: ?>
                    <button type="submit" name="votecraft_sync_action" value="enable_scheduled_sync" class="button button-primary">▶ Enable Scheduled Sync</button>
                <?php endif; ?>
                <button type="submit" name="votecraft_sync_action" value="run_batch_now" class="button">⚡ Run Batch Now</button>
                <button type="submit" name="votecraft_sync_action" value="reset_scheduled_progress" class="button" onclick="return confirm('Reset progress? This will start syncing from Alabama again.');">🔄 Reset Progress</button>
            </form>

            <?php if (!empty($scheduled_progress['completed_states'])): ?>
            <details style="margin-top: 15px;">
                <summary style="cursor: pointer; font-weight: bold;">Completed States (<?php echo $completed_count; ?>)</summary>
                <p style="margin-top: 10px; font-size: 0.9em;">
                    <?php echo esc_html(implode(', ', $scheduled_progress['completed_states'])); ?>
                </p>
            </details>
            <?php endif; ?>
        </div>

        <!-- RECENT BATCH ACTIVITY -->
        <?php if (!empty($recent_batches)): ?>
        <div class="card" style="max-width: 800px; margin-bottom: 20px;">
            <h2>📊 Recent Batch Activity</h2>
            <table class="widefat" style="margin-top: 10px;">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Records</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($recent_batches as $batch): ?>
                    <tr>
                        <td><?php echo esc_html(date('M j, g:i A', strtotime($batch->started_at))); ?></td>
                        <td>
                            <?php if ($batch->status === 'success'): ?>
                                <span style="color: green;">✓ Success</span>
                            <?php elseif ($batch->status === 'running'): ?>
                                <span style="color: blue;">⏳ Running</span>
                            <?php else: ?>
                                <span style="color: red;">✗ Error</span>
                            <?php endif; ?>
                        </td>
                        <td><?php echo number_format($batch->records_synced); ?></td>
                        <td style="font-size: 0.85em;"><?php echo esc_html(substr($batch->error_message, 0, 100)); ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>

        <div class="card" style="max-width: 600px; margin-bottom: 20px;">
            <h2>Database Stats</h2>
            <p><strong>Total Legislators:</strong> <?php echo number_format($legislator_count); ?></p>
            <p style="margin-left: 20px;">
                <strong>Federal:</strong> <?php echo number_format($federal_count); ?> (Senators + Representatives)<br>
                <strong>State:</strong> <?php echo number_format($state_leg_count); ?>
            </p>
            <p><strong>Total Bills:</strong> <?php echo number_format($bill_count); ?></p>
            <p><strong>States with legislators:</strong> <?php echo count($states_with_data); ?></p>
            <p><strong>States with bills:</strong> <?php echo count($states_with_bills); ?></p>
        </div>

        <?php if (!empty($issue_stats)): ?>
        <div class="card" style="max-width: 100%; margin-bottom: 20px;">
            <h2>Bills by Issue</h2>
            <p>Count of synced bills matching each issue's keywords:</p>

            <!-- National Totals -->
            <h3 style="margin-top: 20px;">National Totals</h3>
            <table class="widefat" style="max-width: 600px;">
                <thead>
                    <tr>
                        <th>Issue</th>
                        <th style="text-align: right;">Bills</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($issue_totals as $issue => $count): ?>
                    <tr>
                        <td><strong><?php echo esc_html($issue); ?></strong></td>
                        <td style="text-align: right;"><?php echo number_format($count); ?></td>
                    </tr>
                    <?php endforeach; ?>
                    <tr style="background: #f0f0f0; font-weight: bold;">
                        <td>Total (all issues)</td>
                        <td style="text-align: right;"><?php echo number_format(array_sum($issue_totals)); ?></td>
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
                            <?php foreach (array_keys($issue_totals) as $issue): ?>
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
                            <?php foreach (array_keys($issue_totals) as $issue): ?>
                            <td style="text-align: right;"><?php echo isset($issues[$issue]) ? number_format($issues[$issue]) : '0'; ?></td>
                            <?php endforeach; ?>
                            <td style="text-align: right; font-weight: bold;"><?php echo number_format($state_total); ?></td>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
        <?php endif; ?>

        <div class="card" style="max-width: 600px; margin-bottom: 20px;">
            <h2>Sync Single State</h2>
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
                    <button type="submit" name="votecraft_sync_action" value="sync_legislators" class="button">
                        Sync Legislators
                    </button>
                    <button type="submit" name="votecraft_sync_action" value="sync_bills" class="button">
                        Sync Bills
                    </button>
                </p>
            </form>
        </div>

        <div class="card" style="max-width: 600px; margin-bottom: 20px;">
            <h2>Bulk Sync - All States</h2>
            <p><em>Warning: These sync all 50 states. Run during off-peak hours. Each may take 10-30 minutes.</em></p>
            <form method="post" style="margin-bottom: 15px;">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <button type="submit" name="votecraft_sync_action" value="sync_all_legislators" class="button button-primary">
                    Sync All Legislators (50 States)
                </button>
                <p class="description" style="margin-top: 5px;">Downloads ~7,000+ legislators across all states. Run this first.</p>
            </form>
            <form method="post">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <button type="submit" name="votecraft_sync_action" value="sync_all_issue_bills" class="button button-primary">
                    Sync Issue-Related Bills (50 States)
                </button>
                <p class="description" style="margin-top: 5px;">Only bills from last 5 years matching your 6 issues: RCV, Debt Reform, Citizens United, Healthcare, SCOTUS, News Paywalls.</p>
            </form>
        </div>

        <div class="card" style="max-width: 600px; margin-bottom: 20px;">
            <h2>Federal Legislators</h2>
            <p>Sync federal officials (US Senators, US Representatives) from Congress.gov API.</p>
            <form method="post">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <button type="submit" name="votecraft_sync_action" value="sync_federal_legislators" class="button button-primary">
                    Sync All Federal Legislators
                </button>
                <p class="description" style="margin-top: 5px;">Downloads ~538 current members of Congress (100 Senators + 435 Representatives + delegates). Uses Congress.gov API.</p>
            </form>
            <hr style="margin: 15px 0;">
            <?php
            $bills_progress = get_option('votecraft_federal_bills_progress', array('offset' => 0, 'bills_added' => 0));
            $bills_offset = (int) $bills_progress['offset'];
            $bills_added = (int) $bills_progress['bills_added'];
            ?>
            <form method="post" style="display: inline-block;">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <button type="submit" name="votecraft_sync_action" value="sync_federal_bills" class="button button-primary">
                    <?php echo $bills_offset > 0 ? 'Continue Federal Bills Sync' : 'Sync Federal Bills (Issue-Related)'; ?>
                </button>
            </form>
            <?php if ($bills_offset > 0): ?>
            <form method="post" style="display: inline-block; margin-left: 10px;">
                <?php wp_nonce_field('votecraft_sync'); ?>
                <button type="submit" name="votecraft_sync_action" value="reset_federal_bills" class="button">Reset Progress</button>
            </form>
            <p class="description" style="margin-top: 5px; color: #2271b1;">
                <strong>In Progress:</strong> <?php echo $bills_offset; ?> / 538 legislators processed, <?php echo $bills_added; ?> bills found so far.
            </p>
            <?php else: ?>
            <p class="description" style="margin-top: 5px;">Processes 50 legislators per click. Click multiple times until complete (~11 clicks total).</p>
            <?php endif; ?>
        </div>

        <div class="card" style="max-width: 600px; margin-bottom: 20px;">
            <h2>Your 6 Issue Keywords</h2>
            <p>Bills are filtered to match these keywords:</p>
            <ul style="margin-left: 20px;">
                <li><strong>RCV:</strong> ranked choice voting, instant runoff, preferential voting</li>
                <li><strong>Debt Reform:</strong> public debt, predatory lending, student debt relief, debt transparency</li>
                <li><strong>Citizens United:</strong> citizens united, campaign finance reform, dark money, political spending disclosure</li>
                <li><strong>Healthcare:</strong> universal healthcare, medicare for all, public option, health coverage expansion</li>
                <li><strong>SCOTUS:</strong> supreme court reform, judicial term limits, court expansion, judicial ethics</li>
                <li><strong>News Paywalls:</strong> local journalism, news access, press freedom, journalism funding</li>
            </ul>
        </div>

        <?php if (!empty($recent_syncs)): ?>
        <div class="card" style="max-width: 800px;">
            <h2>Recent Sync History</h2>
            <table class="widefat">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>State</th>
                        <th>Status</th>
                        <th>Records</th>
                        <th>Started</th>
                        <th>Error</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($recent_syncs as $sync): ?>
                    <tr>
                        <td><?php echo esc_html($sync->sync_type); ?></td>
                        <td><?php echo esc_html($sync->state ?: 'All'); ?></td>
                        <td><?php echo esc_html($sync->status); ?></td>
                        <td><?php echo number_format($sync->records_synced); ?></td>
                        <td><?php echo esc_html($sync->started_at); ?></td>
                        <td><?php echo esc_html($sync->error_message ?: '-'); ?></td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
        <?php endif; ?>
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
        'started_at' => current_time('mysql')
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
                sleep(3);
                $response = wp_remote_get($url, array('timeout' => 30));
                if (is_wp_error($response)) {
                    throw new Exception('API request failed after retry');
                }
                $status = wp_remote_retrieve_response_code($response);
                $raw_body = wp_remote_retrieve_body($response);
            }

            // Check for HTTP errors
            if ($status >= 400) {
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

            // Rate limit ourselves - 1.5 second between pages
            usleep(1500000);

        } while ($has_more && $page <= 20); // Safety limit

        // Insert/update legislators
        $count = 0;
        $skipped_federal = 0;
        foreach ($all_legislators as $leg) {
            $current_role = isset($leg['current_role']) ? $leg['current_role'] : null;

            // Skip federal legislators - they come from Congress.gov
            $role_title = $current_role ? strtolower($current_role['title'] ?? '') : '';
            $role_org = $current_role ? strtolower($current_role['org_classification'] ?? '') : '';
            $jurisdiction_id = isset($leg['jurisdiction']['id']) ? strtolower($leg['jurisdiction']['id']) : '';

            $is_federal = (
                strpos($role_title, 'u.s.') !== false ||
                strpos($role_title, 'united states') !== false ||
                strpos($role_org, 'congress') !== false ||
                strpos($jurisdiction_id, 'country:us/government') !== false
            );

            if ($is_federal) {
                $skipped_federal++;
                continue;
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
                'level' => 'state',
                'raw_data' => json_encode($leg),
                'updated_at' => current_time('mysql')
            ));
            $count++;
        }

        // Log success
        $wpdb->update($log_table, array(
            'status' => 'success',
            'records_synced' => $count,
            'completed_at' => current_time('mysql')
        ), array('id' => $log_id));

        $msg = "Synced $count legislators for $state";
        if ($skipped_federal > 0) {
            $msg .= " (skipped $skipped_federal federal legislators)";
        }
        return array('success' => true, 'message' => $msg);

    } catch (Exception $e) {
        // Log error
        $wpdb->update($log_table, array(
            'status' => 'error',
            'error_message' => $e->getMessage(),
            'completed_at' => current_time('mysql')
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

    // Keywords from VoteCraft's 6 issues
    $keywords = array(
        // RCV
        'ranked choice voting', 'instant runoff', 'preferential voting',
        // Debt Reform
        'public debt', 'predatory lending', 'student debt relief', 'debt transparency',
        // Citizens United
        'citizens united', 'campaign finance reform', 'dark money', 'political spending disclosure',
        // Healthcare
        'universal healthcare', 'medicare for all', 'public option', 'health coverage expansion',
        // SCOTUS Reform
        'supreme court reform', 'judicial term limits', 'court expansion', 'judicial ethics',
        // News Paywalls
        'local journalism', 'news access', 'press freedom', 'journalism funding'
    );

    // Only bills from last 5 years
    $five_years_ago = date('Y-m-d', strtotime('-5 years'));

    // Log start
    $wpdb->insert($log_table, array(
        'sync_type' => 'bills',
        'state' => $state,
        'status' => 'running',
        'started_at' => current_time('mysql')
    ));
    $log_id = $wpdb->insert_id;

    try {
        $all_bills = array();
        $seen_ids = array();

        // Convert state name to OpenStates jurisdiction (2-letter abbreviation)
        $jurisdiction = votecraft_state_to_jurisdiction($state);

        foreach ($keywords as $keyword) {
            // Build URL with proper encoding
            $params = array(
                'jurisdiction' => $jurisdiction,
                'q' => $keyword,
                'include' => 'sponsorships',
                'per_page' => 20,
                'sort' => 'latest_action_desc',
                'created_since' => $five_years_ago,
                'apikey' => VOTECRAFT_OPENSTATES_API_KEY
            );
            $url = 'https://v3.openstates.org/bills?' . http_build_query($params);

            $response = wp_remote_get($url, array('timeout' => 30));

            if (is_wp_error($response)) {
                continue; // Skip this keyword on error
            }

            $status = wp_remote_retrieve_response_code($response);
            if ($status === 429) {
                sleep(3); // Wait longer on rate limit
                continue;
            }

            if ($status >= 400) {
                continue; // Skip on HTTP errors
            }

            $body = json_decode(wp_remote_retrieve_body($response), true);
            if ($body && isset($body['results'])) {
                foreach ($body['results'] as $bill) {
                    if (!isset($seen_ids[$bill['id']])) {
                        $seen_ids[$bill['id']] = true;
                        $bill['_keyword'] = $keyword;
                        $all_bills[] = $bill;
                    }
                }
            }

            // Rate limit ourselves
            usleep(750000); // 0.75 second delay
        }

        // Insert/update bills and sponsorships
        $count = 0;
        foreach ($all_bills as $bill) {
            $latest_action = isset($bill['latest_action_date']) ? $bill['latest_action_date'] : null;

            $wpdb->replace($bills_table, array(
                'id' => $bill['id'],
                'identifier' => $bill['identifier'],
                'title' => $bill['title'],
                'state' => $state,
                'session' => isset($bill['session']) ? $bill['session'] : null,
                'chamber' => isset($bill['from_organization']['classification']) ? $bill['from_organization']['classification'] : null,
                'classification' => isset($bill['classification']) ? (is_array($bill['classification']) ? implode(', ', $bill['classification']) : $bill['classification']) : null,
                'subject' => $bill['_keyword'],
                'latest_action_date' => $latest_action,
                'latest_action_description' => isset($bill['latest_action_description']) ? $bill['latest_action_description'] : null,
                'openstates_url' => isset($bill['openstates_url']) ? $bill['openstates_url'] : null,
                'raw_data' => json_encode($bill),
                'updated_at' => current_time('mysql')
            ));

            // Sync sponsorships
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

        // Log success
        $wpdb->update($log_table, array(
            'status' => 'success',
            'records_synced' => $count,
            'completed_at' => current_time('mysql')
        ), array('id' => $log_id));

        return array('success' => true, 'message' => "Synced $count bills for $state");

    } catch (Exception $e) {
        // Log error
        $wpdb->update($log_table, array(
            'status' => 'error',
            'error_message' => $e->getMessage(),
            'completed_at' => current_time('mysql')
        ), array('id' => $log_id));

        return array('success' => false, 'message' => 'Error: ' . $e->getMessage());
    }
}

/**
 * Get list of all US states
 */
function votecraft_get_all_states() {
    return array(
        'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
        'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
        'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
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
        'started_at' => current_time('mysql')
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
        'completed_at' => current_time('mysql')
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
        'started_at' => current_time('mysql')
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
        'completed_at' => current_time('mysql')
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

    // Search by keyword in title or subject
    $bills = $wpdb->get_results($wpdb->prepare(
        "SELECT * FROM $bills_table
         WHERE state = %s
         AND (title LIKE %s OR subject LIKE %s)
         ORDER BY latest_action_date DESC
         LIMIT %d",
        $state,
        '%' . $wpdb->esc_like($keyword) . '%',
        '%' . $wpdb->esc_like($keyword) . '%',
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
// FEDERAL LEGISLATORS SYNC (Google Civic API)
// =============================================================================

/**
 * Sync federal legislators for all states using Google Civic API
 * Fetches US Senators and US Representatives
 */
function votecraft_sync_federal_legislators() {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_legislators';
    $log_table = $wpdb->prefix . 'votecraft_sync_log';

    // Log start
    $wpdb->insert($log_table, array(
        'sync_type' => 'federal_legislators',
        'state' => 'ALL',
        'status' => 'running',
        'started_at' => current_time('mysql')
    ));
    $log_id = $wpdb->insert_id;

    try {
        // Delete existing federal legislators first (clean sync)
        $wpdb->delete($table, array('level' => 'federal'));

        $all_members = array();
        $offset = 0;
        $limit = 250;

        // Fetch all current members of Congress (paginated)
        do {
            $url = 'https://api.congress.gov/v3/member?' . http_build_query(array(
                'currentMember' => 'true',
                'limit' => $limit,
                'offset' => $offset,
                'format' => 'json',
                'api_key' => VOTECRAFT_CONGRESS_API_KEY
            ));

            $response = wp_remote_get($url, array(
                'timeout' => 30,
                'user-agent' => 'VoteCraft/1.0'
            ));

            if (is_wp_error($response)) {
                throw new Exception('API request failed: ' . $response->get_error_message());
            }

            $status = wp_remote_retrieve_response_code($response);
            if ($status !== 200) {
                $body = wp_remote_retrieve_body($response);
                throw new Exception("API returned HTTP $status: " . substr($body, 0, 200));
            }

            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            if (!isset($data['members'])) {
                throw new Exception('Invalid API response - no members array');
            }

            $all_members = array_merge($all_members, $data['members']);
            $total_count = isset($data['pagination']['count']) ? (int)$data['pagination']['count'] : 0;
            $offset += $limit;

            // Rate limit - 200ms between requests
            usleep(200000);

        } while ($offset < $total_count && count($data['members']) === $limit);

        // State abbreviation to full name mapping
        $state_names = array_flip(array(
            'Alabama' => 'AL', 'Alaska' => 'AK', 'Arizona' => 'AZ', 'Arkansas' => 'AR',
            'California' => 'CA', 'Colorado' => 'CO', 'Connecticut' => 'CT', 'Delaware' => 'DE',
            'Florida' => 'FL', 'Georgia' => 'GA', 'Hawaii' => 'HI', 'Idaho' => 'ID',
            'Illinois' => 'IL', 'Indiana' => 'IN', 'Iowa' => 'IA', 'Kansas' => 'KS',
            'Kentucky' => 'KY', 'Louisiana' => 'LA', 'Maine' => 'ME', 'Maryland' => 'MD',
            'Massachusetts' => 'MA', 'Michigan' => 'MI', 'Minnesota' => 'MN', 'Mississippi' => 'MS',
            'Missouri' => 'MO', 'Montana' => 'MT', 'Nebraska' => 'NE', 'Nevada' => 'NV',
            'New Hampshire' => 'NH', 'New Jersey' => 'NJ', 'New Mexico' => 'NM', 'New York' => 'NY',
            'North Carolina' => 'NC', 'North Dakota' => 'ND', 'Ohio' => 'OH', 'Oklahoma' => 'OK',
            'Oregon' => 'OR', 'Pennsylvania' => 'PA', 'Rhode Island' => 'RI', 'South Carolina' => 'SC',
            'South Dakota' => 'SD', 'Tennessee' => 'TN', 'Texas' => 'TX', 'Utah' => 'UT',
            'Vermont' => 'VT', 'Virginia' => 'VA', 'Washington' => 'WA', 'West Virginia' => 'WV',
            'Wisconsin' => 'WI', 'Wyoming' => 'WY', 'District of Columbia' => 'DC',
            'American Samoa' => 'AS', 'Guam' => 'GU', 'Northern Mariana Islands' => 'MP',
            'Puerto Rico' => 'PR', 'Virgin Islands' => 'VI'
        ));

        // Insert members into database
        $count = 0;
        foreach ($all_members as $member) {
            $bioguide_id = $member['bioguideId'] ?? '';
            if (empty($bioguide_id)) continue;

            // Get state full name from abbreviation
            $state_abbrev = $member['state'] ?? '';
            $state_full = isset($state_names[$state_abbrev]) ? $state_names[$state_abbrev] : $state_abbrev;

            // Determine chamber from terms
            $chamber = 'lower'; // default to House
            $terms = $member['terms']['item'] ?? array();
            if (!empty($terms)) {
                $latest_term = end($terms);
                $chamber_name = $latest_term['chamber'] ?? '';
                if (stripos($chamber_name, 'Senate') !== false) {
                    $chamber = 'upper';
                }
            }

            // Get district (for House members)
            $district = isset($member['district']) ? (string)$member['district'] : '';

            // Get photo URL
            $photo_url = isset($member['depiction']['imageUrl']) ? $member['depiction']['imageUrl'] : null;

            // Normalize party name
            $party = $member['partyName'] ?? '';

            $legislator_data = array(
                'id' => 'congress-' . $bioguide_id,
                'name' => $member['name'] ?? '',
                'party' => $party,
                'state' => $state_full,
                'chamber' => $chamber,
                'district' => $district,
                'photo_url' => $photo_url,
                'email' => null, // Will be fetched from detail endpoint if needed
                'current_role' => json_encode(array(
                    'title' => $chamber === 'upper' ? 'U.S. Senator' : 'U.S. Representative',
                    'org_classification' => $chamber,
                    'district' => $district
                )),
                'jurisdiction_id' => 'ocd-jurisdiction/country:us/government',
                'level' => 'federal',
                'raw_data' => json_encode(array(
                    'bioguideId' => $bioguide_id,
                    'name' => $member['name'] ?? '',
                    'party' => $party,
                    'state' => $state_abbrev,
                    'state_full' => $state_full,
                    'district' => $district,
                    'image' => $photo_url,
                    'terms' => $terms,
                    'url' => $member['url'] ?? '',
                    'source' => 'congress.gov'
                )),
                'updated_at' => current_time('mysql')
            );

            $wpdb->replace($table, $legislator_data);
            $count++;
        }

        // Clean up any state-level duplicates that match federal legislators by last name
        // This handles cases where OpenStates had federal reps stored as state-level
        $federal_names = $wpdb->get_col("SELECT name FROM $table WHERE level = 'federal'");
        $duplicates_removed = 0;

        foreach ($federal_names as $fed_name) {
            // Extract last name (handles "Last, First" and "First Last" formats)
            $fed_name_lower = strtolower(trim($fed_name));
            if (strpos($fed_name_lower, ',') !== false) {
                $last_name = trim(explode(',', $fed_name_lower)[0]);
            } else {
                $parts = explode(' ', $fed_name_lower);
                $last_name = end($parts);
            }

            // Delete state-level legislators with matching last name
            $deleted = $wpdb->query($wpdb->prepare(
                "DELETE FROM $table WHERE level = 'state' AND LOWER(name) LIKE %s",
                '%' . $wpdb->esc_like($last_name) . '%'
            ));
            $duplicates_removed += $deleted;
        }

        // Log success
        $wpdb->update($log_table, array(
            'status' => 'success',
            'records_synced' => $count,
            'completed_at' => current_time('mysql')
        ), array('id' => $log_id));

        $msg = "Synced $count federal legislators from Congress.gov";
        if ($duplicates_removed > 0) {
            $msg .= " (removed $duplicates_removed state-level duplicates)";
        }
        return array('success' => true, 'message' => $msg);

    } catch (Exception $e) {
        // Log error
        $wpdb->update($log_table, array(
            'status' => 'error',
            'error_message' => $e->getMessage(),
            'completed_at' => current_time('mysql')
        ), array('id' => $log_id));

        return array('success' => false, 'message' => 'Error: ' . $e->getMessage());
    }
}

/**
 * Sync federal bills from Congress.gov matching issue keywords
 * Fetches bills from the last 2 Congresses (~4 years)
 */
function votecraft_sync_federal_bills() {
    global $wpdb;
    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';
    $legislators_table = $wpdb->prefix . 'votecraft_legislators';
    $log_table = $wpdb->prefix . 'votecraft_sync_log';

    // Batch size - process this many legislators per click
    $batch_size = 50;

    // Issue keywords to filter bills (expanded for better matching)
    $search_terms = array(
        // RCV / Voting Reform
        'ranked choice', 'instant runoff', 'preferential voting', 'voting reform',
        'ballot access', 'election reform', 'voter', 'electoral', 'gerrymandering',

        // Campaign Finance / Citizens United
        'campaign finance', 'citizens united', 'dark money', 'political spending',
        'super pac', 'election spending', 'political contribution', 'lobbying',
        'money in politics', 'disclosure', 'transparency',

        // Healthcare
        'medicare', 'medicaid', 'healthcare', 'health care', 'public option',
        'affordable care', 'health insurance', 'prescription drug', 'drug price',
        'hospital', 'physician', 'patient', 'medical', 'nursing', 'mental health',

        // SCOTUS / Judicial Reform
        'supreme court', 'judicial ethics', 'court reform', 'term limits',
        'federal judge', 'judiciary', 'justice', 'appellate',

        // Debt / Economic Reform
        'student debt', 'student loan', 'predatory lending', 'debt relief',
        'consumer protection', 'credit card', 'bankruptcy', 'mortgage',
        'payday loan', 'financial literacy', 'usury',

        // Journalism / Press Freedom
        'journalism', 'press freedom', 'local news', 'newspaper', 'media',
        'first amendment', 'free press', 'reporter', 'broadcast',

        // Additional common legislative topics
        'climate', 'environment', 'clean energy', 'renewable',
        'education', 'school', 'teacher', 'college',
        'worker', 'labor', 'wage', 'union', 'employment',
        'housing', 'affordable housing', 'rent', 'homeless',
        'immigration', 'border', 'citizenship',
        'veteran', 'military', 'defense',
        'tax', 'budget', 'appropriation',
        'infrastructure', 'transportation', 'broadband',
        'civil rights', 'discrimination', 'equality'
    );

    // Get batch progress
    $progress = get_option('votecraft_federal_bills_progress', array('offset' => 0, 'bills_added' => 0));
    $offset = (int) $progress['offset'];
    $total_bills_added = (int) $progress['bills_added'];

    // Get all federal legislators from database
    $legislators = $wpdb->get_results(
        "SELECT id, name, raw_data FROM $legislators_table WHERE level = 'federal' ORDER BY id ASC"
    );

    if (empty($legislators)) {
        return array('success' => false, 'message' => 'No federal legislators in database. Sync legislators first.');
    }

    $total_legislators = count($legislators);

    // Check if we're done
    if ($offset >= $total_legislators) {
        // Reset progress for next time
        delete_option('votecraft_federal_bills_progress');
        return array('success' => true, 'message' => "Complete! Synced $total_bills_added bills from all $total_legislators legislators.");
    }

    // Log start of this batch
    $wpdb->insert($log_table, array(
        'sync_type' => 'federal_bills_batch',
        'state' => 'Federal',
        'status' => 'running',
        'started_at' => current_time('mysql'),
        'error_message' => "Batch: legislators $offset to " . min($offset + $batch_size, $total_legislators)
    ));
    $log_id = $wpdb->insert_id;

    try {
        // Get this batch of legislators
        $batch = array_slice($legislators, $offset, $batch_size);
        $bills_this_batch = 0;

        foreach ($batch as $leg) {
            $raw = json_decode($leg->raw_data, true);
            $bioguide_id = isset($raw['bioguideId']) ? $raw['bioguideId'] : null;

            if (!$bioguide_id) {
                continue;
            }

            // Fetch sponsored legislation for this legislator
            $url = 'https://api.congress.gov/v3/member/' . $bioguide_id . '/sponsored-legislation?' . http_build_query(array(
                'limit' => 100,
                'format' => 'json',
                'api_key' => VOTECRAFT_CONGRESS_API_KEY
            ));

            $response = wp_remote_get($url, array(
                'timeout' => 30,
                'user-agent' => 'VoteCraft/1.0'
            ));

            if (is_wp_error($response)) {
                continue;
            }

            $status = wp_remote_retrieve_response_code($response);
            if ($status !== 200) {
                continue;
            }

            $body = wp_remote_retrieve_body($response);
            $data = json_decode($body, true);

            if (!isset($data['sponsoredLegislation'])) {
                continue;
            }

            foreach ($data['sponsoredLegislation'] as $bill) {
                $congress = $bill['congress'] ?? 0;
                $bill_type = $bill['type'] ?? '';
                $bill_number = $bill['number'] ?? '';
                $bill_id = 'congress-' . $congress . '-' . $bill_type . '-' . $bill_number;

                // Only include 118th and 119th Congress (last ~4 years)
                if ($congress < 118) {
                    continue;
                }

                // Check if title matches any of our issue keywords
                $title = strtolower($bill['title'] ?? '');
                $matches_keyword = false;
                $matched_term = '';

                foreach ($search_terms as $kw) {
                    if (strpos($title, strtolower($kw)) !== false) {
                        $matches_keyword = true;
                        $matched_term = $kw;
                        break;
                    }
                }

                if ($matches_keyword) {
                    $latest_action = $bill['latestAction'] ?? array();
                    $action_date = isset($latest_action['actionDate']) ? $latest_action['actionDate'] : null;
                    $action_desc = isset($latest_action['text']) ? $latest_action['text'] : null;
                    $origin_chamber = isset($bill['originChamber']) ? strtolower($bill['originChamber']) : 'house';
                    $chamber_path = ($origin_chamber === 'senate') ? 'senate-bill' : 'house-bill';

                    // Insert bill (use INSERT IGNORE to skip duplicates)
                    $wpdb->query($wpdb->prepare(
                        "INSERT IGNORE INTO $bills_table (id, identifier, title, state, session, chamber, classification, subject, latest_action_date, latest_action_description, openstates_url, raw_data, updated_at)
                         VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                        $bill_id,
                        $bill_type . ' ' . $bill_number,
                        $bill['title'] ?? '',
                        'Federal',
                        $congress . 'th Congress',
                        $origin_chamber,
                        $bill_type,
                        $matched_term,
                        $action_date,
                        $action_desc,
                        'https://www.congress.gov/bill/' . $congress . 'th-congress/' . $chamber_path . '/' . $bill_number,
                        json_encode($bill),
                        current_time('mysql')
                    ));

                    // Add sponsorship
                    $wpdb->query($wpdb->prepare(
                        "INSERT IGNORE INTO $sponsorships_table (bill_id, legislator_id, legislator_name, sponsorship_type, classification)
                         VALUES (%s, %s, %s, %s, %s)",
                        $bill_id,
                        $leg->id,
                        $leg->name,
                        'primary',
                        'sponsor'
                    ));

                    $bills_this_batch++;
                }
            }

            // Rate limit - 200ms between requests
            usleep(200000);
        }

        // Update progress
        $new_offset = $offset + $batch_size;
        $total_bills_added += $bills_this_batch;
        update_option('votecraft_federal_bills_progress', array('offset' => $new_offset, 'bills_added' => $total_bills_added));

        // Log success
        $wpdb->update($log_table, array(
            'status' => 'success',
            'records_synced' => $bills_this_batch,
            'error_message' => null,
            'completed_at' => current_time('mysql')
        ), array('id' => $log_id));

        $remaining = $total_legislators - $new_offset;
        if ($remaining > 0) {
            return array(
                'success' => true,
                'message' => "Batch complete! Added $bills_this_batch bills. Progress: $new_offset / $total_legislators legislators. Click again to continue ($remaining remaining)."
            );
        } else {
            delete_option('votecraft_federal_bills_progress');
            return array(
                'success' => true,
                'message' => "Complete! Synced $total_bills_added total bills from all $total_legislators legislators."
            );
        }

    } catch (Exception $e) {
        $wpdb->update($log_table, array(
            'status' => 'error',
            'error_message' => $e->getMessage(),
            'completed_at' => current_time('mysql')
        ), array('id' => $log_id));

        return array('success' => false, 'message' => 'Error: ' . $e->getMessage());
    }
}

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
 * Get federal legislators for a state from local database
 */
function votecraft_local_get_federal_legislators($state = null) {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_legislators';

    if ($state) {
        return $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table WHERE level = 'federal' AND state = %s ORDER BY chamber ASC, name ASC",
            $state
        ));
    }

    return $wpdb->get_results(
        "SELECT * FROM $table WHERE level = 'federal' ORDER BY state ASC, chamber ASC, name ASC"
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
