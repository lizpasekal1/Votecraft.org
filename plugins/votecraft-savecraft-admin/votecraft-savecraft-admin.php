<?php
/**
 * Plugin Name: VoteCraft SaveCraft Admin
 * Description: Staff-only Admin Kanban board for SaveCraft, right inside wp-admin — no separate
 *              SaveCraft login needed. Talks to Firestore server-side through a dedicated,
 *              narrowly-scoped bot account (see includes/class-firestore-client.php); the browser
 *              never sees any Firestore credential, only this plugin's own REST routes.
 * Version: 2.9
 * Author: VoteCraft
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'VC_SAVECRAFT_ADMIN_VERSION', '2.9' );
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

    // Which tab is showing decides which section's script (if any) actually needs to load — each
    // one only ever wires up its own tab's DOM, so there's no reason to ship/run the other three
    // on every page load. `home`/`my-profile` need no script at all.
    $tab = isset( $_GET['tab'] ) ? sanitize_key( $_GET['tab'] ) : 'home';

    if ( $tab === 'kanban' ) {
        wp_enqueue_script(
            'vc-savecraft-admin-kanban',
            VC_SAVECRAFT_ADMIN_PLUGIN_URL . 'admin/js/admin-kanban.js',
            array(),
            VC_SAVECRAFT_ADMIN_VERSION,
            true
        );
        // restNonce is a standard `wp_rest` nonce (10-second-refreshed cookie + nonce pair
        // WordPress already issues to every logged-in admin page) — proves "this request came
        // from a logged-in wp-admin session", same mechanism core itself uses for its own REST
        // calls from admin JS. It's not a credential of its own and grants nothing by itself;
        // every route below still re-checks current_user_can() independently.
        wp_localize_script( 'vc-savecraft-admin-kanban', 'vcSaveCraftAdmin', array(
            'restUrl' => esc_url_raw( rest_url( 'votecraft-savecraft/v1/kanban' ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
        ) );
    }

    if ( $tab === 'demo-content' ) {
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

    if ( $tab === 'curated-lists' ) {
        wp_enqueue_script(
            'vc-savecraft-admin-curated',
            VC_SAVECRAFT_ADMIN_PLUGIN_URL . 'admin/js/admin-curated.js',
            array(),
            VC_SAVECRAFT_ADMIN_VERSION,
            true
        );
        wp_localize_script( 'vc-savecraft-admin-curated', 'vcSaveCraftCurated', array(
            'restUrl'        => esc_url_raw( rest_url( 'votecraft-savecraft/v1/' ) ),
            'nonce'          => wp_create_nonce( 'wp_rest' ),
            'categories'     => VC_SAVECRAFT_CATEGORIES,
            // Friendly display names for the category checklist — per direct request/screenshot
            // ("the tabs should be like the way we set it up on the profile page": Sources/Series/
            // Music/Albums/Games/Films/Literature/Arts). The raw keys above are what's actually
            // stored in enabledCategories (they have to match state.js's CATEGORIES exactly for the
            // app to read them) — this is *only* for the checkbox label text, not the stored value.
            'categoryLabels' => VC_SAVECRAFT_CAT_LABEL,
            'folders'        => VC_SAVECRAFT_CATEGORY_FOLDERS,
        ) );
    }

    if ( $tab === 'admin-users' ) {
        wp_enqueue_script(
            'vc-savecraft-admin-users',
            VC_SAVECRAFT_ADMIN_PLUGIN_URL . 'admin/js/admin-users.js',
            array(),
            VC_SAVECRAFT_ADMIN_VERSION,
            true
        );
        wp_localize_script( 'vc-savecraft-admin-users', 'vcSaveCraftUsers', array(
            'restUrl' => esc_url_raw( rest_url( 'votecraft-savecraft/v1/' ) ),
            'nonce'   => wp_create_nonce( 'wp_rest' ),
            // Only a true site Administrator may edit role labels (direct decision) — everyone
            // else with SaveCraft Admin access can still view the roster, just read-only. The JS
            // never needs to *check* this beyond rendering; the REST route re-checks it for real.
            'canEdit' => current_user_can( 'manage_options' ),
        ) );
    }
}

/* ─── Admin page shell — tabbed: one URL (?tab=<x>) per section, not one long accordion page.
   The board/lists/roster/etc. themselves are rendered by each tab's own JS from REST data (or,
   for My Profile, plain PHP — it's read-only server data, no fetch needed). ─── */

