<?php
/**
 * Plugin Name: VoteCraft Page Completion
 * Description: Adds Completion, Priority columns to Pages list, hides Comments/Kit, adds Page Notes to Quick Edit.
 * Version: 1.1
 * Author: VoteCraft
 */

if (!defined('ABSPATH')) exit;

// Register columns, hide comments + kit (priority 999 to run last)
add_filter('manage_pages_columns', function ($columns) {
    unset($columns['comments']);
    foreach (array_keys($columns) as $key) {
        if (stripos($key, 'kit') !== false) {
            unset($columns[$key]);
        }
    }
    // Insert Priority before author, Completion before date
    $reordered = array();
    foreach ($columns as $key => $label) {
        if ($key === 'author') {
            $reordered['page_priority'] = 'Priority';
            $reordered['page_notes'] = 'Notes';
        }
        if ($key === 'date') {
            $reordered['page_completion'] = 'Completion';
        }
        $reordered[$key] = $label;
    }
    if (!isset($reordered['page_priority'])) $reordered['page_priority'] = 'Priority';
    if (!isset($reordered['page_completion'])) $reordered['page_completion'] = 'Completion';
    return $reordered;
}, 999);

// Display Completion column
add_action('manage_pages_custom_column', function ($column, $post_id) {
    if ($column !== 'page_completion') return;
    $value = (int) get_post_meta($post_id, '_page_completion', true);
    $color = $value >= 75 ? '#16a34a' : ($value >= 40 ? '#ca8a04' : '#dc2626');
    echo '<div class="vc-completion-cell" data-post-id="' . esc_attr($post_id) . '">';
    echo '<div class="vc-completion-bar" style="background:#e5e7eb;border-radius:4px;height:8px;width:80px;position:relative;">';
    echo '<div style="background:' . $color . ';height:100%;border-radius:4px;width:' . $value . '%;transition:width 0.3s;"></div>';
    echo '</div>';
    echo '<input type="number" min="0" max="100" value="' . $value . '" class="vc-completion-input" style="width:50px;text-align:center;font-size:12px;margin-top:4px;padding:2px 4px;" data-post-id="' . esc_attr($post_id) . '">';
    echo '<span style="font-size:12px;color:#6b7280;">%</span>';
    echo '</div>';
    // Hidden data for Quick Edit notes
    $notes = esc_attr(get_post_meta($post_id, '_page_notes', true));
    echo '<span class="vc-page-notes-data" data-notes="' . $notes . '" data-post-id="' . $post_id . '" style="display:none;"></span>';
}, 10, 2);

// Display Priority column
add_action('manage_pages_custom_column', function ($column, $post_id) {
    if ($column !== 'page_priority') return;
    $value = get_post_meta($post_id, '_page_priority', true);
    $has_priority = ($value !== '' && (int) $value > 0);
    $value = $has_priority ? (int) $value : '';
    if ($has_priority) {
        echo '<script>document.getElementById("post-' . $post_id . '").classList.add("vc-has-priority");</script>';
    }
    echo '<input type="number" min="1" value="' . esc_attr($value) . '" class="vc-priority-input" placeholder="—" style="width:50px;text-align:center;font-size:12px;padding:2px 4px;" data-post-id="' . esc_attr($post_id) . '">';
}, 10, 2);

// Display Notes column
add_action('manage_pages_custom_column', function ($column, $post_id) {
    if ($column !== 'page_notes') return;
    $notes = get_post_meta($post_id, '_page_notes', true);
    if (!empty(trim($notes))) {
        echo '<span style="font-weight:700;color:#dc2626;">X</span>';
    }
}, 10, 2);

// Make columns sortable
add_filter('manage_edit-page_sortable_columns', function ($columns) {
    $columns['page_completion'] = 'page_completion';
    $columns['page_priority'] = 'page_priority';
    return $columns;
});

add_action('pre_get_posts', function ($query) {
    if (!is_admin() || !$query->is_main_query()) return;
    $orderby = $query->get('orderby');
    if ($orderby === 'page_completion') {
        $query->set('meta_key', '_page_completion');
        $query->set('orderby', 'meta_value_num');
    } elseif ($orderby === 'page_priority') {
        $query->set('meta_key', '_page_priority');
        $query->set('orderby', 'meta_value_num');
    }
});

