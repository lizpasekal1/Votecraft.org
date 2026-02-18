<?php
/**
 * Plugin Name: VoteCraft Sidebar Navigation
 * Description: Adds a Duolingo-style fixed left sidebar navigation with admin settings.
 * Version: 1.0
 * Author: VoteCraft
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'VC_SIDEBAR_VERSION', '1.9' );
define( 'VC_SIDEBAR_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'VC_SIDEBAR_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/* ─── Default settings ─── */

function vc_sidebar_defaults() {
    return array(
        'logo_url'        => '',
        'menu_items'      => array(),
        'enabled_pages'   => array(),
        'colors'          => array(
            'sidebar_bg'       => '#131f24',
            'text'             => '#afafaf',
            'text_hover'       => '#ffffff',
            'active_highlight' => '#1b3a4b',
            'active_text'      => '#ffffff',
            'active_border'    => '#47d4a0',
        ),
        'mobile_style'    => 'drawer',
        'collapsed_width' => 80,
        'expanded_width'  => 250,
        'menu_spacing'    => 4,
    );
}

function vc_sidebar_get_settings() {
    $defaults = vc_sidebar_defaults();
    $settings = get_option( 'votecraft_sidebar_settings', $defaults );
    return wp_parse_args( $settings, $defaults );
}

/* ─── Gather theme + Elementor palette colors for color pickers ─── */

function vc_sidebar_get_palette_colors() {
    $colors = array();

    // WordPress theme editor color palette
    $theme_palette = get_theme_support( 'editor-color-palette' );
    if ( $theme_palette && is_array( $theme_palette[0] ) ) {
        foreach ( $theme_palette[0] as $c ) {
            if ( ! empty( $c['color'] ) ) {
                $colors[] = $c['color'];
            }
        }
    }

    // Elementor global colors (system + custom)
    if ( defined( 'ELEMENTOR_VERSION' ) && class_exists( '\Elementor\Plugin' ) ) {
        try {
            $kit = \Elementor\Plugin::$instance->kits_manager->get_active_kit();
            if ( $kit ) {
                foreach ( array( 'system_colors', 'custom_colors' ) as $key ) {
                    $set = $kit->get_settings( $key );
                    if ( is_array( $set ) ) {
                        foreach ( $set as $c ) {
                            if ( ! empty( $c['color'] ) ) {
                                $colors[] = $c['color'];
                            }
                        }
                    }
                }
            }
        } catch ( \Exception $e ) {
            // Elementor not fully loaded — skip
        }
    }

    // Fallback if nothing found
    if ( empty( $colors ) ) {
        $colors = array( '#ffffff', '#000000', '#47d4a0', '#2563eb', '#ef4444', '#f59e0b' );
    }

    return array_values( array_unique( $colors ) );
}

/* ─── Admin menu ─── */

add_action( 'admin_menu', 'vc_sidebar_admin_menu' );

function vc_sidebar_admin_menu() {
    add_options_page(
        'VoteCraft Sidebar',
        'VoteCraft Sidebar',
        'manage_options',
        'vc-sidebar',
        'vc_sidebar_admin_page'
    );
}

/* ─── Admin assets ─── */

add_action( 'admin_enqueue_scripts', 'vc_sidebar_admin_assets' );

function vc_sidebar_admin_assets( $hook ) {
    if ( $hook !== 'settings_page_vc-sidebar' ) {
        return;
    }
    wp_enqueue_style( 'wp-color-picker' );
    wp_enqueue_script( 'wp-color-picker' );
    wp_enqueue_media();
    wp_enqueue_script( 'jquery-ui-sortable' );
    wp_enqueue_style( 'dashicons' );
    wp_enqueue_style(
        'vc-sidebar-admin',
        VC_SIDEBAR_PLUGIN_URL . 'admin/admin.css',
        array(),
        VC_SIDEBAR_VERSION
    );
}

/* ─── Save settings ─── */

add_action( 'admin_init', 'vc_sidebar_handle_save' );

