<?php
/**
 * One-time bulk CSV import script.
 * Upload to your WordPress root, visit it in browser, delete after.
 *
 * Usage: https://yoursite.com/votecraft-bulk-import-run.php
 */

// Load WordPress
require_once __DIR__ . '/../wp-load.php';

// Only admins
if (!current_user_can('manage_options')) { die('Unauthorized. Log into WordPress first.'); }

@set_time_limit(0);
@ini_set('memory_limit', '512M');
header('Content-Type: text/plain; charset=utf-8');

// ---- CONFIGURE THESE ----
$csv_dir = ABSPATH . 'wp-content/uploads/votecraft-import/MA/194th/';
$state = 'Massachusetts';
$session = '194th';
$batch_size = 500;
// --------------------------

global $wpdb;

if (!is_dir($csv_dir)) { die("Directory not found: $csv_dir\nCheck the path and try again."); }

echo "=== VoteCraft Bulk CSV Import ===\n";
echo "Directory: $csv_dir\n";
echo "State: $state | Session: $session\n\n";
flush();

$bills_table = $wpdb->prefix . 'votecraft_bills';
$spons_table = $wpdb->prefix . 'votecraft_sponsorships';

// --- Load lookup tables into memory ---

echo "Loading abstracts...\n"; flush();
$abstracts = [];
$abs_files = glob($csv_dir . '/*_bill_abstracts.csv');
if (!empty($abs_files)) {
    $fh = fopen($abs_files[0], 'r');
    $headers = fgetcsv($fh);
    while (($row = fgetcsv($fh)) !== false) {
        $r = array_combine($headers, $row);
        $abstracts[$r['bill_id']] = $r['abstract'];
    }
    fclose($fh);
}
echo "  " . count($abstracts) . " abstracts loaded.\n"; flush();

echo "Loading actions (finding latest per bill)...\n"; flush();
$latest_actions = [];
$act_files = glob($csv_dir . '/*_bill_actions.csv');
if (!empty($act_files)) {
    $fh = fopen($act_files[0], 'r');
    $headers = fgetcsv($fh);
    $action_count = 0;
    while (($row = fgetcsv($fh)) !== false) {
        $r = array_combine($headers, $row);
        $bid = $r['bill_id'];
        if (!isset($latest_actions[$bid]) || $r['date'] > $latest_actions[$bid]['date']) {
            $latest_actions[$bid] = ['date' => $r['date'], 'description' => $r['description']];
        }
        $action_count++;
        if ($action_count % 50000 === 0) { echo "  $action_count actions scanned...\n"; flush(); }
    }
    fclose($fh);
}
echo "  $action_count total actions → " . count($latest_actions) . " latest per bill.\n"; flush();

echo "Loading sources...\n"; flush();
$sources = [];
$src_files = glob($csv_dir . '/*_bill_sources.csv');
if (!empty($src_files)) {
    $fh = fopen($src_files[0], 'r');
    $headers = fgetcsv($fh);
    while (($row = fgetcsv($fh)) !== false) {
        $r = array_combine($headers, $row);
        if (!isset($sources[$r['bill_id']])) {
            $sources[$r['bill_id']] = $r['url'];
        }
    }
    fclose($fh);
}
echo "  " . count($sources) . " sources loaded.\n\n"; flush();

// --- Import bills in batches ---

$bills_files = glob($csv_dir . '/*_bills.csv');
if (empty($bills_files)) { die("No *_bills.csv found in $csv_dir"); }

echo "=== Importing bills ===\n"; flush();
$fh = fopen($bills_files[0], 'r');
$headers = fgetcsv($fh);
$total_imported = 0;
$total_errors = 0;
$now = gmdate('Y-m-d H:i:s');

