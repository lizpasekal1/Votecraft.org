<?php
/**
 * Plugin Name: VoteCraft API Proxy
 * Description: Proxies requests to the OpenStates API, keeping the API key server-side.
 *              Caches responses in the WordPress database so repeated searches are instant.
 * Version: 2.0
 * Author: VoteCraft
 */

if (!defined('ABSPATH')) {
    exit;
}

// How long before cached data is considered stale (seconds)
define('VOTECRAFT_CACHE_TTL_PEOPLE', 24 * HOUR_IN_SECONDS);
define('VOTECRAFT_CACHE_TTL_PEOPLE_GEO', 12 * HOUR_IN_SECONDS);
define('VOTECRAFT_CACHE_TTL_BILLS', 4 * HOUR_IN_SECONDS);
define('VOTECRAFT_CACHE_MAX_AGE', 7 * DAY_IN_SECONDS); // Keep stale data for fallback

// Create cache table on plugin load
register_activation_hook(__FILE__, 'votecraft_create_cache_table');
add_action('plugins_loaded', 'votecraft_maybe_create_cache_table');

function votecraft_maybe_create_cache_table() {
    if (get_option('votecraft_cache_db_version') !== '2.0') {
        votecraft_create_cache_table();
    }
}

function votecraft_create_cache_table() {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_cache';
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS $table (
        cache_key VARCHAR(64) NOT NULL,
        endpoint VARCHAR(20) NOT NULL,
        response_data LONGTEXT NOT NULL,
        created_at INT UNSIGNED NOT NULL,
        PRIMARY KEY (cache_key)
    ) $charset;";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta($sql);
    update_option('votecraft_cache_db_version', '2.0');
}

// Schedule daily cleanup of old cache entries
add_action('votecraft_cache_cleanup', 'votecraft_cleanup_old_cache');
if (!wp_next_scheduled('votecraft_cache_cleanup')) {
    wp_schedule_event(time(), 'daily', 'votecraft_cache_cleanup');
}

function votecraft_cleanup_old_cache() {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_cache';
    $cutoff = time() - VOTECRAFT_CACHE_MAX_AGE;
    $wpdb->query($wpdb->prepare("DELETE FROM $table WHERE created_at < %d", $cutoff));
}

// Allow CORS from allowed origins
add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');
    add_filter('rest_pre_serve_request', function ($value) {
        $origin = get_http_origin();
        $allowed_origins = array(
            'https://lizpasekal1.github.io',
            'https://votecraft.org',
            'https://www.votecraft.org',
        );
        if (in_array($origin, $allowed_origins)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type');
        }
        return $value;
    });

    register_rest_route('votecraft/v1', '/openstates', array(
        'methods' => 'GET',
        'callback' => 'votecraft_openstates_proxy',
        'permission_callback' => '__return_true',
    ));
});

/**
 * Get the TTL for a given endpoint
 */
function votecraft_get_ttl($endpoint) {
    if ($endpoint === 'people') return VOTECRAFT_CACHE_TTL_PEOPLE;
    if ($endpoint === 'people.geo') return VOTECRAFT_CACHE_TTL_PEOPLE_GEO;
    return VOTECRAFT_CACHE_TTL_BILLS;
}

/**
 * Build a query string that properly repeats keys for array values.
 * PHP's http_build_query uses bracket notation (key[0]=val) which
 * many APIs (including OpenStates) don't accept.
 */
function votecraft_build_query($params) {
    $parts = array();
    foreach ($params as $key => $value) {
        if (is_array($value)) {
            foreach ($value as $v) {
                $parts[] = urlencode($key) . '=' . urlencode($v);
            }
        } else {
            $parts[] = urlencode($key) . '=' . urlencode($value);
        }
    }
    return implode('&', $parts);
}

/**
 * Read from database cache
 */
function votecraft_cache_get($cache_key, $ttl) {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_cache';

    $row = $wpdb->get_row($wpdb->prepare(
        "SELECT response_data, created_at FROM $table WHERE cache_key = %s",
        $cache_key
    ));

    if (!$row) return null;

    $age = time() - (int) $row->created_at;
    $data = json_decode($row->response_data, true);
    if ($data === null) return null;

    return array(
        'data' => $data,
        'age'  => $age,
        'fresh' => $age < $ttl,
    );
}

/**
 * Write to database cache
 */
function votecraft_cache_set($cache_key, $endpoint, $data) {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_cache';

    $wpdb->replace($table, array(
        'cache_key'     => $cache_key,
        'endpoint'      => $endpoint,
        'response_data' => json_encode($data),
        'created_at'    => time(),
    ), array('%s', '%s', '%s', '%d'));
}

/**
 * Main proxy handler
 */
function votecraft_openstates_proxy($request) {
    $apiKey = '064f1e91-b0a3-4e4b-b4c7-4313e70bc47d';
    $baseUrl = 'https://v3.openstates.org';

    $endpoint = $request->get_param('endpoint');

    $allowedEndpoints = array('people.geo', 'people', 'bills');
    if (!in_array($endpoint, $allowedEndpoints)) {
        return new WP_Error('invalid_endpoint', 'Invalid endpoint', array('status' => 400));
    }

    // Build clean params (strip routing and cache-buster params)
    $params = $request->get_query_params();
    unset($params['endpoint']);
    unset($params['_t']);
    unset($params['rest_route']);

    // Generate cache key from endpoint + params
    $cache_key = md5($endpoint . '|' . serialize($params));
    $ttl = votecraft_get_ttl($endpoint);

    // Check database cache
    $cached = votecraft_cache_get($cache_key, $ttl);

    if ($cached && $cached['fresh']) {
        $response = new WP_REST_Response($cached['data'], 200);
        $response->header('X-VoteCraft-Cache', 'HIT');
        $response->header('X-VoteCraft-Cache-Age', $cached['age']);
        return $response;
    }

    // Fetch fresh data from OpenStates
    // Remove any client-sent include params — we control these server-side
    unset($params['include']);
    $params['apikey'] = $apiKey;
    $query = votecraft_build_query($params);

    // For bill queries, always include sponsorships and votes data
    if ($endpoint === 'bills') {
        $query .= '&include=sponsorships&include=votes';
    }

    $url = $baseUrl . '/' . $endpoint . '?' . $query;

    $api_response = wp_remote_get($url, array(
        'timeout' => 15,
        'user-agent' => 'VoteCraft/1.0',
    ));

    if (is_wp_error($api_response)) {
        // API failed — serve stale cache if available
        if ($cached) {
            $response = new WP_REST_Response($cached['data'], 200);
            $response->header('X-VoteCraft-Cache', 'STALE');
            return $response;
        }
        return new WP_Error('api_error', 'Failed to reach OpenStates API', array('status' => 502));
    }

    $body = wp_remote_retrieve_body($api_response);
    $status = wp_remote_retrieve_response_code($api_response);

    $data = json_decode($body, true);
    if ($data === null) {
        // Parse error — serve stale cache if available
        if ($cached) {
            $response = new WP_REST_Response($cached['data'], 200);
            $response->header('X-VoteCraft-Cache', 'STALE');
            return $response;
        }
        return new WP_Error('parse_error', 'Invalid response from OpenStates', array('status' => 502));
    }

    // Save successful responses to database cache
    if ($status >= 200 && $status < 300) {
        votecraft_cache_set($cache_key, $endpoint, $data);
    }

    $response = new WP_REST_Response($data, $status);
    $response->header('X-VoteCraft-Cache', 'MISS');
    return $response;
}
