<?php
/**
 * VoteCraft Bulk CSV Import
 *
 * Included by votecraft-data-sync.php via require_once.
 * Provides functions for importing Open States bulk CSV data.
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * Import bills from a bulk CSV session folder into the votecraft_bills table.
 *
 * @param string $csv_dir  Path to the session folder containing the CSV files
 * @param string $state    Full state name (e.g., "Massachusetts")
 * @param string $session  Session identifier (e.g., "194th")
 * @return array           Stats about the import
 */
function votecraft_bulk_import_bills($csv_dir, $state, $session) {
    global $wpdb;

    $bills_table = $wpdb->prefix . 'votecraft_bills';
    $stats = array(
        'bills_imported' => 0,
        'bills_skipped' => 0,
        'abstracts_loaded' => 0,
        'actions_loaded' => 0,
        'sources_loaded' => 0,
        'errors' => array(),
    );

    // --- Load the main bills CSV ---
    $bills_file = glob($csv_dir . '/*_bills.csv');
    if (empty($bills_file)) {
        $stats['errors'][] = 'No bills CSV found in ' . $csv_dir;
        return $stats;
    }
    $bills_file = $bills_file[0];

    // --- Load abstracts into a lookup by bill_id ---
    $abstracts = array();
    $abstracts_files = glob($csv_dir . '/*_bill_abstracts.csv');
    if (!empty($abstracts_files)) {
        $fh = fopen($abstracts_files[0], 'r');
        $headers = fgetcsv($fh);
        while (($row = fgetcsv($fh)) !== false) {
            $record = array_combine($headers, $row);
            $abstracts[$record['bill_id']] = $record['abstract'];
            $stats['abstracts_loaded']++;
        }
        fclose($fh);
    }

    // --- Load actions and find the latest action per bill ---
    $latest_actions = array(); // bill_id => ['date' => ..., 'description' => ...]
    $actions_files = glob($csv_dir . '/*_bill_actions.csv');
    if (!empty($actions_files)) {
        $fh = fopen($actions_files[0], 'r');
        $headers = fgetcsv($fh);
        while (($row = fgetcsv($fh)) !== false) {
            $record = array_combine($headers, $row);
            $bill_id = $record['bill_id'];
            $action_date = $record['date'];

            if (!isset($latest_actions[$bill_id]) || $action_date > $latest_actions[$bill_id]['date']) {
                $latest_actions[$bill_id] = array(
                    'date' => $action_date,
                    'description' => $record['description'],
                );
            }
            $stats['actions_loaded']++;
        }
        fclose($fh);
    }

    // --- Load sources to get OpenStates/legislature URLs ---
    $sources = array(); // bill_id => url
    $sources_files = glob($csv_dir . '/*_bill_sources.csv');
    if (!empty($sources_files)) {
        $fh = fopen($sources_files[0], 'r');
        $headers = fgetcsv($fh);
        while (($row = fgetcsv($fh)) !== false) {
            $record = array_combine($headers, $row);
            // Keep the first source URL per bill (usually the legislature link)
            if (!isset($sources[$record['bill_id']])) {
                $sources[$record['bill_id']] = $record['url'];
                $stats['sources_loaded']++;
            }
        }
        fclose($fh);
    }

    // --- Import bills ---
    $fh = fopen($bills_file, 'r');
    $headers = fgetcsv($fh);

    $batch = array();
    $batch_size = 100;

    while (($row = fgetcsv($fh)) !== false) {
        $record = array_combine($headers, $row);

        $bill_id = $record['id']; // ocd-bill/UUID
        $chamber = $record['organization_classification']; // "upper" or "lower"

        // Parse classification array string like "['bill']"
        $classification_raw = $record['classification'];
        $classification = trim($classification_raw, "[]'\"");
        $classification = str_replace("'", '', $classification);

        // Parse subjects array (usually empty in bulk data)
        $subjects_raw = isset($record['subject']) ? $record['subject'] : '[]';

        $bill_data = array(
            'id' => $bill_id,
            'identifier' => $record['identifier'],
            'title' => $record['title'],
            'state' => $state,
            'session' => $session,
            'chamber' => $chamber,
            'classification' => $classification,
            'subject' => null,  // Bulk import has no keyword match — will be null
            'issue_id' => null, // Will be populated by issue-matching logic later
            'subjects' => $subjects_raw,
            'abstract' => isset($abstracts[$bill_id]) ? $abstracts[$bill_id] : null,
            'latest_action_date' => isset($latest_actions[$bill_id]) ? $latest_actions[$bill_id]['date'] : null,
            'latest_action_description' => isset($latest_actions[$bill_id]) ? $latest_actions[$bill_id]['description'] : null,
            'openstates_url' => isset($sources[$bill_id]) ? $sources[$bill_id] : null,
            'raw_data' => json_encode($record),
            'updated_at' => gmdate('Y-m-d H:i:s'),
        );

        $result = $wpdb->replace($bills_table, $bill_data);
        if ($result === false) {
            $stats['errors'][] = 'Failed to insert bill ' . $bill_id . ': ' . $wpdb->last_error;
            $stats['bills_skipped']++;
        } else {
            $stats['bills_imported']++;
        }

        // Log progress every 1000 bills
        if ($stats['bills_imported'] % 1000 === 0) {
            votecraft_bulk_log("Imported {$stats['bills_imported']} bills...");
        }
    }

    fclose($fh);
    return $stats;
}