// Column widths
add_action('admin_head-edit.php', function () {
    global $typenow;
    if ($typenow !== 'page') return;
    ?>
    <style>
        .column-page_completion { width: 110px; }
        th[class*="kit"], td[class*="kit"] { display: none !important; }
        .column-page_priority { width: 90px; }
        .column-page_notes { width: 50px; text-align: center; }
        tr.vc-has-priority td { background-color: #fef2f2 !important; }
        tr.vc-has-priority:hover td { background-color: #fee2e2 !important; }
        .vc-completion-input, .vc-priority-input { border: 1px solid #d1d5db; border-radius: 3px; }
        .vc-completion-input:focus, .vc-priority-input:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 1px #2563eb; }
    </style>
    <?php
});

// AJAX save handlers
add_action('wp_ajax_vc_save_completion', function () {
    check_ajax_referer('vc_completion_nonce', 'nonce');
    $post_id = (int) $_POST['post_id'];
    $value = max(0, min(100, (int) $_POST['value']));
    if (!current_user_can('edit_page', $post_id)) wp_die('Unauthorized');
    update_post_meta($post_id, '_page_completion', $value);
    wp_send_json_success(array('value' => $value));
});

add_action('wp_ajax_vc_save_priority', function () {
    check_ajax_referer('vc_completion_nonce', 'nonce');
    $post_id = (int) $_POST['post_id'];
    $value = (int) $_POST['value'];
    if (!current_user_can('edit_page', $post_id)) wp_die('Unauthorized');
    update_post_meta($post_id, '_page_priority', $value);
    wp_send_json_success(array('value' => $value));
});

// Quick Edit: Page Notes field
add_action('quick_edit_custom_box', function ($column, $post_type) {
    if ($column !== 'page_completion' || $post_type !== 'page') return;
    ?>
    <fieldset class="inline-edit-col-right" style="margin-top:12px;">
        <div class="inline-edit-col">
            <label>
                <span class="title" style="width:auto;">Page Notes</span>
                <textarea name="vc_page_notes" class="vc-page-notes-input" rows="3" style="width:100%;margin-top:4px;"></textarea>
            </label>
        </div>
    </fieldset>
    <?php
}, 10, 2);

// Save Quick Edit notes
add_action('save_post_page', function ($post_id) {
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
    if (!current_user_can('edit_page', $post_id)) return;
    if (!isset($_POST['vc_page_notes'])) return;
    update_post_meta($post_id, '_page_notes', sanitize_textarea_field($_POST['vc_page_notes']));
});

// Inline JS for auto-saving completion + priority inputs
add_action('admin_footer-edit.php', function () {
    global $typenow;
    if ($typenow !== 'page') return;
    $nonce = wp_create_nonce('vc_completion_nonce');
    ?>
    <script>
    (function() {
        // Allow Enter key inside notes textarea without closing Quick Edit
        document.addEventListener('keydown', function(e) {
            if (e.target.classList.contains('vc-page-notes-input') && e.key === 'Enter') {
                e.stopPropagation();
            }
        }, true);

        // Populate Quick Edit notes field when opened
        var origInlineEdit = inlineEditPost.edit;
        inlineEditPost.edit = function(id) {
            origInlineEdit.apply(this, arguments);
            if (typeof id === 'object') id = this.getId(id);
            var row = document.getElementById('post-' + id);
            if (!row) return;
            var notesData = row.querySelector('.vc-page-notes-data');
            if (notesData) {
                var editRow = document.getElementById('edit-' + id);
                if (!editRow) editRow = document.querySelector('.inline-edit-row');
                if (editRow) {
                    var textarea = editRow.querySelector('.vc-page-notes-input');
                    if (textarea) textarea.value = notesData.dataset.notes || '';
                }
            }
        };

        var timer;
        document.addEventListener('input', function(e) {
            // Completion input
            if (e.target.classList.contains('vc-completion-input')) {
                clearTimeout(timer);
                var input = e.target;
                var val = Math.max(0, Math.min(100, parseInt(input.value, 10) || 0));
                var cell = input.closest('.vc-completion-cell');
                var bar = cell.querySelector('.vc-completion-bar > div');
                var color = val >= 75 ? '#16a34a' : (val >= 40 ? '#ca8a04' : '#dc2626');
                bar.style.width = val + '%';
                bar.style.background = color;
                timer = setTimeout(function() {
                    var data = new FormData();
                    data.append('action', 'vc_save_completion');
                    data.append('nonce', '<?php echo $nonce; ?>');
                    data.append('post_id', input.dataset.postId);
                    data.append('value', val);
                    fetch(ajaxurl, { method: 'POST', body: data });
                }, 500);
            }
            // Priority input
            if (e.target.classList.contains('vc-priority-input')) {
                clearTimeout(timer);
                var input = e.target;
                var val = parseInt(input.value, 10) || 0;
                var row = input.closest('tr');
                if (row) {
                    if (val > 0) row.classList.add('vc-has-priority');
                    else row.classList.remove('vc-has-priority');
                }
                timer = setTimeout(function() {
                    var data = new FormData();
                    data.append('action', 'vc_save_priority');
                    data.append('nonce', '<?php echo $nonce; ?>');
                    data.append('post_id', input.dataset.postId);
                    data.append('value', val);
                    fetch(ajaxurl, { method: 'POST', body: data });
                }, 500);
            }
        });
    })();
    </script>
    <?php
});
