<?php
/**
 * Thin PHP port of SaveCraft's own Firestore REST helpers (src/app/js/storage.js) and
 * refresh-token->ID-token exchange (src/app/js/auth.js's getValidIdToken()) — scoped to exactly
 * one collection, admin_kanban_cards, matching what the dedicated bot account
 * (wp-savecraft-bot@votecraft-789.internal) is allowed to touch per firestore.rules.
 *
 * The bot's refresh token is the only secret here, and it never leaves this server — wp-admin's
 * own JS (admin/js/admin-kanban.js) talks to this plugin's REST routes, never to Firestore
 * directly, so the browser never sees this token or a Firestore-scoped ID token at all.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Same project + public web API key SaveCraft's own client already ships (storage.js) — Firebase
// web API keys are meant to be public; access control is enforced by firestore.rules, not by
// hiding this. The one real secret is VOTECRAFT_SAVECRAFT_BOT_REFRESH_TOKEN below.
define( 'VC_SAVECRAFT_FIREBASE_PROJECT', 'votecraft-789' );
define( 'VC_SAVECRAFT_FIREBASE_API_KEY', 'AIzaSyArJ6pkXUDbZf4jcxRita0qcdr-hT46kI8' );

// Must be defined in wp-config.php:
// define( 'VOTECRAFT_SAVECRAFT_BOT_REFRESH_TOKEN', '...' );
// (the wp-savecraft-bot@votecraft-789.internal Firebase Auth account's refresh token — see
// Documentation/launch-requirements.md's Phase 2 note in Savecraft for how it was provisioned.)

class VC_SaveCraft_Firestore_Client {

    const COLLECTION = 'admin_kanban_cards';

    // Cached ~50 min (Firebase ID tokens last 60) in a transient, same TTL margin
    // getValidIdToken() uses client-side — refreshed well before actual expiry rather than
    // waiting for a 401 and retrying.
    const ID_TOKEN_TRANSIENT = 'vc_savecraft_bot_id_token';
    const ID_TOKEN_TTL       = 50 * MINUTE_IN_SECONDS;

    /**
     * Exchanges the bot's refresh token for a short-lived ID token, cached in a transient.
     * Returns a token string, or a WP_Error if the exchange fails (e.g. the wp-config.php
     * constant is missing, or the refresh token was revoked).
     */
    private static function get_id_token() {
        $cached = get_transient( self::ID_TOKEN_TRANSIENT );
        if ( $cached ) {
            return $cached;
        }

        if ( ! defined( 'VOTECRAFT_SAVECRAFT_BOT_REFRESH_TOKEN' ) || ! VOTECRAFT_SAVECRAFT_BOT_REFRESH_TOKEN ) {
            return new WP_Error(
                'vc_savecraft_not_configured',
                'VOTECRAFT_SAVECRAFT_BOT_REFRESH_TOKEN is not defined in wp-config.php.'
            );
        }

        $url = 'https://securetoken.googleapis.com/v1/token?key=' . VC_SAVECRAFT_FIREBASE_API_KEY;
        $response = wp_remote_post( $url, array(
            'timeout' => 15,
            'headers' => array( 'Content-Type' => 'application/x-www-form-urlencoded' ),
            'body'    => array(
                'grant_type'    => 'refresh_token',
                'refresh_token' => VOTECRAFT_SAVECRAFT_BOT_REFRESH_TOKEN,
            ),
        ) );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( empty( $data['id_token'] ) ) {
            $message = isset( $data['error']['message'] ) ? $data['error']['message'] : 'Unknown error';
            return new WP_Error( 'vc_savecraft_auth_failed', 'SaveCraft sign-in failed: ' . $message );
        }

        set_transient( self::ID_TOKEN_TRANSIENT, $data['id_token'], self::ID_TOKEN_TTL );
        return $data['id_token'];
    }

    /**
     * Lists every card in admin_kanban_cards, paginated the same way
     * storage.js's _firestoreListCollection is (300/page).
     *
     * @return array|WP_Error Array of card arrays (each includes its own 'id' field, same
     *                         convention as the JS side — see class comment).
     */
    public static function list_cards() {
        $id_token = self::get_id_token();
        if ( is_wp_error( $id_token ) ) {
            return $id_token;
        }

        $cards = array();
        $page_token = null;

        do {
            $url = 'https://firestore.googleapis.com/v1/projects/' . VC_SAVECRAFT_FIREBASE_PROJECT .
                '/databases/(default)/documents/' . self::COLLECTION .
                '?key=' . VC_SAVECRAFT_FIREBASE_API_KEY . '&pageSize=300';
            if ( $page_token ) {
                $url .= '&pageToken=' . urlencode( $page_token );
            }

            $response = wp_remote_get( $url, array(
                'timeout' => 15,
                'headers' => array( 'Authorization' => 'Bearer ' . $id_token ),
            ) );
            if ( is_wp_error( $response ) ) {
                return $response;
            }

            $data = json_decode( wp_remote_retrieve_body( $response ), true );
            if ( isset( $data['error'] ) ) {
                return new WP_Error( 'vc_savecraft_firestore_error', $data['error']['message'] );
            }

            foreach ( ( $data['documents'] ?? array() ) as $doc ) {
                $cards[] = self::from_firestore_fields( $doc['fields'] ?? array() );
            }
            $page_token = $data['nextPageToken'] ?? null;
        } while ( $page_token );

        return $cards;
    }

    /**
     * Full-document replace (PATCH with no updateMask), matching storage.js's own
     * _firestoreUpsert — the caller always has (and sends) the complete card.
     *
     * @param string $id     Card id (Firestore document id).
     * @param array  $fields Complete card object, e.g. { name, details, urgency, status,
     *                       manualOrder, createdAt }.
     * @return true|WP_Error
     */
    public static function upsert_card( $id, array $fields ) {
        $id_token = self::get_id_token();
        if ( is_wp_error( $id_token ) ) {
            return $id_token;
        }

        $fields['id'] = $id; // same convention as the JS side: the doc's own id lives inside its fields too, not just the path — see _mergeCollection's cloudList.filter(d => d.id).
        $fields['updatedAt'] = gmdate( 'Y-m-d\TH:i:s.v\Z' );

        $url = 'https://firestore.googleapis.com/v1/projects/' . VC_SAVECRAFT_FIREBASE_PROJECT .
            '/databases/(default)/documents/' . self::COLLECTION . '/' . rawurlencode( $id ) .
            '?key=' . VC_SAVECRAFT_FIREBASE_API_KEY;

        $response = wp_remote_request( $url, array(
            'method'  => 'PATCH',
            'timeout' => 15,
            'headers' => array(
                'Authorization' => 'Bearer ' . $id_token,
                'Content-Type'  => 'application/json',
            ),
            'body' => wp_json_encode( array( 'fields' => self::to_firestore_fields( $fields ) ) ),
        ) );
        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( isset( $data['error'] ) ) {
            return new WP_Error( 'vc_savecraft_firestore_error', $data['error']['message'] );
        }
        return true;
    }

    /**
     * @param string $id Card id.
     * @return true|WP_Error
     */
    public static function delete_card( $id ) {
        $id_token = self::get_id_token();
        if ( is_wp_error( $id_token ) ) {
            return $id_token;
        }

        $url = 'https://firestore.googleapis.com/v1/projects/' . VC_SAVECRAFT_FIREBASE_PROJECT .
            '/databases/(default)/documents/' . self::COLLECTION . '/' . rawurlencode( $id ) .
            '?key=' . VC_SAVECRAFT_FIREBASE_API_KEY;

        $response = wp_remote_request( $url, array(
            'method'  => 'DELETE',
            'timeout' => 15,
            'headers' => array( 'Authorization' => 'Bearer ' . $id_token ),
        ) );
        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( isset( $data['error'] ) ) {
            return new WP_Error( 'vc_savecraft_firestore_error', $data['error']['message'] );
        }
        return true;
    }

    /* ─── Dashboard demo-content config (dashboard_demo_config/{queue-kanban,recent-saves,
       curated-lists}) — generic single-doc get/set, unlike the admin_kanban_cards-specific
       methods above, since this is 3 small fixed-id docs rather than an open collection. Reused
       by both the "Demo Content" REST routes below. Still goes through the bot's ID token even
       though this collection is public-read in firestore.rules — one auth path for everything
       this class touches, no reason to special-case a no-auth branch for three small docs. ─── */

    const DEMO_CONFIG_COLLECTION = 'dashboard_demo_config';

    /**
     * @param string $doc_id 'queue-kanban' | 'recent-saves' | 'curated-lists'
     * @return array|null|WP_Error Decoded fields, null if the doc doesn't exist yet, or WP_Error.
     */
    public static function get_demo_config( $doc_id ) {
        $id_token = self::get_id_token();
        if ( is_wp_error( $id_token ) ) {
            return $id_token;
        }

        $url = 'https://firestore.googleapis.com/v1/projects/' . VC_SAVECRAFT_FIREBASE_PROJECT .
            '/databases/(default)/documents/' . self::DEMO_CONFIG_COLLECTION . '/' . rawurlencode( $doc_id ) .
            '?key=' . VC_SAVECRAFT_FIREBASE_API_KEY;

        $response = wp_remote_get( $url, array(
            'timeout' => 15,
            'headers' => array( 'Authorization' => 'Bearer ' . $id_token ),
        ) );
        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( isset( $data['error'] ) ) {
            if ( ( $data['error']['status'] ?? '' ) === 'NOT_FOUND' ) {
                return null;
            }
            return new WP_Error( 'vc_savecraft_firestore_error', $data['error']['message'] );
        }
        return isset( $data['fields'] ) ? self::from_firestore_fields( $data['fields'] ) : null;
    }

    /**
     * Full-document replace, same PATCH-with-no-updateMask shape as upsert_card().
     *
     * @param string $doc_id
     * @param array  $fields
     * @return true|WP_Error
     */
    public static function set_demo_config( $doc_id, array $fields ) {
        $id_token = self::get_id_token();
        if ( is_wp_error( $id_token ) ) {
            return $id_token;
        }

        $url = 'https://firestore.googleapis.com/v1/projects/' . VC_SAVECRAFT_FIREBASE_PROJECT .
            '/databases/(default)/documents/' . self::DEMO_CONFIG_COLLECTION . '/' . rawurlencode( $doc_id ) .
            '?key=' . VC_SAVECRAFT_FIREBASE_API_KEY;

        $response = wp_remote_request( $url, array(
            'method'  => 'PATCH',
            'timeout' => 15,
            'headers' => array(
                'Authorization' => 'Bearer ' . $id_token,
                'Content-Type'  => 'application/json',
            ),
            'body' => wp_json_encode( array( 'fields' => self::to_firestore_fields( $fields ) ) ),
        ) );
        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $data = json_decode( wp_remote_retrieve_body( $response ), true );
        if ( isset( $data['error'] ) ) {
            return new WP_Error( 'vc_savecraft_firestore_error', $data['error']['message'] );
        }
        return true;
    }

    /* ─── curated_items search, for the Recent Saves demo-card picker's "pick from existing
       curated items" option. Public-read collection (firestore.rules: `allow read: if true`) — no
       auth needed at all, deliberately NOT using the bot's ID token here, matching storage.js's
       own _loadCuratedFromFirestore(), which fetches this same collection unauthenticated.
       Results cached 1 hour in a transient: this is a few hundred docs, not something worth
       re-fetching on every picker open. ─── */

    const CURATED_SEARCH_CACHE_TRANSIENT = 'vc_savecraft_curated_search_cache';
    const CURATED_SEARCH_CACHE_TTL       = HOUR_IN_SECONDS;

    /**
     * @return array|WP_Error Flat list of { id, title, imageUrl, category, genre }, restricted to
     *                        Top 100 Musician + Music Album — the same scope the SaveCraft app's
     *                        own fallback already uses (dashboard.js's resolveFavoriteSlides).
     */
    public static function search_curated_items() {
        $cached = get_transient( self::CURATED_SEARCH_CACHE_TRANSIENT );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = array();
        $page_token = null;

        do {
            $url = 'https://firestore.googleapis.com/v1/projects/' . VC_SAVECRAFT_FIREBASE_PROJECT .
                '/databases/(default)/documents/curated_items' .
                '?key=' . VC_SAVECRAFT_FIREBASE_API_KEY . '&pageSize=300';
            if ( $page_token ) {
                $url .= '&pageToken=' . urlencode( $page_token );
            }

            $response = wp_remote_get( $url, array( 'timeout' => 15 ) );
            if ( is_wp_error( $response ) ) {
                return $response;
            }

            $data = json_decode( wp_remote_retrieve_body( $response ), true );
            if ( isset( $data['error'] ) ) {
                return new WP_Error( 'vc_savecraft_firestore_error', $data['error']['message'] );
            }

            foreach ( ( $data['documents'] ?? array() ) as $doc ) {
                $f = self::from_firestore_fields( $doc['fields'] ?? array() );
                $genre = $f['genre'] ?? null;
                $category = $f['category'] ?? null;
                // Firestore's curated_items stores plural category labels ('Musicians', 'Music
                // Albums') — normalize to the singular values dashboard.js/state.js use
                // everywhere else (matches storage.js's own _CAT_NORMALIZE map for these two).
                $category_singular = array( 'Musicians' => 'Musician', 'Music Albums' => 'Music Album' );
                $category = $category_singular[ $category ] ?? $category;
                if ( $genre !== 'Top 100' || ! in_array( $category, array( 'Musician', 'Music Album' ), true ) ) {
                    continue;
                }
                if ( empty( $f['imageUrl'] ) ) {
                    continue;
                }
                $results[] = array(
                    'id'       => $f['id'] ?? $doc['name'],
                    'title'    => $f['title'] ?? '',
                    'imageUrl' => $f['imageUrl'],
                    'category' => $category,
                );
            }
            $page_token = $data['nextPageToken'] ?? null;
        } while ( $page_token );

        set_transient( self::CURATED_SEARCH_CACHE_TRANSIENT, $results, self::CURATED_SEARCH_CACHE_TTL );
        return $results;
    }

    /* ─── Firestore REST <-> PHP value conversion — mirrors storage.js's _toFirestoreValue/
       _fromFirestoreValue exactly, so a card round-trips identically whether it was last written
       by this plugin or by the SaveCraft web app/extension itself. ─── */

    private static function to_firestore_value( $v ) {
        if ( $v === null ) {
            return array( 'nullValue' => null );
        }
        if ( is_string( $v ) ) {
            return array( 'stringValue' => $v );
        }
        if ( is_bool( $v ) ) {
            return array( 'booleanValue' => $v );
        }
        if ( is_int( $v ) ) {
            return array( 'integerValue' => (string) $v );
        }
        if ( is_float( $v ) ) {
            return array( 'doubleValue' => $v );
        }
        if ( is_array( $v ) ) {
            // Sequential (list) arrays -> arrayValue; associative -> mapValue. array_is_list()
            // needs PHP 8.1+; this matches its logic for older hosts too. Empty array is a special
            // case: range(0, -1) does NOT return an empty array in PHP (it counts down and
            // returns [0, -1]), so it has to be treated as a list explicitly rather than falling
            // through to the range() comparison below — matching JS, where [] is also an array.
            $is_list = empty( $v ) || array_keys( $v ) === range( 0, count( $v ) - 1 );
            if ( $is_list ) {
                return array( 'arrayValue' => array( 'values' => array_map( array( __CLASS__, 'to_firestore_value' ), $v ) ) );
            }
            return array( 'mapValue' => array( 'fields' => self::to_firestore_fields( $v ) ) );
        }
        return array( 'nullValue' => null );
    }

    // storage.js's JS version explicitly skips `undefined` values (a distinct state from `null`
    // in JS) before converting the rest — PHP arrays have no such distinction (a key is either
    // present, in which case this loop visits it and null becomes an explicit nullValue same as
    // the JS side, or absent, in which case the loop never sees it at all, which already matches
    // the JS "omit the key" behavior for free). Nothing extra to skip here.
    private static function to_firestore_fields( array $obj ) {
        $fields = array();
        foreach ( $obj as $k => $v ) {
            $fields[ $k ] = self::to_firestore_value( $v );
        }
        return $fields;
    }

    private static function from_firestore_value( $v ) {
        if ( ! $v ) {
            return null;
        }
        if ( array_key_exists( 'stringValue', $v ) ) {
            return $v['stringValue'];
        }
        if ( array_key_exists( 'booleanValue', $v ) ) {
            return $v['booleanValue'];
        }
        if ( array_key_exists( 'integerValue', $v ) ) {
            return (int) $v['integerValue'];
        }
        if ( array_key_exists( 'doubleValue', $v ) ) {
            return $v['doubleValue'];
        }
        if ( array_key_exists( 'nullValue', $v ) ) {
            return null;
        }
        if ( array_key_exists( 'arrayValue', $v ) ) {
            $values = $v['arrayValue']['values'] ?? array();
            return array_map( array( __CLASS__, 'from_firestore_value' ), $values );
        }
        if ( array_key_exists( 'mapValue', $v ) ) {
            return self::from_firestore_fields( $v['mapValue']['fields'] ?? array() );
        }
        if ( array_key_exists( 'timestampValue', $v ) ) {
            return $v['timestampValue'];
        }
        return null;
    }

    private static function from_firestore_fields( array $fields ) {
        $obj = array();
        foreach ( $fields as $k => $v ) {
            $obj[ $k ] = self::from_firestore_value( $v );
        }
        return $obj;
    }
}