function vc_sidebar_handle_save() {
    if ( ! isset( $_POST['vc_sidebar_nonce'] ) ) {
        return;
    }
    if ( ! wp_verify_nonce( $_POST['vc_sidebar_nonce'], 'vc_sidebar_save' ) ) {
        return;
    }
    if ( ! current_user_can( 'manage_options' ) ) {
        return;
    }

    $settings = vc_sidebar_defaults();

    // Logo
    $settings['logo_url'] = esc_url_raw( $_POST['vc_logo_url'] ?? '' );

    // Menu items
    $items = array();
    if ( ! empty( $_POST['vc_menu_icon'] ) && is_array( $_POST['vc_menu_icon'] ) ) {
        foreach ( $_POST['vc_menu_icon'] as $i => $icon ) {
            $label = sanitize_text_field( $_POST['vc_menu_label'][ $i ] ?? '' );
            $url   = esc_url_raw( $_POST['vc_menu_url'][ $i ] ?? '' );
            if ( $label && $url ) {
                $icon_type   = sanitize_text_field( $_POST['vc_menu_icon_type'][ $i ] ?? 'dashicon' );
                $custom_icon = esc_url_raw( $_POST['vc_menu_custom_icon'][ $i ] ?? '' );
                $icon_color  = sanitize_hex_color( $_POST['vc_menu_icon_color'][ $i ] ?? '' );
                $items[] = array(
                    'icon'        => sanitize_text_field( $icon ),
                    'icon_type'   => $icon_type,
                    'custom_icon' => $custom_icon,
                    'icon_color'  => $icon_color ?: '',
                    'label'       => $label,
                    'url'         => $url,
                );
            }
        }
    }
    $settings['menu_items'] = $items;

    // Enabled pages
    $settings['enabled_pages'] = array_map( 'intval', $_POST['vc_enabled_pages'] ?? array() );

    // Colors
    $settings['colors'] = array(
        'sidebar_bg'       => sanitize_hex_color( $_POST['vc_color_sidebar_bg'] ?? '#131f24' ),
        'text'             => sanitize_hex_color( $_POST['vc_color_text'] ?? '#afafaf' ),
        'text_hover'       => sanitize_hex_color( $_POST['vc_color_text_hover'] ?? '#ffffff' ),
        'active_highlight' => sanitize_hex_color( $_POST['vc_color_active_highlight'] ?? '#1b3a4b' ),
        'active_text'      => sanitize_hex_color( $_POST['vc_color_active_text'] ?? '#ffffff' ),
        'active_border'    => sanitize_hex_color( $_POST['vc_color_active_border'] ?? '#47d4a0' ),
    );

    // Mobile style
    $settings['mobile_style'] = in_array( $_POST['vc_mobile_style'] ?? '', array( 'drawer', 'tabs' ), true )
        ? $_POST['vc_mobile_style']
        : 'drawer';

    // Widths
    $settings['collapsed_width'] = intval( $_POST['vc_collapsed_width'] ?? 80 );
    $settings['expanded_width']  = intval( $_POST['vc_expanded_width'] ?? 250 );

    // Menu spacing
    $settings['menu_spacing'] = intval( $_POST['vc_menu_spacing'] ?? 4 );

    update_option( 'votecraft_sidebar_settings', $settings );

    add_settings_error( 'vc_sidebar', 'saved', 'Settings saved.', 'updated' );
}

/* ─── Admin page ─── */