// Definitive list of the 4 real nav destinations (icon + label) — used for both the persistent nav
// bar and the Home dashboard's card grid, so the two never drift out of sync with each other.
function vc_savecraft_nav_tabs() {
    return array(
        'kanban'        => array( 'icon' => '🗂️', 'label' => 'Admin Kanban', 'desc' => 'Shared to-do board with the SaveCraft app.' ),
        'demo-content'  => array( 'icon' => '🎬', 'label' => 'Demo Content', 'desc' => 'Fallback content shown to signed-out visitors.' ),
        'curated-lists' => array( 'icon' => '🏛️', 'label' => 'Curated Lists', 'desc' => 'Nonprofit pages, shared topics, and their items.' ),
        'admin-users'   => array( 'icon' => '👤', 'label' => 'Admin Users', 'desc' => 'Who has SaveCraft Admin access, and their role.' ),
    );
}

function vc_savecraft_tab_url( $tab ) {
    $url = admin_url( 'admin.php?page=vc-savecraft-admin' );
    return $tab === 'home' ? $url : add_query_arg( 'tab', $tab, $url );
}

// Persistent top bar on every tab — the 4 section links (screenshot's "Popular / Latest / …" tab
// row) plus, in place of that screenshot's search box, a link to the CURRENT user's own profile
// (distinct from the "Admin Users" tab, which is the full roster of everyone).
function vc_savecraft_render_nav( $active_tab ) {
    ?>
    <div class="vc-savecraft-nav">
        <div class="vc-savecraft-nav-tabs">
            <?php foreach ( vc_savecraft_nav_tabs() as $key => $t ) : ?>
                <a href="<?php echo esc_url( vc_savecraft_tab_url( $key ) ); ?>" class="vc-savecraft-nav-tab<?php echo $active_tab === $key ? ' active' : ''; ?>">
                    <?php echo esc_html( $t['icon'] . ' ' . $t['label'] ); ?>
                </a>
            <?php endforeach; ?>
        </div>
        <a href="<?php echo esc_url( vc_savecraft_tab_url( 'my-profile' ) ); ?>" class="vc-savecraft-nav-profile<?php echo $active_tab === 'my-profile' ? ' active' : ''; ?>">
            👤 Admin User Profile
        </a>
    </div>
    <?php
}

// Home ("?tab=" absent/unknown) — the white icon-card grid, one card per nav destination, doubling
// as a launcher (per direct request: "white square containers with the icon and link inside").
function vc_savecraft_render_tab_home() {
    ?>
    <div class="vc-savecraft-card-grid">
        <?php foreach ( vc_savecraft_nav_tabs() as $key => $t ) : ?>
            <a class="vc-savecraft-card" href="<?php echo esc_url( vc_savecraft_tab_url( $key ) ); ?>">
                <span class="vc-savecraft-card-icon"><?php echo esc_html( $t['icon'] ); ?></span>
                <span class="vc-savecraft-card-label"><?php echo esc_html( $t['label'] ); ?></span>
                <span class="vc-savecraft-card-desc"><?php echo esc_html( $t['desc'] ); ?></span>
            </a>
        <?php endforeach; ?>
    </div>
    <?php
}

function vc_savecraft_render_tab_kanban() {
    ?>
    <div class="vc-savecraft-section">
        <h2>🗂️ Admin Kanban</h2>
        <p class="description">
            Shared with the SaveCraft app itself — changes made here show up there, and vice versa.
        </p>
        <div id="vc-savecraft-kanban-error" class="notice notice-error" style="display:none"></div>
        <div id="vc-savecraft-kanban-board" class="vc-savecraft-kanban-board">
            <p id="vc-savecraft-kanban-loading">Loading…</p>
        </div>
    </div>
    <?php
}

function vc_savecraft_render_tab_demo_content() {
    ?>
    <div class="vc-savecraft-section">
        <h2>🎬 Demo Content</h2>
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
                    <option value="Literature">Literature</option><option value="Films">Films</option>
                    <option value="Series">Series</option><option value="Games">Games</option>
                    <option value="Music">Music</option><option value="Albums">Albums</option>
                    <option value="Arts">Arts</option><option value="Sources">Sources</option>
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
    <?php
}