while (!feof($fh)) {
    $values_list = [];
    $placeholders_list = [];
    $batch_count = 0;

    while ($batch_count < $batch_size && ($row = fgetcsv($fh)) !== false) {
        if (count($row) !== count($headers)) { continue; }
        $record = array_combine($headers, $row);
        $bill_id = $record['id'];
        $chamber = $record['organization_classification'];
        $classification = str_replace("'", '', trim($record['classification'], "[]'\""));
        $subjects_raw = isset($record['subject']) ? $record['subject'] : '[]';

        $placeholders_list[] = '(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)';
        $values_list[] = $bill_id;
        $values_list[] = $record['identifier'];
        $values_list[] = $record['title'];
        $values_list[] = $state;
        $values_list[] = $session;
        $values_list[] = $chamber;
        $values_list[] = $classification;
        $values_list[] = $subjects_raw;
        $values_list[] = isset($abstracts[$bill_id]) ? $abstracts[$bill_id] : '';
        $values_list[] = isset($latest_actions[$bill_id]) ? $latest_actions[$bill_id]['date'] : '';
        $values_list[] = isset($latest_actions[$bill_id]) ? $latest_actions[$bill_id]['description'] : '';
        $values_list[] = isset($sources[$bill_id]) ? $sources[$bill_id] : '';
        $values_list[] = json_encode($record);
        $values_list[] = $now;
        $batch_count++;
    }

    if (!empty($placeholders_list)) {
        $sql = "INSERT INTO $bills_table (id, identifier, title, state, session, chamber, classification, subjects, abstract, latest_action_date, latest_action_description, openstates_url, raw_data, updated_at) VALUES "
            . implode(', ', $placeholders_list)
            . " ON DUPLICATE KEY UPDATE identifier=VALUES(identifier), title=VALUES(title), state=VALUES(state), session=VALUES(session), chamber=VALUES(chamber), classification=VALUES(classification), subjects=VALUES(subjects), abstract=VALUES(abstract), latest_action_date=VALUES(latest_action_date), latest_action_description=VALUES(latest_action_description), openstates_url=VALUES(openstates_url), raw_data=VALUES(raw_data), updated_at=VALUES(updated_at)";
        $result = $wpdb->query($wpdb->prepare($sql, $values_list));
        if ($result === false) {
            echo "  ERROR at row $total_imported: " . $wpdb->last_error . "\n";
            $total_errors++;
        }
        $total_imported += $batch_count;
        echo "  Bills: $total_imported imported\n"; flush();
    }
}
fclose($fh);
echo "Bills done: $total_imported imported, $total_errors errors.\n\n"; flush();

// --- Import sponsorships in batches ---

$spons_files = glob($csv_dir . '/*_bill_sponsorships.csv');
if (empty($spons_files)) { echo "No sponsorships CSV found, skipping.\n"; } else {

echo "=== Importing sponsorships ===\n"; flush();
$fh = fopen($spons_files[0], 'r');
$headers = fgetcsv($fh);
$spons_imported = 0;
$spons_errors = 0;

while (!feof($fh)) {
    $values_list = [];
    $placeholders_list = [];
    $batch_count = 0;

    while ($batch_count < $batch_size && ($row = fgetcsv($fh)) !== false) {
        if (count($row) !== count($headers)) { continue; }
        $record = array_combine($headers, $row);
        $sponsorship_type = (strtolower($record['primary']) === 'true') ? 'primary' : 'cosponsor';

        $placeholders_list[] = '(%s, %s, %s, %s, %s)';
        $values_list[] = $record['bill_id'];
        $values_list[] = !empty($record['person_id']) ? $record['person_id'] : '';
        $values_list[] = $record['name'];
        $values_list[] = $sponsorship_type;
        $values_list[] = $record['classification'];
        $batch_count++;
    }

    if (!empty($placeholders_list)) {
        $sql = "INSERT INTO $spons_table (bill_id, legislator_id, legislator_name, sponsorship_type, classification) VALUES "
            . implode(', ', $placeholders_list);
        $result = $wpdb->query($wpdb->prepare($sql, $values_list));
        if ($result === false) {
            echo "  ERROR at row $spons_imported: " . $wpdb->last_error . "\n";
            $spons_errors++;
        }
        $spons_imported += $batch_count;
        if ($spons_imported % 5000 < $batch_size) { echo "  Sponsorships: $spons_imported imported\n"; flush(); }
    }
}
fclose($fh);
echo "Sponsorships done: $spons_imported imported, $spons_errors errors.\n\n"; flush();

}

// --- Summary ---
$bill_count = $wpdb->get_var("SELECT COUNT(*) FROM $bills_table WHERE state = 'Massachusetts'");
$spons_count = $wpdb->get_var("SELECT COUNT(*) FROM $spons_table WHERE bill_id LIKE 'ocd-bill/%'");
echo "=== COMPLETE ===\n";
echo "Bills in DB for Massachusetts: $bill_count\n";
echo "Total sponsorships (state): $spons_count\n";
echo "\n*** DELETE THIS FILE FROM YOUR SERVER NOW ***\n";