function vc_sidebar_admin_page() {
    $s = vc_sidebar_get_settings();

    // Popular dashicons for the selector
    $icon_options = array(
        'dashicons-admin-home'       => 'Home',
        'dashicons-megaphone'        => 'Megaphone',
        'dashicons-admin-users'      => 'Users',
        'dashicons-money-alt'        => 'Money',
        'dashicons-heart'            => 'Heart',
        'dashicons-info'             => 'Info',
        'dashicons-admin-page'       => 'Page',
        'dashicons-chart-bar'        => 'Chart',
        'dashicons-email'            => 'Email',
        'dashicons-share'            => 'Share',
        'dashicons-star-filled'      => 'Star',
        'dashicons-awards'           => 'Award',
        'dashicons-lightbulb'        => 'Lightbulb',
        'dashicons-groups'           => 'Groups',
        'dashicons-location'         => 'Location',
        'dashicons-calendar'         => 'Calendar',
        'dashicons-shield'           => 'Shield',
        'dashicons-thumbs-up'        => 'Thumbs Up',
        'dashicons-visibility'       => 'Eye',
        'dashicons-welcome-learn-more' => 'Learn',
        'dashicons-book'             => 'Book',
        'dashicons-portfolio'        => 'Portfolio',
        'dashicons-games'            => 'Games',
        'dashicons-tickets-alt'      => 'Tickets',
        'dashicons-cart'             => 'Cart',
        'dashicons-food'             => 'Food',
        'dashicons-hammer'           => 'Tools',
        'dashicons-flag'             => 'Flag',
    );
    ?>
    <div class="wrap">
        <h1>VoteCraft Sidebar Navigation</h1>
        <?php settings_errors( 'vc_sidebar' ); ?>

        <form method="post">
            <?php wp_nonce_field( 'vc_sidebar_save', 'vc_sidebar_nonce' ); ?>

            <!-- Logo -->
            <h2>Logo</h2>
            <table class="form-table">
                <tr>
                    <th>Sidebar Logo</th>
                    <td>
                        <input type="text" name="vc_logo_url" id="vc-logo-url"
                               value="<?php echo esc_attr( $s['logo_url'] ); ?>"
                               class="regular-text" placeholder="https://...">
                        <button type="button" class="button" id="vc-logo-upload">Upload</button>
                        <?php if ( $s['logo_url'] ) : ?>
                            <br><img src="<?php echo esc_url( $s['logo_url'] ); ?>"
                                     style="max-height:40px;margin-top:8px;">
                        <?php endif; ?>
                    </td>
                </tr>
            </table>

            <!-- Menu Items -->
            <h2>Menu Items</h2>
            <p class="description">Add sidebar navigation links. Each item has an icon, label, and URL.</p>
            <table class="widefat vc-menu-table" id="vc-menu-items">
                <thead>
                    <tr>
                        <th style="width:30px"></th>
                        <th style="width:50px">#</th>
                        <th style="width:280px">Icon</th>
                        <th>Label</th>
                        <th>URL</th>
                        <th style="width:80px">Color</th>
                        <th style="width:60px"></th>
                    </tr>
                </thead>
                <tbody>
                    <?php
                    if ( ! empty( $s['menu_items'] ) ) :
                        foreach ( $s['menu_items'] as $i => $item ) :
                            $icon_type   = $item['icon_type'] ?? 'dashicon';
                            $custom_icon = $item['custom_icon'] ?? '';
                            $icon_color  = $item['icon_color'] ?? '';
                            ?>
                            <tr class="vc-menu-row">
                                <td class="vc-drag-handle" title="Drag to reorder"><span class="dashicons dashicons-menu"></span></td>
                                <td class="vc-row-num"><?php echo $i + 1; ?></td>
                                <td>
                                    <input type="hidden" name="vc_menu_icon_type[]" class="vc-icon-type-val" value="<?php echo esc_attr( $icon_type ); ?>">
                                    <input type="hidden" name="vc_menu_custom_icon[]" class="vc-custom-icon-val" value="<?php echo esc_attr( $custom_icon ); ?>">
                                    <div class="vc-icon-toggle">
                                        <label><input type="radio" class="vc-icon-type-radio" name="vc_icon_type_<?php echo $i; ?>" value="dashicon" <?php checked( $icon_type, 'dashicon' ); ?>> Dashicon</label>
                                        <label><input type="radio" class="vc-icon-type-radio" name="vc_icon_type_<?php echo $i; ?>" value="custom" <?php checked( $icon_type, 'custom' ); ?>> Custom</label>
                                    </div>
                                    <div class="vc-dashicon-picker" <?php echo $icon_type === 'custom' ? 'style="display:none"' : ''; ?>>
                                        <select name="vc_menu_icon[]" class="vc-icon-select">
                                            <?php foreach ( $icon_options as $val => $lbl ) : ?>
                                                <option value="<?php echo esc_attr( $val ); ?>"
                                                    <?php selected( $item['icon'], $val ); ?>>
                                                    <?php echo esc_html( $lbl ); ?>
                                                </option>
                                            <?php endforeach; ?>
                                        </select>
                                        <span class="dashicons <?php echo esc_attr( $item['icon'] ); ?> vc-icon-preview"></span>
                                    </div>
                                    <div class="vc-custom-icon-picker" <?php echo $icon_type === 'dashicon' ? 'style="display:none"' : ''; ?>>
                                        <button type="button" class="button vc-custom-icon-upload">Upload Icon</button>
                                        <?php if ( $custom_icon ) : ?>
                                            <img src="<?php echo esc_url( $custom_icon ); ?>" class="vc-custom-icon-preview" style="height:28px;width:28px;object-fit:contain;vertical-align:middle;margin-left:6px;">
                                        <?php else : ?>
                                            <img src="" class="vc-custom-icon-preview" style="height:28px;width:28px;object-fit:contain;vertical-align:middle;margin-left:6px;display:none;">
                                        <?php endif; ?>
                                        <button type="button" class="button vc-custom-icon-remove" title="Remove" <?php echo $custom_icon ? '' : 'style="display:none"'; ?>>&times;</button>
                                    </div>
                                </td>
                                <td><input type="text" name="vc_menu_label[]"
                                           value="<?php echo esc_attr( $item['label'] ); ?>"
                                           class="regular-text" placeholder="Menu label"></td>
                                <td><input type="text" name="vc_menu_url[]"
                                           value="<?php echo esc_attr( $item['url'] ); ?>"
                                           class="regular-text" placeholder="/page-slug/"></td>
                                <td><input type="text" name="vc_menu_icon_color[]"
                                           value="<?php echo esc_attr( $icon_color ?: '#ffffff' ); ?>"
                                           class="vc-icon-color-picker"
                                           data-default-color="#ffffff"></td>
                                <td>
                                    <button type="button" class="button vc-remove-row" title="Remove">&times;</button>
                                </td>
                            </tr>
                            <?php
                        endforeach;
                    endif;
                    ?>
                </tbody>
            </table>
            <p><button type="button" class="button button-secondary" id="vc-add-menu-item">+ Add Menu Item</button></p>

            <!-- Page Selector -->
            <h2>Show Sidebar On</h2>
            <p class="description">Select which pages display the sidebar navigation.</p>
            <fieldset class="vc-page-selector">
                <?php
                // Build hierarchical page tree sorted alphabetically
                $all_pages = get_pages( array( 'sort_column' => 'post_title', 'sort_order' => 'ASC' ) );
                $children  = array();
                $roots     = array();
                foreach ( $all_pages as $pg ) {
                    $children[ $pg->post_parent ][] = $pg;
                }
                // Recursive renderer
                function vc_render_page_tree( $parent_id, $children, $enabled, $depth = 0 ) {
                    if ( empty( $children[ $parent_id ] ) ) return;
                    foreach ( $children[ $parent_id ] as $pg ) {
                        $indent = str_repeat( '&mdash; ', $depth );
                        ?>
                        <label style="<?php echo $depth ? 'padding-left:' . ( $depth * 20 ) . 'px;' : ''; ?>">
                            <input type="checkbox" name="vc_enabled_pages[]"
                                   value="<?php echo intval( $pg->ID ); ?>"
                                   <?php checked( in_array( $pg->ID, $enabled, true ) ); ?>>
                            <?php echo $indent . esc_html( $pg->post_title ); ?>
                            <span class="description">(ID: <?php echo $pg->ID; ?>)</span>
                        </label><br>
                        <?php
                        vc_render_page_tree( $pg->ID, $children, $enabled, $depth + 1 );
                    }
                }
                vc_render_page_tree( 0, $children, $s['enabled_pages'] );
                ?>
            </fieldset>

            <!-- Colors -->
            <h2>Colors</h2>
            <table class="form-table">
                <tr>
                    <th>Sidebar Background</th>
                    <td><input type="text" name="vc_color_sidebar_bg"
                               value="<?php echo esc_attr( $s['colors']['sidebar_bg'] ); ?>"
                               class="vc-color-picker"></td>
                </tr>
                <tr>
                    <th>Link Text (unselected)</th>
                    <td><input type="text" name="vc_color_text"
                               value="<?php echo esc_attr( $s['colors']['text'] ); ?>"
                               class="vc-color-picker">
                        <p class="description">Color of menu links that are NOT active</p></td>
                </tr>
                <tr>
                    <th>Link Text (hover)</th>
                    <td><input type="text" name="vc_color_text_hover"
                               value="<?php echo esc_attr( $s['colors']['text_hover'] ); ?>"
                               class="vc-color-picker">
                        <p class="description">Color when hovering over an unselected link</p></td>
                </tr>
                <tr>
                    <th>Active Link Background</th>
                    <td><input type="text" name="vc_color_active_highlight"
                               value="<?php echo esc_attr( $s['colors']['active_highlight'] ); ?>"
                               class="vc-color-picker">
                        <p class="description">Background color of the selected/active pill</p></td>
                </tr>
                <tr>
                    <th>Active Link Text</th>
                    <td><input type="text" name="vc_color_active_text"
                               value="<?php echo esc_attr( $s['colors']['active_text'] ); ?>"
                               class="vc-color-picker">
                        <p class="description">Text color of the selected/active link</p></td>
                </tr>
                <tr>
                    <th>Active Link Border</th>
                    <td><input type="text" name="vc_color_active_border"
                               value="<?php echo esc_attr( $s['colors']['active_border'] ?? '#47d4a0' ); ?>"
                               class="vc-color-picker">
                        <p class="description">Border color around the active pill</p></td>
                </tr>
            </table>

            <!-- Layout -->
            <h2>Layout</h2>
            <table class="form-table">
                <tr>
                    <th>Collapsed Width (px)</th>
                    <td><input type="number" name="vc_collapsed_width"
                               value="<?php echo intval( $s['collapsed_width'] ); ?>"
                               min="50" max="120" step="5"></td>
                </tr>
                <tr>
                    <th>Expanded Width (px)</th>
                    <td><input type="number" name="vc_expanded_width"
                               value="<?php echo intval( $s['expanded_width'] ); ?>"
                               min="150" max="400" step="10"></td>
                </tr>
                <tr>
                    <th>Menu Item Spacing (px)</th>
                    <td><input type="number" name="vc_menu_spacing"
                               value="<?php echo intval( $s['menu_spacing'] ?? 4 ); ?>"
                               min="0" max="40" step="1">
                        <p class="description">Vertical gap between menu items (default: 4px)</p></td>
                </tr>
                <tr>
                    <th>Mobile Style</th>
                    <td>
                        <label>
                            <input type="radio" name="vc_mobile_style" value="drawer"
                                   <?php checked( $s['mobile_style'], 'drawer' ); ?>>
                            Hamburger Drawer (slides from left)
                        </label><br>
                        <label>
                            <input type="radio" name="vc_mobile_style" value="tabs"
                                   <?php checked( $s['mobile_style'], 'tabs' ); ?>>
                            Bottom Tab Bar (fixed at bottom)
                        </label>
                    </td>
                </tr>
            </table>

            <?php submit_button( 'Save Settings' ); ?>
        </form>
    </div>

    <!-- Admin JS (inline to keep it simple) -->
    <script>
    jQuery(function($) {
        // Theme + Elementor palette colors
        var vcPalette = <?php echo json_encode( vc_sidebar_get_palette_colors() ); ?>;

        // Color pickers (global settings)
        $('.vc-color-picker').wpColorPicker({ palettes: vcPalette });

        // Per-icon color pickers
        $('.vc-icon-color-picker').wpColorPicker({ palettes: vcPalette });

        // Media uploader for logo
        $('#vc-logo-upload').on('click', function(e) {
            e.preventDefault();
            var frame = wp.media({ title: 'Select Logo', multiple: false });
            frame.on('select', function() {
                var url = frame.state().get('selection').first().toJSON().url;
                $('#vc-logo-url').val(url);
            });
            frame.open();
        });

        // Icon preview update
        $(document).on('change', '.vc-icon-select', function() {
            $(this).next('.vc-icon-preview')
                   .attr('class', 'dashicons ' + $(this).val() + ' vc-icon-preview');
        });

        // Icon type toggle (dashicon vs custom)
        $(document).on('change', '.vc-icon-type-radio', function() {
            var row = $(this).closest('.vc-menu-row');
            var val = $(this).val();
            row.find('.vc-icon-type-val').val(val);
            if (val === 'dashicon') {
                row.find('.vc-dashicon-picker').show();
                row.find('.vc-custom-icon-picker').hide();
            } else {
                row.find('.vc-dashicon-picker').hide();
                row.find('.vc-custom-icon-picker').show();
            }
        });

        // Custom icon upload
        $(document).on('click', '.vc-custom-icon-upload', function(e) {
            e.preventDefault();
            var row = $(this).closest('.vc-menu-row');
            var frame = wp.media({ title: 'Select Icon', multiple: false });
            frame.on('select', function() {
                var url = frame.state().get('selection').first().toJSON().url;
                row.find('.vc-custom-icon-val').val(url);
                row.find('.vc-custom-icon-preview').attr('src', url).show();
                row.find('.vc-custom-icon-remove').show();
            });
            frame.open();
        });

        // Remove custom icon
        $(document).on('click', '.vc-custom-icon-remove', function() {
            var row = $(this).closest('.vc-menu-row');
            row.find('.vc-custom-icon-val').val('');
            row.find('.vc-custom-icon-preview').attr('src', '').hide();
            $(this).hide();
        });

        // Drag-to-reorder with jQuery UI Sortable
        $('#vc-menu-items tbody').sortable({
            handle: '.vc-drag-handle',
            axis: 'y',
            cursor: 'grabbing',
            placeholder: 'vc-sortable-placeholder',
            helper: function(e, tr) {
                var originals = tr.children();
                var helper = tr.clone();
                helper.children().each(function(i) {
                    $(this).width(originals.eq(i).width());
                });
                return helper;
            },
            update: function() {
                renumber();
            }
        });

        // Add menu item
        var iconOptions = <?php echo json_encode( $icon_options ); ?>;
        var rowCounter = <?php echo count( $s['menu_items'] ); ?>;
        $('#vc-add-menu-item').on('click', function() {
            var opts = '';
            $.each(iconOptions, function(val, lbl) {
                opts += '<option value="' + val + '">' + lbl + '</option>';
            });
            var rn = 'vc_icon_type_' + rowCounter++;
            var row = '<tr class="vc-menu-row">' +
                '<td class="vc-drag-handle" title="Drag to reorder"><span class="dashicons dashicons-menu"></span></td>' +
                '<td class="vc-row-num"></td>' +
                '<td>' +
                '<input type="hidden" name="vc_menu_icon_type[]" class="vc-icon-type-val" value="dashicon">' +
                '<input type="hidden" name="vc_menu_custom_icon[]" class="vc-custom-icon-val" value="">' +
                '<div class="vc-icon-toggle">' +
                '<label><input type="radio" class="vc-icon-type-radio" name="' + rn + '" value="dashicon" checked> Dashicon</label> ' +
                '<label><input type="radio" class="vc-icon-type-radio" name="' + rn + '" value="custom"> Custom</label>' +
                '</div>' +
                '<div class="vc-dashicon-picker">' +
                '<select name="vc_menu_icon[]" class="vc-icon-select">' + opts + '</select>' +
                ' <span class="dashicons dashicons-admin-home vc-icon-preview"></span>' +
                '</div>' +
                '<div class="vc-custom-icon-picker" style="display:none">' +
                '<button type="button" class="button vc-custom-icon-upload">Upload Icon</button>' +
                '<img src="" class="vc-custom-icon-preview" style="height:28px;width:28px;object-fit:contain;vertical-align:middle;margin-left:6px;display:none;">' +
                ' <button type="button" class="button vc-custom-icon-remove" title="Remove" style="display:none">&times;</button>' +
                '</div>' +
                '</td>' +
                '<td><input type="text" name="vc_menu_label[]" class="regular-text" placeholder="Menu label"></td>' +
                '<td><input type="text" name="vc_menu_url[]" class="regular-text" placeholder="/page-slug/"></td>' +
                '<td><input type="text" name="vc_menu_icon_color[]" value="#ffffff" class="vc-icon-color-picker" data-default-color="#ffffff"></td>' +
                '<td>' +
                '<button type="button" class="button vc-remove-row" title="Remove">&times;</button>' +
                '</td></tr>';
            var $row = $(row);
            $('#vc-menu-items tbody').append($row);
            $row.find('.vc-icon-color-picker').wpColorPicker({ palettes: vcPalette });
            renumber();
        });

        // Remove row
        $(document).on('click', '.vc-remove-row', function() {
            $(this).closest('tr').remove();
            renumber();
        });

        function renumber() {
            $('#vc-menu-items tbody .vc-menu-row').each(function(i) {
                $(this).find('.vc-row-num').text(i + 1);
            });
        }
    });
    </script>
    <?php
}

