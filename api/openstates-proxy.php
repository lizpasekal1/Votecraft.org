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

// Note: Keywords and bill associations management is now in votecraft-data-sync.php

// How long before cached data is considered stale (seconds)
define('VOTECRAFT_CACHE_TTL_PEOPLE', 24 * HOUR_IN_SECONDS);
define('VOTECRAFT_CACHE_TTL_PEOPLE_GEO', 12 * HOUR_IN_SECONDS);
define('VOTECRAFT_CACHE_TTL_BILLS', 4 * HOUR_IN_SECONDS);
define('VOTECRAFT_CACHE_MAX_AGE', 7 * DAY_IN_SECONDS); // Keep stale data for fallback

// Rate limiting: minimum seconds between API requests
define('VOTECRAFT_RATE_LIMIT_SECONDS', 1);
define('VOTECRAFT_RATE_LIMIT_OPTION', 'votecraft_last_api_call');

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

    register_rest_route('votecraft/v1', '/congress', array(
        'methods' => 'GET',
        'callback' => 'votecraft_congress_proxy',
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
 * Convert jurisdiction (abbreviation or name) to proper state name for DB lookup
 */
function votecraft_jurisdiction_to_state($jurisdiction) {
    $abbrev_to_state = array(
        'al' => 'Alabama', 'ak' => 'Alaska', 'az' => 'Arizona', 'ar' => 'Arkansas',
        'ca' => 'California', 'co' => 'Colorado', 'ct' => 'Connecticut', 'de' => 'Delaware',
        'fl' => 'Florida', 'ga' => 'Georgia', 'hi' => 'Hawaii', 'id' => 'Idaho',
        'il' => 'Illinois', 'in' => 'Indiana', 'ia' => 'Iowa', 'ks' => 'Kansas',
        'ky' => 'Kentucky', 'la' => 'Louisiana', 'me' => 'Maine', 'md' => 'Maryland',
        'ma' => 'Massachusetts', 'mi' => 'Michigan', 'mn' => 'Minnesota', 'ms' => 'Mississippi',
        'mo' => 'Missouri', 'mt' => 'Montana', 'ne' => 'Nebraska', 'nv' => 'Nevada',
        'nh' => 'New Hampshire', 'nj' => 'New Jersey', 'nm' => 'New Mexico', 'ny' => 'New York',
        'nc' => 'North Carolina', 'nd' => 'North Dakota', 'oh' => 'Ohio', 'ok' => 'Oklahoma',
        'or' => 'Oregon', 'pa' => 'Pennsylvania', 'ri' => 'Rhode Island', 'sc' => 'South Carolina',
        'sd' => 'South Dakota', 'tn' => 'Tennessee', 'tx' => 'Texas', 'ut' => 'Utah',
        'vt' => 'Vermont', 'va' => 'Virginia', 'wa' => 'Washington', 'wv' => 'West Virginia',
        'wi' => 'Wisconsin', 'wy' => 'Wyoming', 'dc' => 'District of Columbia'
    );
    $lower = strtolower($jurisdiction);
    if (isset($abbrev_to_state[$lower])) {
        return $abbrev_to_state[$lower];
    }
    // Handle federal/US jurisdiction
    if ($lower === 'united states' || $lower === 'us' || $lower === 'federal') {
        return 'Federal';
    }
    // Fallback: capitalize words (e.g., "new-york" -> "New York")
    return ucwords(str_replace('-', ' ', $jurisdiction));
}

/**
 * Try to serve Congress legislators from local synced database
 * Returns array with 'results' key if data found, null otherwise
 */
function votecraft_try_local_congress_db($state = null) {
    global $wpdb;
    $table = $wpdb->prefix . 'votecraft_legislators';

    // Check if we have any Congress legislators
    $count = $wpdb->get_var("SELECT COUNT(*) FROM $table WHERE level = 'congress'");
    if ($count == 0) {
        return null;
    }

    // Fetch Congress legislators (optionally filtered by state)
    if ($state) {
        // Convert abbreviation to full name if needed
        $state_name = votecraft_jurisdiction_to_state($state);
        $legislators = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM $table WHERE level = 'congress' AND state = %s ORDER BY chamber ASC, name ASC",
            $state_name
        ));
    } else {
        $legislators = $wpdb->get_results(
            "SELECT * FROM $table WHERE level = 'congress' ORDER BY state ASC, chamber ASC, name ASC"
        );
    }

    // Format results to match API response
    $results = array();
    foreach ($legislators as $leg) {
        $raw = json_decode($leg->raw_data, true);
        if ($raw) {
            $results[] = $raw;
        } else {
            // Fallback to table fields
            $results[] = array(
                'id' => $leg->id,
                'name' => $leg->name,
                'party' => $leg->party,
                'image' => $leg->photo_url,
                'email' => $leg->email,
                'current_role' => $leg->current_role ? json_decode($leg->current_role, true) : null,
                'jurisdiction' => array(
                    'name' => $leg->state,
                    'classification' => 'country'
                ),
                'level' => 'congress',
                'source' => 'openstates'
            );
        }
    }

    return array(
        'results' => $results,
        'pagination' => array('total_items' => count($results), 'per_page' => 100, 'page' => 1)
    );
}