// Curated Lists (nonprofits) / Topics / Curated Items — per direct request, these three stay
// together as one destination (their existing collapsible accordions, unchanged), not split into
// three separate tabs.
function vc_savecraft_render_tab_curated_lists() {
    ?>
    <div class="vc-savecraft-section">
        <h2>🏛️ Curated Lists</h2>

        <details class="votecraft-accordion" open>
            <summary>🏛️ Curated Lists (nonprofits)</summary>
            <div class="accordion-content">
                <p class="description">
                    One branded "Cause Curated" page per nonprofit. Each is reachable in the app at
                    <code>genre:&lt;slug&gt;</code>. Pick which category tabs it shows and which shared
                    topics it belongs to. Unpublished lists are ignored by the app.
                </p>
                <div id="vc-savecraft-curated-error" class="notice notice-error" style="display:none"></div>
                <div id="vc-savecraft-curated-lists"><p>Loading…</p></div>
                <p><button type="button" class="button" id="vc-savecraft-curated-list-add">+ Add Nonprofit List</button></p>
            </div>
        </details>

        <details class="votecraft-accordion">
            <summary>🏷️ Topics</summary>
            <div class="accordion-content">
                <p class="description">
                    One shared-cause page per topic (app view <code>topic:&lt;slug&gt;</code>). Its page
                    pools every published nonprofit list tagged with it. Tag lists from the Curated
                    Lists section above.
                </p>
                <div id="vc-savecraft-topics-error" class="notice notice-error" style="display:none"></div>
                <div id="vc-savecraft-topics"><p>Loading…</p></div>
                <p><button type="button" class="button" id="vc-savecraft-topic-add">+ Add Topic</button></p>
            </div>
        </details>

        <details class="votecraft-accordion">
            <summary>📎 Curated Items</summary>
            <div class="accordion-content">
                <p class="description">Add, edit, and remove the resources inside a nonprofit list.</p>
                <div id="vc-savecraft-items-error" class="notice notice-error" style="display:none"></div>
                <p>
                    <label for="vc-savecraft-items-list">List: </label>
                    <select id="vc-savecraft-items-list"><option value="">— pick a list —</option></select>
                </p>
                <div id="vc-savecraft-items"></div>
                <p><button type="button" class="button" id="vc-savecraft-item-add" disabled>+ Add Item</button></p>
            </div>
        </details>
    </div>
    <?php
}

// Admin Users — the roster (new). Every WP user with manage_savecraft_admin, rendered/edited by
// admin-users.js from the /admin-users REST route. Ends with the note the old "Users" accordion
// carried (viewing SaveCraft's own signed-up accounts, not admin staff — paused on Blaze).
function vc_savecraft_render_tab_admin_users() {
    ?>
    <div class="vc-savecraft-section">
        <h2>👤 Admin Users</h2>
        <p class="description">
            Everyone with SaveCraft Admin access, and the role you've assigned them — useful once
            more than one person has access, so it's clear who's responsible for what.
            <?php if ( current_user_can( 'manage_options' ) ) : ?>
                Only a site Administrator (you) can edit these labels.
            <?php else : ?>
                Only a site Administrator can edit these labels — you can view them here.
            <?php endif; ?>
        </p>
        <div id="vc-savecraft-users-error" class="notice notice-error" style="display:none"></div>
        <div id="vc-savecraft-users-list"><p>Loading…</p></div>

        <hr>
        <p class="description">
            Looking for SaveCraft's own signed-up users (the app's actual customers, not admin
            staff)? Not built yet — that needs a separate Firebase Cloud Function (this data isn't
            reachable the same scoped way the sections above are), which in turn needs switching
            the Firebase project off its free Spark plan onto Blaze (pay-as-you-go). Fully
            designed, but paused pending that decision.
        </p>
    </div>
    <?php
}