/* ─── Frontend: should we show sidebar on this page? ─── */

function vc_sidebar_is_active() {
    if ( is_admin() ) {
        return false;
    }
    $s = vc_sidebar_get_settings();
    if ( empty( $s['enabled_pages'] ) || empty( $s['menu_items'] ) ) {
        return false;
    }

    // Check the current page ID
    $current_id = get_queried_object_id();

    // Also check the front page setting — WordPress can return 0 for some front page configs
    if ( is_front_page() || is_home() ) {
        $front_id = (int) get_option( 'page_on_front' );
        $blog_id  = (int) get_option( 'page_for_posts' );
        if ( in_array( $front_id, $s['enabled_pages'], true ) ||
             in_array( $blog_id, $s['enabled_pages'], true ) ) {
            return true;
        }
    }

    return in_array( $current_id, $s['enabled_pages'], true );
}

/* ─── Frontend: enqueue assets ─── */

add_action( 'wp_enqueue_scripts', 'vc_sidebar_enqueue' );

function vc_sidebar_enqueue() {
    if ( ! vc_sidebar_is_active() ) {
        return;
    }
    $s = vc_sidebar_get_settings();

    wp_enqueue_style( 'dashicons' );
    wp_enqueue_style(
        'vc-sidebar-nav',
        VC_SIDEBAR_PLUGIN_URL . 'css/sidebar-nav.css',
        array( 'dashicons' ),
        VC_SIDEBAR_VERSION
    );

    // Inject CSS custom properties for colors & widths
    $custom_css = ':root {' .
        '--vc-sidebar-bg: '            . esc_attr( $s['colors']['sidebar_bg'] )       . ';' .
        '--vc-sidebar-text: '          . esc_attr( $s['colors']['text'] )             . ';' .
        '--vc-sidebar-hover: '         . esc_attr( $s['colors']['text_hover'] )       . ';' .
        '--vc-sidebar-active: '        . esc_attr( $s['colors']['active_highlight'] ) . ';' .
        '--vc-sidebar-active-text: '   . esc_attr( $s['colors']['active_text'] )      . ';' .
        '--vc-sidebar-active-border: ' . esc_attr( $s['colors']['active_border'] ?? '#47d4a0' ) . ';' .
        '--vc-sidebar-width: '         . intval( $s['collapsed_width'] )              . 'px;' .
        '--vc-sidebar-expanded: '      . intval( $s['expanded_width'] )               . 'px;' .
        '--vc-sidebar-spacing: '       . intval( $s['menu_spacing'] ?? 4 )             . 'px;' .
    '}';
    wp_add_inline_style( 'vc-sidebar-nav', $custom_css );

    wp_enqueue_script(
        'vc-sidebar-nav',
        VC_SIDEBAR_PLUGIN_URL . 'js/sidebar-nav.js',
        array(),
        VC_SIDEBAR_VERSION,
        true
    );
}