/**
 * Try to serve from local synced database (votecraft_legislators, votecraft_bills)
 * Returns array with 'results' key if data found, null otherwise
 */
function votecraft_try_local_db($endpoint, $params) {
    global $wpdb;

    // Only use local DB for people and bills endpoints with jurisdiction
    $jurisdiction = isset($params['jurisdiction']) ? $params['jurisdiction'] : null;
    if (!$jurisdiction) {
        return null;
    }

    // Convert jurisdiction to state name for DB lookup
    $state = votecraft_jurisdiction_to_state($jurisdiction);

    // Check if we have synced data for this state
    $legislators_table = $wpdb->prefix . 'votecraft_legislators';
    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';

    if ($endpoint === 'people') {
        // Check if we have legislators for this state
        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $legislators_table WHERE state = %s",
            $state
        ));

        if ($count > 0) {
            $legislators = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM $legislators_table WHERE state = %s ORDER BY name ASC",
                $state
            ));

            // Format results to match OpenStates API response
            $results = array();
            foreach ($legislators as $leg) {
                $raw = json_decode($leg->raw_data, true);
                if ($raw) {
                    $results[] = $raw;
                } else {
                    // Fallback to table fields
                    $results[] = array(
                        'id' => $leg->id,
                        'name' => $leg->name,
                        'party' => $leg->party,
                        'image' => $leg->photo_url,
                        'email' => $leg->email,
                        'current_role' => $leg->current_role ? json_decode($leg->current_role, true) : null,
                    );
                }
            }

            return array(
                'results' => $results,
                'pagination' => array('total_items' => count($results), 'per_page' => 100, 'page' => 1)
            );
        }
    }

    if ($endpoint === 'bills') {
        $keyword = isset($params['q']) ? $params['q'] : null;
        if (!$keyword) {
            return null;
        }

        // Check if we have bills for this state
        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM $bills_table WHERE state = %s",
            $state
        ));

        if ($count > 0) {
            // Search bills by keyword against actual bill content only
            // (not issue_id, which stores the search keyword that found the bill — circular)
            $like_kw = '%' . $wpdb->esc_like($keyword) . '%';
            $bills = $wpdb->get_results($wpdb->prepare(
                "SELECT * FROM $bills_table
                 WHERE state = %s
                 AND (title LIKE %s OR subjects LIKE %s OR abstract LIKE %s)
                 ORDER BY latest_action_date DESC
                 LIMIT 50",
                $state,
                $like_kw, $like_kw, $like_kw
            ));

            // Validate with word boundary regex to eliminate partial matches
            $keywordPattern = '/\b' . preg_quote(strtolower($keyword), '/') . '\b/i';
            $validated_bills = array();
            foreach ($bills as $bill) {
                $titleMatch = preg_match($keywordPattern, strtolower($bill->title ?: ''));
                $subjectsMatch = preg_match($keywordPattern, strtolower($bill->subjects ?: ''));
                $abstractMatch = preg_match($keywordPattern, strtolower($bill->abstract ?: ''));
                if ($titleMatch || $subjectsMatch || $abstractMatch) {
                    $validated_bills[] = $bill;
                }
            }
            $bills = array_slice($validated_bills, 0, 20);

            // Format results and attach sponsorships
            $results = array();
            foreach ($bills as $bill) {
                $raw = json_decode($bill->raw_data, true);
                if ($raw) {
                    // Fetch sponsorships from local DB
                    $sponsors = $wpdb->get_results($wpdb->prepare(
                        "SELECT * FROM $sponsorships_table WHERE bill_id = %s",
                        $bill->id
                    ));
                    $raw['sponsorships'] = array();
                    foreach ($sponsors as $s) {
                        $raw['sponsorships'][] = array(
                            'name' => $s->legislator_name,
                            'primary' => $s->sponsorship_type === 'primary',
                            'classification' => $s->classification,
                            'person' => $s->legislator_id ? array('id' => $s->legislator_id) : null
                        );
                    }
                    $results[] = $raw;
                }
            }

            if (!empty($results)) {
                return array(
                    'results' => $results,
                    'pagination' => array('total_items' => count($results), 'per_page' => 20, 'page' => 1)
                );
            }
        }
    }

    return null;
}

