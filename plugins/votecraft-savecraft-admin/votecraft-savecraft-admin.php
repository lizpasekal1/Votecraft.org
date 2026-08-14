<?php
/**
 * Plugin Name: VoteCraft SaveCraft Admin
 * Description: Staff-only Admin Kanban board for SaveCraft, right inside wp-admin — no separate
 *              SaveCraft login needed. Talks to Firestore server-side through a dedicated,
 *              narrowly-scoped bot account (see includes/class-firestore-client.php); the browser
 *              never sees any Firestore credential, only this plugin's own REST routes.
 * Version: 1.0
 * Author: VoteCraft
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'VC_SAVECRAFT_ADMIN_VERSION', '1.1' );
define( 'VC_SAVECRAFT_ADMIN_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'VC_SAVECRAFT_ADMIN_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// A dedicated capability rather than reusing manage_options — per direct request, this is meant
// for trusted *staff*, not necessarily every WordPress Administrator and not site visitors. Granted
// to the Administrator role by default on activation (below); grant it to other roles/individual
// users via a role-editor plugin (e.g. User Role Editor, already common for this kind of one-off
// capability) to open it up to specific staff accounts without making them full WP Admins.
define( 'VC_SAVECRAFT_ADMIN_CAPABILITY', 'manage_savecraft_admin' );

require_once VC_SAVECRAFT_ADMIN_PLUGIN_DIR . 'includes/class-firestore-client.php';

register_activation_hook( __FILE__, 'vc_savecraft_admin_activate' );

function vc_savecraft_admin_activate() {
    $role = get_role( 'administrator' );
    if ( $role && ! $role->has_cap( VC_SAVECRAFT_ADMIN_CAPABILITY ) ) {
        $role->add_cap( VC_SAVECRAFT_ADMIN_CAPABILITY );
    }
}

/* ─── Admin menu ─── */

add_action( 'admin_menu', 'vc_savecraft_admin_menu' );

function vc_savecraft_admin_menu() {
    add_menu_page(
        'SaveCraft Admin',
        'SaveCraft Admin',
        VC_SAVECRAFT_ADMIN_CAPABILITY,
        'vc-savecraft-admin',
        'vc_savecraft_admin_page',
        'dashicons-list-view',
        58 // just under Comments, near the other content-management menu items
    );
}

/* ─── Admin assets ─── */

add_action( 'admin_enqueue_scripts', 'vc_savecraft_admin_assets' );

function vc_savecraft_admin_assets( $hook ) {
    if ( $hook !== 'toplevel_page_vc-savecraft-admin' ) {
        return;
    }

    wp_enqueue_style(
        'vc-savecraft-admin',
        VC_SAVECRAFT_ADMIN_PLUGIN_URL . 'admin/admin.css',
        array(),
        VC_SAVECRAFT_ADMIN_VERSION
    );

    wp_enqueue_script(
        'vc-savecraft-admin-kanban',
        VC_SAVECRAFT_ADMIN_PLUGIN_URL . 'admin/js/admin-kanban.js',
        array(),
        VC_SAVECRAFT_ADMIN_VERSION,
        true
    );

    // restNonce is a standard `wp_rest` nonce (10-second-refreshed cookie + nonce pair WordPress
    // already issues to every logged-in admin page) — proves "this request came from a logged-in
    // wp-admin session", same mechanism core itself uses for its own REST calls from admin JS.
    // It's not a credential of its own and grants nothing by itself; every route below still
    // re-checks current_user_can() independently.
    wp_localize_script( 'vc-savecraft-admin-kanban', 'vcSaveCraftAdmin', array(
        'restUrl' => esc_url_raw( rest_url( 'votecraft-savecraft/v1/kanban' ) ),
        'nonce'   => wp_create_nonce( 'wp_rest' ),
    ) );

    wp_enqueue_script(
        'vc-savecraft-admin-demo-content',
        VC_SAVECRAFT_ADMIN_PLUGIN_URL . 'admin/js/admin-demo-content.js',
        array(),
        VC_SAVECRAFT_ADMIN_VERSION,
        true
    );
    wp_localize_script( 'vc-savecraft-admin-demo-content', 'vcSaveCraftDemoContent', array(
        'restUrl' => esc_url_raw( rest_url( 'votecraft-savecraft/v1/' ) ),
        'nonce'   => wp_create_nonce( 'wp_rest' ),
    ) );
}