// My Profile — reachable only via the top-right nav link, not one of the 4 main tabs. Entirely
// server-rendered (just the current user's own WP data), so it needs no JS/REST round trip at all.
function vc_savecraft_render_tab_my_profile() {
    $user = wp_get_current_user();
    $role_label = get_user_meta( $user->ID, '_vc_savecraft_role_label', true );
    $can_edit = current_user_can( 'manage_options' );
    ?>
    <div class="vc-savecraft-section">
        <h2>👤 Admin User Profile</h2>
        <p class="description">Your own SaveCraft Admin access, at a glance.</p>
        <div class="vc-savecraft-profile-card">
            <?php echo get_avatar( $user->ID, 64 ); ?>
            <div class="vc-savecraft-profile-info">
                <p class="vc-savecraft-profile-name"><?php echo esc_html( $user->display_name ); ?></p>
                <p class="vc-savecraft-profile-email"><?php echo esc_html( $user->user_email ); ?></p>
                <p class="vc-savecraft-profile-role">
                    <strong>Role: </strong>
                    <?php if ( $role_label ) : ?>
                        <?php echo esc_html( $role_label ); ?>
                    <?php else : ?>
                        <em>Not set yet<?php echo $can_edit ? ' — set it below.' : '.'; ?></em>
                    <?php endif; ?>
                </p>
            </div>
        </div>
        <?php if ( $can_edit ) : ?>
            <p class="description">
                Set your own (or anyone else's) role label from the
                <a href="<?php echo esc_url( vc_savecraft_tab_url( 'admin-users' ) ); ?>">Admin Users</a> page.
            </p>
        <?php else : ?>
            <p class="description">Only a site Administrator can set role labels.</p>
        <?php endif; ?>
        <p><a href="<?php echo esc_url( admin_url( 'profile.php' ) ); ?>">Edit your full WordPress profile →</a></p>
    </div>
    <?php
}

function vc_savecraft_admin_page() {
    $tab = isset( $_GET['tab'] ) ? sanitize_key( $_GET['tab'] ) : 'home';
    ?>
    <div class="wrap vc-savecraft-admin-wrap">
        <div class="vc-savecraft-header">
            <h1><a href="<?php echo esc_url( vc_savecraft_tab_url( 'home' ) ); ?>" class="vc-savecraft-title-link">SaveCraft Admin</a></h1>
        </div>
        <?php
        vc_savecraft_render_nav( $tab );
        switch ( $tab ) {
            case 'kanban':
                vc_savecraft_render_tab_kanban();
                break;
            case 'demo-content':
                vc_savecraft_render_tab_demo_content();
                break;
            case 'curated-lists':
                vc_savecraft_render_tab_curated_lists();
                break;
            case 'admin-users':
                vc_savecraft_render_tab_admin_users();
                break;
            case 'my-profile':
                vc_savecraft_render_tab_my_profile();
                break;
            default:
                vc_savecraft_render_tab_home();
        }
        ?>
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

    // ── Curated Lists (curated_lists collection) ──
    register_rest_route( 'votecraft-savecraft/v1', '/curated-lists', array(
        'methods'             => 'GET',
        'callback'            => 'vc_savecraft_admin_list_curated_lists',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );
    register_rest_route( 'votecraft-savecraft/v1', '/curated-lists/(?P<slug>[\w-]+)', array(
        'methods'             => 'POST',
        'callback'            => 'vc_savecraft_admin_upsert_curated_list',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
        'args'                => array(
            'slug' => array(
                'required'          => true,
                'validate_callback' => function ( $value ) {
                    return is_string( $value ) && preg_match( '/^[\w-]+$/', $value );
                },
            ),
        ),
    ) );
    register_rest_route( 'votecraft-savecraft/v1', '/curated-lists/(?P<slug>[\w-]+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'vc_savecraft_admin_delete_curated_list',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );

    // ── Topics (curated_topics collection) ──
    register_rest_route( 'votecraft-savecraft/v1', '/curated-topics', array(
        'methods'             => 'GET',
        'callback'            => 'vc_savecraft_admin_list_curated_topics',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );
    register_rest_route( 'votecraft-savecraft/v1', '/curated-topics/(?P<slug>[\w-]+)', array(
        'methods'             => 'POST',
        'callback'            => 'vc_savecraft_admin_upsert_curated_topic',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
        'args'                => array(
            'slug' => array(
                'required'          => true,
                'validate_callback' => function ( $value ) {
                    return is_string( $value ) && preg_match( '/^[\w-]+$/', $value );
                },
            ),
        ),
    ) );
    register_rest_route( 'votecraft-savecraft/v1', '/curated-topics/(?P<slug>[\w-]+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'vc_savecraft_admin_delete_curated_topic',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );

    // ── Curated Items (curated_items collection, scoped to one list's genre) ──
    register_rest_route( 'votecraft-savecraft/v1', '/curated-items', array(
        'methods'             => 'GET',
        'callback'            => 'vc_savecraft_admin_list_curated_items',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );
    register_rest_route( 'votecraft-savecraft/v1', '/curated-items/(?P<id>[\w-]+)', array(
        'methods'             => 'POST',
        'callback'            => 'vc_savecraft_admin_upsert_curated_item',
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
    register_rest_route( 'votecraft-savecraft/v1', '/curated-items/(?P<id>[\w-]+)', array(
        'methods'             => 'DELETE',
        'callback'            => 'vc_savecraft_admin_delete_curated_item',
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );

    // ── Admin Users (WordPress users + user meta — no Firestore involved) ──
    register_rest_route( 'votecraft-savecraft/v1', '/admin-users', array(
        'methods'             => 'GET',
        'callback'            => 'vc_savecraft_admin_list_admin_users',
        // Viewing the roster only needs the shared capability — any SaveCraft Admin can see who
        // else has access. Editing (below) is stricter.
        'permission_callback' => 'vc_savecraft_admin_permission_check',
    ) );
    register_rest_route( 'votecraft-savecraft/v1', '/admin-users/(?P<user_id>\d+)', array(
        'methods'             => 'POST',
        'callback'            => 'vc_savecraft_admin_update_admin_user_role',
        // Stricter than every other route in this plugin, per direct request — only a true site
        // Administrator may relabel who's who, not just anyone with manage_savecraft_admin.
        'permission_callback' => 'vc_savecraft_admin_manage_options_check',
    ) );
}

function vc_savecraft_admin_permission_check() {
    return current_user_can( VC_SAVECRAFT_ADMIN_CAPABILITY );
}

function vc_savecraft_admin_manage_options_check() {
    return current_user_can( 'manage_options' );
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
const VC_SAVECRAFT_CATEGORIES = array( 'Sources', 'Series', 'Music', 'Albums', 'Games', 'Films', 'Literature', 'Arts' );
const VC_SAVECRAFT_CURATED_GENRES = array( 'Top 100', 'Futurism', 'Fantasy', 'Thriller', 'Pop', 'Classic', 'Jazz', 'Comedy' );

// Mirror of storage.js's `defaults` seed — the built-in folder set per category. `_docId => label`.
// Used to populate the folder/tab dropdown in the Curated Items screen and to validate an incoming
// folderId. Same "kept in sync by hand" caveat as the two arrays above.
const VC_SAVECRAFT_CATEGORY_FOLDERS = array(
    'Sources'     => array( 'default-weblinks-websites' => 'Websites', 'default-weblinks-articles' => 'Articles', 'default-weblinks-blogs' => 'News', 'default-weblinks-publications' => 'Publications' ),
    'Series'      => array( 'default-shows-podcasts' => 'Podcasts', 'default-shows-webseries' => 'Web Series', 'default-shows-tutorials' => 'Tutorials', 'default-shows-shortform' => 'Short Form' ),
    'Music'       => array( 'default-musicians-musicians' => 'Musicians' ),
    'Albums'      => array( 'default-music-albums' => 'Albums', 'default-music-playlists' => 'Playlists' ),
    'Games'       => array( 'default-games-console' => 'Console Games', 'default-games-board' => 'Board Games', 'default-games-mobile' => 'Mobile Games', 'default-games-companies' => 'Game Companies' ),
    'Films'       => array( 'default-movies-movies' => 'Movies', 'default-movies-videos' => 'Videos', 'default-movies-directors' => 'Directors', 'default-movies-series' => 'Shows' ),
    'Literature'  => array( 'default-books-books' => 'Books', 'default-books-authors' => 'Authors', 'default-books-pdfs' => 'PDFs', 'default-books-quotes' => 'Quotes' ),
    'Arts'        => array( 'default-art-artists' => 'Artists', 'default-art-dance' => 'Styles', 'default-art-comics' => 'Comics', 'default-art-memes' => 'Memes' ),
);

// Every valid folder id, across every category — used to validate an incoming enabledFolderIds
// list and to detect "every real folder is present" (see vc_savecraft_admin_upsert_curated_list),
// same normalization src/app/js/profile.js's _setFolderAllowed() uses for allowedFolderIds.
function vc_savecraft_all_folder_ids() {
    $all = array();
    foreach ( VC_SAVECRAFT_CATEGORY_FOLDERS as $folders ) {
        $all = array_merge( $all, array_keys( $folders ) );
    }
    return $all;
}

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
                $category = 'Music';
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

/* ─── Curated CMS: nonprofit lists, shared topics, and their items ─────────────────────────────
   All three collections are written through the same bot account isSaveCraftAdmin() covers. The
   permission callback is the shared VC_SAVECRAFT_ADMIN_CAPABILITY check; a per-list ownership
   check for a future scoped "Curated Partner" role slots into vc_savecraft_curated_item_can_edit()
   below without touching anything else. ─── */

// CATEGORIES -> sidebar label, mirror of state.js's CAT_LABEL (only the ones that differ from the
// raw name need an entry; used to derive a list's `rows` from its enabledCategories).
const VC_SAVECRAFT_CAT_LABEL = array(
    'Sources' => 'Sources', 'Literature' => 'Literature', 'Games' => 'Games', 'Films' => 'Films',
    'Music' => 'Music', 'Albums' => 'Albums', 'Series' => 'Series', 'Arts' => 'Arts',
);

function vc_savecraft_wp_error_response( $err ) {
    return new WP_REST_Response( array( 'message' => $err->get_error_message() ), 502 );
}

/* ── curated_lists ── */

function vc_savecraft_admin_list_curated_lists( $request ) {
    $rows = VC_SaveCraft_Firestore_Client::list_collection( 'curated_lists' );
    return is_wp_error( $rows ) ? vc_savecraft_wp_error_response( $rows ) : new WP_REST_Response( $rows, 200 );
}

function vc_savecraft_admin_upsert_curated_list( $request ) {
    $slug = $request->get_param( 'slug' );
    $body = $request->get_json_params();
    if ( ! is_array( $body ) ) {
        return new WP_REST_Response( array( 'message' => 'Invalid request body.' ), 400 );
    }

    $enabled = array();
    foreach ( (array) ( $body['enabledCategories'] ?? array() ) as $c ) {
        if ( in_array( $c, VC_SAVECRAFT_CATEGORIES, true ) && ! in_array( $c, $enabled, true ) ) {
            $enabled[] = $c;
        }
    }
    $topics = array();
    foreach ( (array) ( $body['topics'] ?? array() ) as $t ) {
        if ( is_string( $t ) && preg_match( '/^[\w-]+$/', $t ) ) {
            $topics[] = $t;
        }
    }
    // rows are always derived from enabledCategories so the app's landing page matches the tabs.
    $rows = array();
    foreach ( $enabled as $c ) {
        $rows[] = array( 'category' => $c, 'label' => VC_SAVECRAFT_CAT_LABEL[ $c ] ?? $c );
    }

    // Folder-level narrowing within an enabled category (per direct request: unchecking a folder
    // in the admin screen must hide that folder's card in the app's curated folder-picker,
    // renderCuratedCategoryFolderLanding). null = unrestricted (every folder shows) — the default
    // for any list saved before this field existed, and re-collapsed back to null here whenever
    // every real folder id is present, same normalization src/app/js/profile.js's
    // _setFolderAllowed() uses for allowedFolderIds, so "everything checked" never silently stops
    // covering a folder added later.
    $all_folder_ids = vc_savecraft_all_folder_ids();
    $enabled_folder_ids = null;
    if ( array_key_exists( 'enabledFolderIds', $body ) && is_array( $body['enabledFolderIds'] ) ) {
        $provided = array_values( array_intersect( array_unique( $body['enabledFolderIds'] ), $all_folder_ids ) );
        $enabled_folder_ids = ( count( $provided ) === count( $all_folder_ids ) ) ? null : $provided;
    }

    $wp_owner = isset( $body['wpOwnerUserId'] ) && $body['wpOwnerUserId'] !== '' ? (int) $body['wpOwnerUserId'] : null;
    $client_owner = isset( $body['clientOwnerUid'] ) && $body['clientOwnerUid'] !== '' ? sanitize_text_field( $body['clientOwnerUid'] ) : null;

    $fields = array(
        'name'              => sanitize_text_field( $body['name'] ?? '' ),
        'slug'              => $slug,
        'shortName'         => sanitize_text_field( $body['shortName'] ?? '' ),
        'headline'          => sanitize_text_field( $body['headline'] ?? '' ),
        'description'       => sanitize_textarea_field( $body['description'] ?? '' ),
        'wordmarkUrl'       => ! empty( $body['wordmarkUrl'] ) ? esc_url_raw( $body['wordmarkUrl'] ) : '',
        'iconUrl'          => ! empty( $body['iconUrl'] ) ? esc_url_raw( $body['iconUrl'] ) : '',
        'coverUrl'         => ! empty( $body['coverUrl'] ) ? esc_url_raw( $body['coverUrl'] ) : '',
        'enabledCategories' => $enabled,
        'enabledFolderIds' => $enabled_folder_ids,
        'topics'           => $topics,
        'rows'             => $rows,
        'published'        => ! empty( $body['published'] ),
        'wpOwnerUserId'    => $wp_owner,
        'clientOwnerUid'   => $client_owner,
    );

    $result = VC_SaveCraft_Firestore_Client::upsert_doc( 'curated_lists', $slug, $fields );
    if ( is_wp_error( $result ) ) {
        return vc_savecraft_wp_error_response( $result );
    }
    $fields['_docId'] = $slug;
    return new WP_REST_Response( $fields, 200 );
}

function vc_savecraft_admin_delete_curated_list( $request ) {
    $slug = $request->get_param( 'slug' );
    $result = VC_SaveCraft_Firestore_Client::delete_doc( 'curated_lists', $slug );
    return is_wp_error( $result ) ? vc_savecraft_wp_error_response( $result ) : new WP_REST_Response( array( 'deleted' => $slug ), 200 );
}

/* ── curated_topics ── */

function vc_savecraft_admin_list_curated_topics( $request ) {
    $rows = VC_SaveCraft_Firestore_Client::list_collection( 'curated_topics' );
    return is_wp_error( $rows ) ? vc_savecraft_wp_error_response( $rows ) : new WP_REST_Response( $rows, 200 );
}

function vc_savecraft_admin_upsert_curated_topic( $request ) {
    $slug = $request->get_param( 'slug' );
    $body = $request->get_json_params();
    if ( ! is_array( $body ) ) {
        return new WP_REST_Response( array( 'message' => 'Invalid request body.' ), 400 );
    }
    $fields = array(
        'name'        => sanitize_text_field( $body['name'] ?? '' ),
        'slug'        => $slug,
        'shortName'   => sanitize_text_field( $body['shortName'] ?? '' ),
        'headline'    => sanitize_text_field( $body['headline'] ?? '' ),
        'description' => sanitize_textarea_field( $body['description'] ?? '' ),
        'iconUrl'    => ! empty( $body['iconUrl'] ) ? esc_url_raw( $body['iconUrl'] ) : '',
        'coverUrl'   => ! empty( $body['coverUrl'] ) ? esc_url_raw( $body['coverUrl'] ) : '',
        'published'  => ! empty( $body['published'] ),
    );
    $result = VC_SaveCraft_Firestore_Client::upsert_doc( 'curated_topics', $slug, $fields );
    if ( is_wp_error( $result ) ) {
        return vc_savecraft_wp_error_response( $result );
    }
    $fields['_docId'] = $slug;
    return new WP_REST_Response( $fields, 200 );
}

function vc_savecraft_admin_delete_curated_topic( $request ) {
    $slug = $request->get_param( 'slug' );
    $result = VC_SaveCraft_Firestore_Client::delete_doc( 'curated_topics', $slug );
    return is_wp_error( $result ) ? vc_savecraft_wp_error_response( $result ) : new WP_REST_Response( array( 'deleted' => $slug ), 200 );
}

/* ── curated_items (scoped to one list) ── */

// Loads a curated_lists doc, or a WP_Error. Cached per-request.
function vc_savecraft_get_curated_list( $slug ) {
    static $cache = array();
    if ( ! array_key_exists( $slug, $cache ) ) {
        $cache[ $slug ] = VC_SaveCraft_Firestore_Client::get_doc( 'curated_lists', $slug );
    }
    return $cache[ $slug ];
}

// Future-proofing seam: today this is just the shared capability, but a scoped "Curated Partner"
// (Phase 2) would additionally require ( (int) $list['wpOwnerUserId'] === get_current_user_id() ).
function vc_savecraft_curated_item_can_edit( $list ) {
    return current_user_can( VC_SAVECRAFT_ADMIN_CAPABILITY );
}

function vc_savecraft_admin_list_curated_items( $request ) {
    $slug = sanitize_text_field( $request->get_param( 'list' ) ?? '' );
    if ( $slug === '' ) {
        return new WP_REST_Response( array( 'message' => 'Missing ?list=<slug>.' ), 400 );
    }
    $items = VC_SaveCraft_Firestore_Client::list_curated_items_for_genre( $slug );
    return is_wp_error( $items ) ? vc_savecraft_wp_error_response( $items ) : new WP_REST_Response( $items, 200 );
}

function vc_savecraft_admin_upsert_curated_item( $request ) {
    $id   = $request->get_param( 'id' );
    $body = $request->get_json_params();
    if ( ! is_array( $body ) ) {
        return new WP_REST_Response( array( 'message' => 'Invalid request body.' ), 400 );
    }

    $list_slug = sanitize_text_field( $body['list'] ?? '' );
    $list = vc_savecraft_get_curated_list( $list_slug );
    if ( is_wp_error( $list ) ) {
        return vc_savecraft_wp_error_response( $list );
    }
    if ( ! $list ) {
        return new WP_REST_Response( array( 'message' => 'Unknown list "' . $list_slug . '".' ), 400 );
    }
    if ( ! vc_savecraft_curated_item_can_edit( $list ) ) {
        return new WP_REST_Response( array( 'message' => 'Not allowed to edit this list.' ), 403 );
    }

    $enabled  = (array) ( $list['enabledCategories'] ?? array() );
    $category = $body['category'] ?? '';
    if ( ! in_array( $category, $enabled, true ) ) {
        return new WP_REST_Response( array( 'message' => 'Category "' . $category . '" is not enabled for this list.' ), 400 );
    }

    $folder_id = $body['folderId'] ?? '';
    $valid_folders = VC_SAVECRAFT_CATEGORY_FOLDERS[ $category ] ?? array();
    if ( $folder_id !== '' && ! isset( $valid_folders[ $folder_id ] ) ) {
        $folder_id = '';
    }

    $fields = array(
        'id'       => $id,
        'genre'    => $list_slug,          // == the list's slug; forced, never taken from the body
        'category' => $category,
        'folderId' => $folder_id,
        'title'    => sanitize_text_field( $body['title'] ?? '' ),
        'url'      => ! empty( $body['url'] ) ? esc_url_raw( $body['url'] ) : '',
        'imageUrl' => ! empty( $body['imageUrl'] ) ? esc_url_raw( $body['imageUrl'] ) : '',
        'notes'    => sanitize_textarea_field( $body['notes'] ?? '' ),
    );

    $result = VC_SaveCraft_Firestore_Client::upsert_doc( 'curated_items', $id, $fields );
    if ( is_wp_error( $result ) ) {
        return vc_savecraft_wp_error_response( $result );
    }
    $fields['_docId'] = $id;
    return new WP_REST_Response( $fields, 200 );
}

function vc_savecraft_admin_delete_curated_item( $request ) {
    $id = $request->get_param( 'id' );
    // A DELETE has no body; scope-check via the doc's own genre would need a fetch. For the demo
    // (admin-only) the shared capability check on the route is sufficient; Phase 2's scoped role
    // adds a get_doc()+ownership check here.
    $result = VC_SaveCraft_Firestore_Client::delete_doc( 'curated_items', $id );
    return is_wp_error( $result ) ? vc_savecraft_wp_error_response( $result ) : new WP_REST_Response( array( 'deleted' => $id ), 200 );
}

/* ── Admin Users — plain WordPress user data (get_users() + user meta), no Firestore ── */

// Every WP user who currently has manage_savecraft_admin, however they got it (the Administrator
// role by default, or an individually-granted capability via a role-editor plugin). Deliberately
// NOT get_users(['capability' => ...]) — that arg's behavior/version support has shifted across
// WP releases; a plain user_can() filter over every user is slower but unambiguous.
function vc_savecraft_get_admin_users() {
    $admins = array_values( array_filter( get_users(), function ( $u ) {
        return user_can( $u, VC_SAVECRAFT_ADMIN_CAPABILITY );
    } ) );
    usort( $admins, function ( $a, $b ) {
        return strcasecmp( $a->display_name, $b->display_name );
    } );
    return $admins;
}

function vc_savecraft_admin_list_admin_users( $request ) {
    $rows = array_map( function ( $u ) {
        return array(
            'id'          => $u->ID,
            'name'        => $u->display_name,
            'email'       => $u->user_email,
            'avatarUrl'   => get_avatar_url( $u->ID, array( 'size' => 80 ) ),
            'roleLabel'   => get_user_meta( $u->ID, '_vc_savecraft_role_label', true ),
            'isSiteAdmin' => user_can( $u, 'manage_options' ),
        );
    }, vc_savecraft_get_admin_users() );
    return new WP_REST_Response( $rows, 200 );
}

function vc_savecraft_admin_update_admin_user_role( $request ) {
    $user_id = (int) $request->get_param( 'user_id' );
    $user = get_user_by( 'id', $user_id );
    // Only lets you label someone who actually has SaveCraft Admin access — not an arbitrary WP
    // user id — keeping this roster's only meaning "who has access, and what's their role".
    if ( ! $user || ! user_can( $user, VC_SAVECRAFT_ADMIN_CAPABILITY ) ) {
        return new WP_REST_Response( array( 'message' => 'That user does not have SaveCraft Admin access.' ), 400 );
    }
    $body = $request->get_json_params();
    if ( ! is_array( $body ) ) {
        return new WP_REST_Response( array( 'message' => 'Invalid request body.' ), 400 );
    }
    $role_label = sanitize_text_field( $body['roleLabel'] ?? '' );
    update_user_meta( $user_id, '_vc_savecraft_role_label', $role_label );
    return new WP_REST_Response( array( 'id' => $user_id, 'roleLabel' => $role_label ), 200 );
}