/**
 * Main proxy handler
 */
function votecraft_openstates_proxy($request) {
    $apiKey = 'd2917281-d734-4e26-a557-eeb50ea60f78';
    $baseUrl = 'https://v3.openstates.org';

    $endpoint = $request->get_param('endpoint');

    $allowedEndpoints = array('people.geo', 'people', 'people.congress', 'bills');
    if (!in_array($endpoint, $allowedEndpoints)) {
        return new WP_Error('invalid_endpoint', 'Invalid endpoint', array('status' => 400));
    }

    // Build clean params (strip routing and cache-buster params)
    $params = $request->get_query_params();
    unset($params['endpoint']);
    unset($params['_t']);
    unset($params['rest_route']);

    // Handle Congress legislators endpoint (local DB only)
    if ($endpoint === 'people.congress') {
        $state = isset($params['state']) ? $params['state'] : null;
        $congress_data = votecraft_try_local_congress_db($state);
        if ($congress_data) {
            $response = new WP_REST_Response($congress_data, 200);
            $response->header('X-VoteCraft-Cache', 'LOCAL-DB');
            return $response;
        }
        // If no local data, return empty results (no external API fallback)
        return new WP_REST_Response(array('results' => array(), 'pagination' => array('total_items' => 0)), 200);
    }

    // Try local synced database first (fastest, no API calls)
    $local_data = votecraft_try_local_db($endpoint, $params);
    if ($local_data) {
        $response = new WP_REST_Response($local_data, 200);
        $response->header('X-VoteCraft-Cache', 'LOCAL-DB');
        return $response;
    }

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

    // Strict rate limiting: 2 seconds between requests to avoid 429
    $last_call = get_option(VOTECRAFT_RATE_LIMIT_OPTION, 0);
    $now = microtime(true);
    $elapsed = $now - $last_call;
    if ($elapsed < 2.0) {
        // Return stale cache if available, otherwise empty
        if ($cached) {
            $response = new WP_REST_Response($cached['data'], 200);
            $response->header('X-VoteCraft-Cache', 'STALE-RATELIMIT');
            return $response;
        }
        return new WP_REST_Response(array('results' => array(), 'pagination' => array('total_items' => 0)), 200);
    }
    update_option(VOTECRAFT_RATE_LIMIT_OPTION, microtime(true));

    // Fetch from OpenStates API
    $apiKey = 'd2917281-d734-4e26-a557-eeb50ea60f78';
    $baseUrl = 'https://v3.openstates.org';

    unset($params['include']);
    $params['apikey'] = $apiKey;
    $query = votecraft_build_query($params);

    if ($endpoint === 'bills') {
        $query .= '&include=sponsorships&include=votes';
    }

    // Include links for people endpoints to get personal websites
    if ($endpoint === 'people' || $endpoint === 'people.geo') {
        $query .= '&include=links';
    }

    $url = $baseUrl . '/' . $endpoint . '?' . $query;

    $api_response = wp_remote_get($url, array(
        'timeout' => 15,
        'user-agent' => 'VoteCraft/1.0',
    ));

    if (is_wp_error($api_response)) {
        if ($cached) {
            $response = new WP_REST_Response($cached['data'], 200);
            $response->header('X-VoteCraft-Cache', 'STALE');
            return $response;
        }
        return new WP_Error('api_error', 'Failed to reach OpenStates API', array('status' => 502));
    }

    $body = wp_remote_retrieve_body($api_response);
    $status = wp_remote_retrieve_response_code($api_response);

    // Handle rate limiting - return stale cache
    if ($status === 429) {
        if ($cached) {
            $response = new WP_REST_Response($cached['data'], 200);
            $response->header('X-VoteCraft-Cache', 'STALE-RATELIMIT');
            return $response;
        }
        return new WP_REST_Response(array('results' => array(), 'pagination' => array('total_items' => 0)), 200);
    }

    $data = json_decode($body, true);
    if ($data === null) {
        if ($cached) {
            $response = new WP_REST_Response($cached['data'], 200);
            $response->header('X-VoteCraft-Cache', 'STALE');
            return $response;
        }
        return new WP_Error('parse_error', 'Invalid response from OpenStates', array('status' => 502));
    }

    // Cache successful responses
    if ($status >= 200 && $status < 300) {
        votecraft_cache_set($cache_key, $endpoint, $data);
    }

    $response = new WP_REST_Response($data, $status);
    $response->header('X-VoteCraft-Cache', 'MISS');
    return $response;
}