/* ─── Frontend: body class ─── */

add_filter( 'body_class', 'vc_sidebar_body_class' );

function vc_sidebar_body_class( $classes ) {
    if ( vc_sidebar_is_active() ) {
        $s = vc_sidebar_get_settings();
        $classes[] = 'vc-has-sidebar';
        $classes[] = 'vc-mobile-' . esc_attr( $s['mobile_style'] );
    }
    return $classes;
}

/* ─── Frontend: render sidebar HTML ─── */

// Primary: inject right after <body>
add_action( 'wp_body_open', 'vc_sidebar_render' );
// Fallback: if theme doesn't call wp_body_open(), inject before </body>
add_action( 'wp_footer', 'vc_sidebar_render_fallback' );

function vc_sidebar_render_fallback() {
    // Only render if wp_body_open didn't already fire
    if ( did_action( 'wp_body_open' ) > 0 ) {
        return;
    }
    vc_sidebar_render();
}

function vc_sidebar_render() {
    if ( ! vc_sidebar_is_active() ) {
        return;
    }
    $s          = vc_sidebar_get_settings();
    $items      = $s['menu_items'];
    $logo       = $s['logo_url'];
    $current    = trailingslashit( $_SERVER['REQUEST_URI'] );

    // Detect subpage: get current page ancestors for parent matching
    $current_page_obj    = get_queried_object();
    $current_page_title  = '';
    $current_page_ancestors = array();
    if ( $current_page_obj instanceof WP_Post ) {
        $current_page_title  = $current_page_obj->post_title;
        $current_page_ancestors = get_post_ancestors( $current_page_obj->ID );
    }
    ?>

    <!-- VoteCraft Sidebar Navigation -->
    <nav id="vc-sidebar" class="vc-sidebar" role="navigation" aria-label="Main navigation">
        <div class="vc-sidebar__header">
            <?php if ( $logo ) : ?>
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>" class="vc-sidebar__logo">
                    <img src="<?php echo esc_url( $logo ); ?>" alt="<?php echo esc_attr( get_bloginfo( 'name' ) ); ?>">
                </a>
            <?php endif; ?>
            <button class="vc-sidebar__toggle" aria-label="Toggle navigation" aria-expanded="false">
                <span class="dashicons dashicons-menu"></span>
            </button>
        </div>

        <ul class="vc-sidebar__menu">
            <?php foreach ( $items as $item ) :
                $item_path = trailingslashit( wp_parse_url( $item['url'], PHP_URL_PATH ) ?: $item['url'] );
                $is_active = ( $current === $item_path );
                $icon_type   = $item['icon_type'] ?? 'dashicon';
                $custom_icon = $item['custom_icon'] ?? '';
                $icon_color  = $item['icon_color'] ?? '';
                $icon_style  = $icon_color ? 'color:' . esc_attr( $icon_color ) . ' !important;' : '';

                // Check if the current page is a child of this menu item's page
                $subpage_title = '';
                if ( ! $is_active && $current_page_ancestors ) {
                    $menu_page_id = url_to_postid( $item['url'] );
                    if ( $menu_page_id && in_array( $menu_page_id, $current_page_ancestors, true ) ) {
                        $is_active     = true;
                        $subpage_title = $current_page_title;
                    }
                }
                ?>
                <li class="vc-sidebar__item<?php echo $is_active ? ' vc-sidebar__item--active' : ''; ?>"
                    data-path="<?php echo esc_attr( rtrim( $item_path, '/' ) ); ?>">
                    <a href="<?php echo esc_url( $item['url'] ); ?>" class="vc-sidebar__link"
                       title="<?php echo esc_attr( $item['label'] ); ?>">
                        <?php if ( $icon_type === 'custom' && $custom_icon ) : ?>
                            <img src="<?php echo esc_url( $custom_icon ); ?>" alt="" class="vc-sidebar__icon vc-sidebar__icon--custom">
                        <?php else : ?>
                            <span class="dashicons <?php echo esc_attr( $item['icon'] ); ?> vc-sidebar__icon"
                                  <?php echo $icon_style ? 'style="' . $icon_style . '"' : ''; ?>></span>
                        <?php endif; ?>
                        <span class="vc-sidebar__label"><?php echo esc_html( $item['label'] ); ?></span>
                    </a>
                    <?php if ( $subpage_title ) : ?>
                        <span class="vc-sidebar__sublabel"><?php echo esc_html( $subpage_title ); ?></span>
                    <?php endif; ?>
                </li>
            <?php endforeach; ?>
        </ul>
    </nav>

    <!-- Mobile hamburger (floating, only visible on mobile) -->
    <button id="vc-mobile-toggle" class="vc-mobile-toggle" aria-label="Open menu">
        <span class="dashicons dashicons-menu"></span>
    </button>

    <!-- Mobile bottom tab bar -->
    <?php if ( $s['mobile_style'] === 'tabs' ) : ?>
    <nav id="vc-mobile-tabs" class="vc-mobile-tabs" role="navigation" aria-label="Mobile navigation">
        <?php foreach ( $items as $item ) :
            $item_path = trailingslashit( wp_parse_url( $item['url'], PHP_URL_PATH ) ?: $item['url'] );
            $is_active = ( $current === $item_path );
            $icon_type   = $item['icon_type'] ?? 'dashicon';
            $custom_icon = $item['custom_icon'] ?? '';
            $icon_color  = $item['icon_color'] ?? '';
            $icon_style  = $icon_color ? 'color:' . esc_attr( $icon_color ) . ' !important;' : '';
            ?>
            <a href="<?php echo esc_url( $item['url'] ); ?>"
               class="vc-mobile-tabs__item<?php echo $is_active ? ' vc-mobile-tabs__item--active' : ''; ?>">
                <?php if ( $icon_type === 'custom' && $custom_icon ) : ?>
                    <img src="<?php echo esc_url( $custom_icon ); ?>" alt="" class="vc-mobile-tabs__icon--custom">
                <?php else : ?>
                    <span class="dashicons <?php echo esc_attr( $item['icon'] ); ?>"
                          <?php echo $icon_style ? 'style="' . $icon_style . '"' : ''; ?>></span>
                <?php endif; ?>
                <span class="vc-mobile-tabs__label"><?php echo esc_html( $item['label'] ); ?></span>
            </a>
        <?php endforeach; ?>
    </nav>
    <?php endif; ?>

    <!-- Overlay backdrop for mobile drawer -->
    <div id="vc-sidebar-overlay" class="vc-sidebar__overlay"></div>
    <?php
}
