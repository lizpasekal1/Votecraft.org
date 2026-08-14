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

define( 'VC_SAVECRAFT_ADMIN_VERSION', '1.0' );
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