/**
 * Import sponsorships from a bulk CSV session folder.
 *
 * @param string $csv_dir  Path to the session folder containing the CSV files
 * @return array           Stats about the import
 */
function votecraft_bulk_import_sponsorships($csv_dir) {
    global $wpdb;

    $sponsorships_table = $wpdb->prefix . 'votecraft_sponsorships';
    $stats = array(
        'sponsorships_imported' => 0,
        'sponsorships_skipped' => 0,
        'errors' => array(),
    );

    $spons_files = glob($csv_dir . '/*_bill_sponsorships.csv');
    if (empty($spons_files)) {
        $stats['errors'][] = 'No sponsorships CSV found in ' . $csv_dir;
        return $stats;
    }

    $fh = fopen($spons_files[0], 'r');
    $headers = fgetcsv($fh);

    while (($row = fgetcsv($fh)) !== false) {
        $record = array_combine($headers, $row);

        // Map CSV columns to DB columns
        // CSV: id, name, entity_type, organization_id, person_id, bill_id, primary, classification
        $sponsorship_type = (strtolower($record['primary']) === 'true') ? 'primary' : 'cosponsor';

        $spons_data = array(
            'bill_id' => $record['bill_id'],
            'legislator_id' => !empty($record['person_id']) ? $record['person_id'] : null,
            'legislator_name' => $record['name'],
            'sponsorship_type' => $sponsorship_type,
            'classification' => $record['classification'],
        );

        $result = $wpdb->replace($sponsorships_table, $spons_data);
        if ($result === false) {
            $stats['errors'][] = 'Failed to insert sponsorship for bill ' . $record['bill_id'] . ': ' . $wpdb->last_error;
            $stats['sponsorships_skipped']++;
        } else {
            $stats['sponsorships_imported']++;
        }

        // Log progress every 5000 sponsorships
        if ($stats['sponsorships_imported'] % 5000 === 0) {
            votecraft_bulk_log("Imported {$stats['sponsorships_imported']} sponsorships...");
        }
    }

    fclose($fh);
    return $stats;
}

/**
 * Simple logging function
 */
function votecraft_bulk_log($message) {
    if (php_sapi_name() === 'cli') {
        echo $message . "\n";
    } else {
        error_log('[VoteCraft Bulk Import] ' . $message);
    }
}

/**
 * Run the full import for a session.
 *
 * @param string $csv_dir  Path to session CSV folder (e.g., /path/to/MA/194th/)
 * @param string $state    Full state name
 * @param string $session  Session identifier
 * @return array           Combined stats
 */
function votecraft_bulk_import_session($csv_dir, $state, $session) {
    global $wpdb;

    votecraft_bulk_log("Starting bulk import: $state $session from $csv_dir");

    // Log to sync_log table
    $log_table = $wpdb->prefix . 'votecraft_sync_log';
    $wpdb->insert($log_table, array(
        'sync_type' => 'bulk_csv_import',
        'state' => $state,
        'status' => 'running',
        'records_synced' => 0,
        'started_at' => gmdate('Y-m-d H:i:s'),
    ));
    $log_id = $wpdb->insert_id;

    // Import bills
    votecraft_bulk_log("Importing bills...");
    $bill_stats = votecraft_bulk_import_bills($csv_dir, $state, $session);
    votecraft_bulk_log("Bills done: {$bill_stats['bills_imported']} imported, {$bill_stats['bills_skipped']} skipped");

    // Import sponsorships
    votecraft_bulk_log("Importing sponsorships...");
    $spons_stats = votecraft_bulk_import_sponsorships($csv_dir);
    votecraft_bulk_log("Sponsorships done: {$spons_stats['sponsorships_imported']} imported, {$spons_stats['sponsorships_skipped']} skipped");

    // Update sync log
    $total = $bill_stats['bills_imported'] + $spons_stats['sponsorships_imported'];
    $all_errors = array_merge($bill_stats['errors'], $spons_stats['errors']);
    $status = empty($all_errors) ? 'success' : 'error';

    $summary = sprintf(
        "Bills: %d imported, %d skipped. Sponsorships: %d imported, %d skipped. Abstracts: %d, Actions: %d, Sources: %d.",
        $bill_stats['bills_imported'], $bill_stats['bills_skipped'],
        $spons_stats['sponsorships_imported'], $spons_stats['sponsorships_skipped'],
        $bill_stats['abstracts_loaded'], $bill_stats['actions_loaded'], $bill_stats['sources_loaded']
    );

    if (!empty($all_errors)) {
        $summary .= ' Errors: ' . implode('; ', array_slice($all_errors, 0, 5));
    }

    $wpdb->update($log_table, array(
        'status' => $status,
        'records_synced' => $total,
        'error_message' => $summary,
        'completed_at' => gmdate('Y-m-d H:i:s'),
    ), array('id' => $log_id));

    votecraft_bulk_log("Import complete! $summary");

    return array(
        'bills' => $bill_stats,
        'sponsorships' => $spons_stats,
        'summary' => $summary,
    );
}

// Admin page integration is handled by votecraft-data-sync.php (Manual Sync Controls section).
// The bulk import functions above are called from there via votecraft_bulk_import_session().