/**
 * Congress.gov API proxy handler
 * Provides access to federal bill and member data
 */
function votecraft_congress_proxy($request) {
    // Congress.gov API key
    $apiKey = 'hAwu5fqahUrcpjdzEJpsPzMleub3epvnX64pmBNV';
    $baseUrl = 'https://api.congress.gov/v3';

    $endpoint = $request->get_param('endpoint');

    $allowedEndpoints = array('bill/search', 'member/bills', 'bill', 'member');
    if (!$endpoint || !in_array($endpoint, $allowedEndpoints)) {
        return new WP_Error('invalid_endpoint', 'Invalid Congress.gov endpoint', array('status' => 400));
    }

    $params = $request->get_query_params();
    unset($params['endpoint']);
    unset($params['rest_route']);

    // Check for cache bypass
    $bypass_cache = isset($params['nocache']) && $params['nocache'] === '1';
    unset($params['nocache']);
    unset($params['_t']);

    // Generate cache key
    $cache_key = 'congress_' . md5($endpoint . '|' . serialize($params));

    // Check cache (4 hour TTL for Congress data) - skip if bypass requested
    $cached = votecraft_cache_get($cache_key, 4 * HOUR_IN_SECONDS);
    if (!$bypass_cache && $cached && $cached['fresh']) {
        $response = new WP_REST_Response($cached['data'], 200);
        $response->header('X-VoteCraft-Cache', 'HIT');
        return $response;
    }

    // Build API request based on endpoint type
    $url = '';
    $limit = isset($params['limit']) ? intval($params['limit']) : 20;

    if ($endpoint === 'bill/search') {
        // Search bills by keyword
        $query = isset($params['query']) ? $params['query'] : '';
        $url = $baseUrl . '/bill?api_key=' . $apiKey . '&format=json&limit=' . $limit;
        if ($query) {
            $url .= '&query=' . urlencode($query);
        }
    } elseif ($endpoint === 'member/bills') {
        // Get bills sponsored by a member (search by name)
        $name = isset($params['name']) ? $params['name'] : '';
        $chamber = isset($params['chamber']) ? $params['chamber'] : '';

        // First, find the member by name
        $memberUrl = $baseUrl . '/member?api_key=' . $apiKey . '&format=json&limit=10';
        if ($name) {
            $memberUrl .= '&name=' . urlencode($name);
        }
        if ($chamber) {
            $memberUrl .= '&chamber=' . urlencode($chamber);
        }

        $memberResponse = wp_remote_get($memberUrl, array('timeout' => 15));
        if (is_wp_error($memberResponse)) {
            return new WP_Error('api_error', 'Failed to search Congress members', array('status' => 502));
        }

        $memberBody = wp_remote_retrieve_body($memberResponse);
        $memberData = json_decode($memberBody, true);

        $members = isset($memberData['members']) ? $memberData['members'] : array();
        if (empty($members)) {
            return new WP_REST_Response(array('bills' => array(), 'member' => null), 200);
        }

        // Get the first matching member's bioguide ID
        $member = $members[0];
        $bioguideId = isset($member['bioguideId']) ? $member['bioguideId'] : null;

        if (!$bioguideId) {
            return new WP_REST_Response(array('bills' => array(), 'member' => $member), 200);
        }

        // Now get their legislation - fetch both sponsored AND cosponsored for comprehensive coverage
        // Congress.gov allows max 250 per request, so we paginate for more
        $allBills = array();
        $seenBillIds = array();  // Track seen bills to avoid duplicates
        $pageLimit = min($limit, 250);

        // Fetch SPONSORED legislation (bills they are primary sponsor of)
        $offset = 0;
        $maxPages = 5;  // Up to 1250 bills per type
        for ($page = 0; $page < $maxPages; $page++) {
            $pageUrl = $baseUrl . '/member/' . $bioguideId . '/sponsored-legislation?api_key=' . $apiKey . '&format=json&limit=' . $pageLimit . '&offset=' . $offset;

            $pageResponse = wp_remote_get($pageUrl, array('timeout' => 15));
            if (is_wp_error($pageResponse)) {
                break;
            }

            $pageBody = wp_remote_retrieve_body($pageResponse);
            $pageData = json_decode($pageBody, true);

            $pageBills = isset($pageData['sponsoredLegislation']) ? $pageData['sponsoredLegislation'] : array();
            if (empty($pageBills)) {
                break;
            }

            foreach ($pageBills as $bill) {
                $billId = isset($bill['congress']) && isset($bill['number']) && isset($bill['type'])
                    ? $bill['congress'] . '-' . $bill['type'] . '-' . $bill['number']
                    : null;
                if ($billId && !isset($seenBillIds[$billId])) {
                    $seenBillIds[$billId] = true;
                    $bill['sponsorshipType'] = 'primary';  // Mark as primary sponsor
                    $allBills[] = $bill;
                }
            }

            $offset += $pageLimit;
            if (count($pageBills) < $pageLimit) {
                break;
            }
        }

        // Fetch COSPONSORED legislation (bills they cosponsor)
        $offset = 0;
        for ($page = 0; $page < $maxPages; $page++) {
            $pageUrl = $baseUrl . '/member/' . $bioguideId . '/cosponsored-legislation?api_key=' . $apiKey . '&format=json&limit=' . $pageLimit . '&offset=' . $offset;

            $pageResponse = wp_remote_get($pageUrl, array('timeout' => 15));
            if (is_wp_error($pageResponse)) {
                break;
            }

            $pageBody = wp_remote_retrieve_body($pageResponse);
            $pageData = json_decode($pageBody, true);

            $pageBills = isset($pageData['cosponsoredLegislation']) ? $pageData['cosponsoredLegislation'] : array();
            if (empty($pageBills)) {
                break;
            }

            foreach ($pageBills as $bill) {
                $billId = isset($bill['congress']) && isset($bill['number']) && isset($bill['type'])
                    ? $bill['congress'] . '-' . $bill['type'] . '-' . $bill['number']
                    : null;
                if ($billId && !isset($seenBillIds[$billId])) {
                    $seenBillIds[$billId] = true;
                    $bill['sponsorshipType'] = 'cosponsor';  // Mark as cosponsor
                    $allBills[] = $bill;
                }
            }

            $offset += $pageLimit;
            if (count($pageBills) < $pageLimit) {
                break;
            }
        }

        // Store bills for normalization below
        $data = array('sponsoredLegislation' => $allBills);
        $url = 'paginated';  // Mark as already fetched
    } else {
        return new WP_Error('invalid_endpoint', 'Endpoint not implemented', array('status' => 400));
    }

    // Make the API request (skip if already paginated)
    if ($url !== 'paginated') {
        $api_response = wp_remote_get($url, array(
            'timeout' => 15,
            'user-agent' => 'VoteCraft/1.0',
        ));

        if (is_wp_error($api_response)) {
            if ($cached) {
                $response = new WP_REST_Response($cached['data'], 200);
                $response->header('X-VoteCraft-Cache', 'STALE');
                return $response;
            }
            return new WP_Error('api_error', 'Failed to reach Congress.gov API', array('status' => 502));
        }

        $body = wp_remote_retrieve_body($api_response);
        $status = wp_remote_retrieve_response_code($api_response);
        $data = json_decode($body, true);

        if ($data === null) {
            if ($cached) {
                return new WP_REST_Response($cached['data'], 200);
            }
            return new WP_Error('parse_error', 'Invalid response from Congress.gov', array('status' => 502));
        }
    }

    // For paginated requests, $data was already set above
    $status = 200;
    if ($data === null) {
        return new WP_Error('parse_error', 'No data available', array('status' => 502));
    }

    // Normalize the response
    $normalizedData = array(
        'bills' => array(),
        'member' => isset($member) ? $member : null
    );

    // Congress.gov returns bills under different keys depending on endpoint
    $bills = isset($data['sponsoredLegislation']) ? $data['sponsoredLegislation'] :
             (isset($data['bills']) ? $data['bills'] : array());

    foreach ($bills as $bill) {
        $normalizedData['bills'][] = array(
            'id' => isset($bill['congress']) && isset($bill['number']) ? $bill['congress'] . '-' . $bill['number'] : null,
            'number' => isset($bill['number']) ? $bill['number'] : null,
            'billNumber' => isset($bill['number']) ? $bill['type'] . ' ' . $bill['number'] : null,
            'title' => isset($bill['title']) ? $bill['title'] : '',
            'type' => isset($bill['type']) ? $bill['type'] : '',
            'congress' => isset($bill['congress']) ? $bill['congress'] : null,
            'introducedDate' => isset($bill['introducedDate']) ? $bill['introducedDate'] : null,
            'latestAction' => isset($bill['latestAction']) ? $bill['latestAction'] : null,
            'url' => isset($bill['url']) ? $bill['url'] : null,
            'policyArea' => isset($bill['policyArea']) ? $bill['policyArea'] : null,
            'sponsors' => isset($bill['sponsors']) ? $bill['sponsors'] : array(),
            'sponsorshipType' => isset($bill['sponsorshipType']) ? $bill['sponsorshipType'] : 'primary'
        );
    }

    // Cache the result
    if ($status >= 200 && $status < 300) {
        votecraft_cache_set($cache_key, 'congress', $normalizedData);
    }

    $response = new WP_REST_Response($normalizedData, 200);
    $response->header('X-VoteCraft-Cache', 'MISS');
    return $response;
}