/* ─── Admin page shell — the board itself is rendered by admin-kanban.js from the REST data ─── */

function vc_savecraft_admin_page() {
    ?>
    <div class="wrap vc-savecraft-admin-wrap">
        <h1>SaveCraft Admin</h1>

        <details class="votecraft-accordion" open>
            <summary>🗂️ Admin Kanban</summary>
            <div class="accordion-content">
                <p class="description">
                    Shared with the SaveCraft app itself — changes made here show up there, and vice versa.
                </p>
                <div id="vc-savecraft-kanban-error" class="notice notice-error" style="display:none"></div>
                <div id="vc-savecraft-kanban-board" class="vc-savecraft-kanban-board">
                    <p id="vc-savecraft-kanban-loading">Loading…</p>
                </div>
            </div>
        </details>

        <details class="votecraft-accordion">
            <summary>🎬 Demo Content</summary>
            <div class="accordion-content">
                <p class="description">
                    Controls what signed-out visitors and empty-state accounts see on the Dashboard
                    for the 3 widgets that show fallback/demo content instead of a user's own real
                    data. Nothing here is required — every section falls back to its own built-in
                    default until you configure it.
                </p>
                <div id="vc-savecraft-demo-error" class="notice notice-error" style="display:none"></div>

                <h3>Queue Kanban demo card</h3>
                <p class="description">Shown in the "Continue Your Queue" widget when nobody has queued anything yet.</p>
                <table class="form-table" id="vc-savecraft-demo-queue-kanban-table">
                    <tr><th><label for="vc-savecraft-demo-qk-title">Title</label></th>
                        <td><input type="text" id="vc-savecraft-demo-qk-title" class="regular-text" placeholder="Drag to progress"></td></tr>
                    <tr><th><label for="vc-savecraft-demo-qk-category">Category</label></th>
                        <td><select id="vc-savecraft-demo-qk-category">
                            <option value="Book">Book</option><option value="Movie">Movie</option>
                            <option value="Show">Show</option><option value="Game">Game</option>
                            <option value="Musician">Musician</option><option value="Music Album">Music Album</option>
                            <option value="Visual Art">Visual Art</option><option value="Web Links">Web Links</option>
                        </select></td></tr>
                    <tr><th><label for="vc-savecraft-demo-qk-image">Image URL</label></th>
                        <td><input type="url" id="vc-savecraft-demo-qk-image" class="regular-text" placeholder="(optional)"></td></tr>
                </table>
                <p><button type="button" class="button button-primary" id="vc-savecraft-demo-qk-save">Save</button></p>

                <hr>

                <h3>Recent Saves demo cards</h3>
                <p class="description">Shown in the "Recent Saves" widget when an account has no favorites yet — pick from existing curated Top 100 items, or add fully custom cards.</p>
                <div id="vc-savecraft-demo-rs-list" class="vc-savecraft-demo-rs-list"></div>
                <p>
                    <button type="button" class="button" id="vc-savecraft-demo-rs-add-curated">+ Add from Curated</button>
                    <button type="button" class="button" id="vc-savecraft-demo-rs-add-custom">+ Add Custom Card</button>
                </p>

                <hr>

                <h3>Curated Lists widget</h3>
                <p class="description">Controls the genre order, display names, and cover images shown in the "Curated Lists" widget.</p>
                <div id="vc-savecraft-demo-cl-list" class="vc-savecraft-demo-cl-list"></div>
                <p><button type="button" class="button button-primary" id="vc-savecraft-demo-cl-save">Save Curated Lists</button></p>
            </div>
        </details>

        <details class="votecraft-accordion">
            <summary>👥 Users</summary>
            <div class="accordion-content">
                <p class="description">
                    Not built yet — viewing SaveCraft accounts here needs a separate Firebase Cloud
                    Function (this collection isn't reachable the same scoped way Admin Kanban is),
                    which in turn needs switching the Firebase project off its free Spark plan onto
                    Blaze (pay-as-you-go). Fully designed, but paused pending that decision.
                </p>
            </div>
        </details>
    </div>
    <?php
}

/* ─── REST routes — the only thing wp-admin JS ever talks to; Firestore is server-side only ─── */

add_action( 'rest_api_init', 'vc_savecraft_admin_register_routes' );

function vc_savecraft_admin_register_routes() {
    register_rest_route( 'votecraft-savecraft/v1', '/kanban', array(
        'methods'             => 'GET',
        'callback'            => 'vc_savecraft_admin_list_cards',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );

    register_rest_route( 'votecraft-savecraft/v1', '/kanban/(?P<id>[\w-]+)', array(
        'methods'             => 'POST',
        'callback'            => 'vc_savecraft_admin_upsert_card',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
        'args'                => array(
            'id' => array(
                'required'          => true,
                'validate_callback' => function ( $value ) {
                    return is_string( $value ) && preg_match( '/^[\w-]+$/', $value );
                },
            ),
        ),
    ) );

    register_rest_route( 'votecraft-savecraft/v1', '/kanban/(?P<id>[\w-]+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'vc_savecraft_admin_delete_card',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );

    // Demo Content — same capability gate as Kanban above (no separate capability for this one;
    // it doesn't expose anything more sensitive than the Kanban board already does).
    register_rest_route( 'votecraft-savecraft/v1', '/demo-config/(?P<doc>queue-kanban|recent-saves|curated-lists)', array(
        'methods'             => 'GET',
        'callback'            => 'vc_savecraft_admin_get_demo_config',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );

    register_rest_route( 'votecraft-savecraft/v1', '/demo-config/(?P<doc>queue-kanban|recent-saves|curated-lists)', array(
        'methods'             => 'POST',
        'callback'            => 'vc_savecraft_admin_set_demo_config',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );

    register_rest_route( 'votecraft-savecraft/v1', '/curated-search', array(
        'methods'             => 'GET',
        'callback'            => 'vc_savecraft_admin_curated_search',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );
}

function vc_savecraft_admin_permission_check() {
    return current_user_can( VC_SAVECRAFT_ADMIN_CAPABILITY );
}

function vc_savecraft_admin_list_cards( $request ) {
    $cards = VC_SaveCraft_Firestore_Client::list_cards();
    if ( is_wp_error( $cards ) ) {
        return new WP_REST_Response( array( 'message' => $cards->get_error_message() ), 502 );
    }
    return new WP_REST_Response( $cards, 200 );
}

// A known, fixed field allowlist — mirrors the shape adminKanban.js itself writes (name, details,
// urgency, status, manualOrder, createdAt). Deliberately not "whatever the request body contains":
// this is server-side PHP handling a POST body, so passing it straight through to Firestore
// without a shape check would let a caller who already has the manage_savecraft_admin capability
// write arbitrary fields into a card doc — harmless given who can already reach this route, but
// there's no reason to allow it either.
function vc_savecraft_admin_upsert_card( $request ) {
    $id = $request->get_param( 'id' );
    $body = $request->get_json_params();
    if ( ! is_array( $body ) ) {
        return new WP_REST_Response( array( 'message' => 'Invalid request body.' ), 400 );
    }

    $urgency = $body['urgency'] ?? null;
    if ( $urgency !== null && ! in_array( $urgency, array( 'low', 'medium', 'high' ), true ) ) {
        $urgency = null;
    }
    $status = $body['status'] ?? 'todo';
    if ( ! in_array( $status, array( 'todo', 'in-progress', 'blocked', 'done' ), true ) ) {
        $status = 'todo';
    }

    $card = array(
        'name'        => sanitize_text_field( $body['name'] ?? '' ),
        'details'     => sanitize_textarea_field( $body['details'] ?? '' ),
        'urgency'     => $urgency,
        'status'      => $status,
        'manualOrder' => isset( $body['manualOrder'] ) ? (int) $body['manualOrder'] : 0,
        'createdAt'   => isset( $body['createdAt'] ) ? (int) $body['createdAt'] : (int) round( microtime( true ) * 1000 ),
    );

    $result = VC_SaveCraft_Firestore_Client::upsert_card( $id, $card );
    if ( is_wp_error( $result ) ) {
        return new WP_REST_Response( array( 'message' => $result->get_error_message() ), 502 );
    }

    $card['id'] = $id;
    return new WP_REST_Response( $card, 200 );
}

function vc_savecraft_admin_delete_card( $request ) {
    $id = $request->get_param( 'id' );
    $result = VC_SaveCraft_Firestore_Client::delete_card( $id );
    if ( is_wp_error( $result ) ) {
        return new WP_REST_Response( array( 'message' => $result->get_error_message() ), 502 );
    }
    return new WP_REST_Response( array( 'deleted' => $id ), 200 );
}

/* ─── Demo Content ─── */

// Same values as state.js's CATEGORIES/CURATED_GENRES exports — kept in sync by hand since this
// is server-side PHP with no access to the JS source; only used to validate incoming data, never
// displayed, so a stale entry here would just reject a save rather than corrupt anything.
const VC_SAVECRAFT_CATEGORIES = array( 'Web Links', 'Show', 'Musician', 'Music Album', 'Game', 'Movie', 'Book', 'Visual Art' );
const VC_SAVECRAFT_CURATED_GENRES = array( 'Top 100', 'Futurism', 'Fantasy', 'Thriller', 'Pop', 'Classic', 'Jazz', 'Comedy' );

function vc_savecraft_admin_get_demo_config( $request ) {
    $doc_id = $request->get_param( 'doc' );
    $data = VC_SaveCraft_Firestore_Client::get_demo_config( $doc_id );
    if ( is_wp_error( $data ) ) {
        return new WP_REST_Response( array( 'message' => $data->get_error_message() ), 502 );
    }
    return new WP_REST_Response( $data ?? new stdClass(), 200 );
}

function vc_savecraft_admin_set_demo_config( $request ) {
    $doc_id = $request->get_param( 'doc' );
    $body = $request->get_json_params();
    if ( ! is_array( $body ) ) {
        return new WP_REST_Response( array( 'message' => 'Invalid request body.' ), 400 );
    }

    if ( $doc_id === 'queue-kanban' ) {
        $category = $body['category'] ?? '';
        if ( ! in_array( $category, VC_SAVECRAFT_CATEGORIES, true ) ) {
            $category = '';
        }
        $fields = array(
            'title'    => sanitize_text_field( $body['title'] ?? '' ),
            'category' => $category,
            'imageUrl' => ! empty( $body['imageUrl'] ) ? esc_url_raw( $body['imageUrl'] ) : null,
        );
    } elseif ( $doc_id === 'recent-saves' ) {
        $cards = array();
        foreach ( ( $body['cards'] ?? array() ) as $c ) {
            if ( empty( $c['title'] ) ) {
                continue; // a card with no title is never worth keeping, custom or curated
            }
            $category = $c['category'] ?? '';
            if ( ! in_array( $category, VC_SAVECRAFT_CATEGORIES, true ) ) {
                $category = 'Musician';
            }
            $cards[] = array(
                'id'       => sanitize_text_field( $c['id'] ?? ( 'demo-' . wp_generate_password( 8, false ) ) ),
                'title'    => sanitize_text_field( $c['title'] ),
                'imageUrl' => ! empty( $c['imageUrl'] ) ? esc_url_raw( $c['imageUrl'] ) : null,
                'category' => $category,
            );
        }
        $fields = array( 'cards' => $cards );
    } elseif ( $doc_id === 'curated-lists' ) {
        $genres = array();
        foreach ( ( $body['genres'] ?? array() ) as $g ) {
            $genre = $g['genre'] ?? '';
            if ( ! in_array( $genre, VC_SAVECRAFT_CURATED_GENRES, true ) ) {
                continue;
            }
            $genres[] = array(
                'genre'       => $genre,
                'displayName' => sanitize_text_field( $g['displayName'] ?? '' ),
                'coverUrl'    => ! empty( $g['coverUrl'] ) ? esc_url_raw( $g['coverUrl'] ) : null,
            );
        }
        $fields = array( 'genres' => $genres );
    } else {
        return new WP_REST_Response( array( 'message' => 'Unknown demo-config doc.' ), 400 );
    }

    $result = VC_SaveCraft_Firestore_Client::set_demo_config( $doc_id, $fields );
    if ( is_wp_error( $result ) ) {
        return new WP_REST_Response( array( 'message' => $result->get_error_message() ), 502 );
    }
    return new WP_REST_Response( $fields, 200 );
}

function vc_savecraft_admin_curated_search( $request ) {
    $items = VC_SaveCraft_Firestore_Client::search_curated_items();
    if ( is_wp_error( $items ) ) {
        return new WP_REST_Response( array( 'message' => $items->get_error_message() ), 502 );
    }
    return new WP_REST_Response( $items, 200 );
}
