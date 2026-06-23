#!/usr/bin/env python3
"""
Generate SQL import files from Open States CSV bulk data.
Outputs .sql files you can upload to phpMyAdmin (Import tab, format: SQL).

Usage:
  python3 generate-import-sql.py <state_name> <session> <csv_directory>

Example:
  python3 generate-import-sql.py Massachusetts 194th "data/MA/MA_194th_csv_6GitCD8OoGv8LjqxprN0Aa/MA/194th/"

Output:
  sql_output/import_MA_194th_bills.sql
  sql_output/import_MA_194th_sponsorships.sql
"""

import csv
import json
import sys
import os
import glob
import re
from datetime import datetime

# Match your WordPress table prefix
TABLE_PREFIX = 'eUZZh_'
BATCH_SIZE = 200          # rows per INSERT statement
ROWS_PER_FILE = 12000     # bills: ~5 MB per file
SPONS_ROWS_PER_FILE = 35000  # sponsorships: ~5 MB per file (smaller rows)

# Increase CSV field size limit for large fields (abstracts, subjects, etc.)
csv.field_size_limit(10 * 1024 * 1024)


def escape_sql(value):
    """Escape a string value for SQL insertion."""
    if value is None:
        return 'NULL'
    value = str(value)
    if value == '':
        return "''"
    value = value.replace('\\', '\\\\')
    value = value.replace("'", "\\'")
    value = value.replace('\n', '\\n')
    value = value.replace('\r', '\\r')
    value = value.replace('\x00', '')
    return f"'{value}'"


def escape_sql_date(value):
    """Escape a date value — returns NULL for empty/invalid dates."""
    if not value or value.strip() == '':
        return 'NULL'
    # Validate it looks like a date (YYYY-MM-DD...)
    if re.match(r'^\d{4}-\d{2}-\d{2}', value.strip()):
        return f"'{value.strip()[:10]}'"
    return 'NULL'


def clean_classification(raw):
    """Clean classification like \"['bill']\" → \"bill\"."""
    cleaned = raw.strip("[]'\"` ")
    cleaned = cleaned.replace("'", "").replace('"', '')
    return cleaned


def find_csv(csv_dir, pattern):
    """Find a CSV file matching a glob pattern in the directory."""
    matches = glob.glob(os.path.join(csv_dir, pattern))
    return matches[0] if matches else None


def load_abstracts(csv_dir):
    """Load bill abstracts into a dict keyed by bill_id."""
    path = find_csv(csv_dir, '*_bill_abstracts.csv')
    if not path:
        return {}
    abstracts = {}
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            abstracts[row['bill_id']] = row['abstract']
    print(f"  {len(abstracts)} abstracts loaded")
    return abstracts


def load_latest_actions(csv_dir):
    """Load the latest action per bill from actions CSV."""
    path = find_csv(csv_dir, '*_bill_actions.csv')
    if not path:
        return {}
    latest = {}
    count = 0
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            bid = row['bill_id']
            if bid not in latest or row['date'] > latest[bid]['date']:
                latest[bid] = {'date': row['date'], 'description': row['description']}
            count += 1
    print(f"  {count} actions scanned → {len(latest)} latest per bill")
    return latest


def load_sources(csv_dir):
    """Load first source URL per bill."""
    path = find_csv(csv_dir, '*_bill_sources.csv')
    if not path:
        return {}
    sources = {}
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['bill_id'] not in sources:
                sources[row['bill_id']] = row['url']
    print(f"  {len(sources)} sources loaded")
    return sources


def generate_bills_sql(csv_dir, state_name, session, abstracts, latest_actions, sources, output_dir):
    """Generate SQL files for bills import (split into small files)."""
    bills_path = find_csv(csv_dir, '*_bills.csv')
    if not bills_path:
        print("ERROR: No *_bills.csv found!")
        return []

    basename = os.path.basename(bills_path)
    state_abbrev = basename.split('_')[0]

    table = f"{TABLE_PREFIX}votecraft_bills"
    columns = "(id, identifier, title, state, session, chamber, classification, subjects, abstract, latest_action_date, latest_action_description, openstates_url, raw_data, updated_at)"
    on_dup = "AS new ON DUPLICATE KEY UPDATE identifier=new.identifier, title=new.title, session=new.session, chamber=new.chamber, classification=new.classification, subjects=new.subjects, abstract=new.abstract, latest_action_date=new.latest_action_date, latest_action_description=new.latest_action_description, openstates_url=new.openstates_url, raw_data=new.raw_data, updated_at=new.updated_at"

    total = 0
    file_num = 1
    file_rows = 0
    out = None
    output_files = []

    def open_new_file():
        nonlocal out, file_num, file_rows
        if out:
            out.close()
        fname = os.path.join(output_dir, f"import_{state_abbrev}_{session}_bills_{file_num:02d}.sql")
        out = open(fname, 'w', encoding='utf-8')
        out.write(f"-- VoteCraft Bills Import: {state_name} {session} (part {file_num})\n")
        out.write(f"-- Upload to phpMyAdmin → Import tab → Format: SQL\n\n")
        output_files.append(fname)
        file_rows = 0
        file_num += 1

    open_new_file()

    with open(bills_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        batch = []

        for row in reader:
            bill_id = row['id']
            abstract = abstracts.get(bill_id, '')
            action = latest_actions.get(bill_id, {})
            action_date = action.get('date', '')
            action_desc = action.get('description', '')
            source_url = sources.get(bill_id, '')

            # Build raw_data JSON matching OpenStates API format
            raw_data = json.dumps({
                'id': bill_id,
                'identifier': row['identifier'],
                'title': row['title'],
                'classification': [clean_classification(row['classification'])],
                'subject': row.get('subject', '[]'),
                'abstract': abstract,
                'latest_action_date': action_date[:10] if action_date else None,
                'latest_action_description': action_desc,
                'openstates_url': source_url,
                'session': session,
                'jurisdiction': {'name': state_name},
                'from_organization': {'classification': row['organization_classification']},
            }, ensure_ascii=False)

            values = (
                f"{escape_sql(bill_id)}, "
                f"{escape_sql(row['identifier'])}, "
                f"{escape_sql(row['title'])}, "
                f"{escape_sql(state_name)}, "
                f"{escape_sql(session)}, "
                f"{escape_sql(row['organization_classification'])}, "
                f"{escape_sql(clean_classification(row['classification']))}, "
                f"{escape_sql(row.get('subject', '[]'))}, "
                f"{escape_sql(abstract)}, "
                f"{escape_sql_date(action_date)}, "
                f"{escape_sql(action_desc)}, "
                f"{escape_sql(source_url)}, "
                f"{escape_sql(raw_data)}, "
                f"NOW()"
            )
            batch.append(f"({values})")

            if len(batch) >= BATCH_SIZE:
                out.write(f"INSERT INTO {table} {columns} VALUES\n")
                out.write(",\n".join(batch))
                out.write(f"\n{on_dup};\n\n")
                total += len(batch)
                file_rows += len(batch)
                batch = []
                if file_rows >= ROWS_PER_FILE:
                    open_new_file()

        if batch:
            out.write(f"INSERT INTO {table} {columns} VALUES\n")
            out.write(",\n".join(batch))
            out.write(f"\n{on_dup};\n\n")
            total += len(batch)

    if out:
        out.close()

    for f in output_files:
        sz = os.path.getsize(f) / (1024 * 1024)
        print(f"  → {os.path.basename(f)} ({sz:.1f} MB)")
    print(f"  {total} bills total in {len(output_files)} files")
    return output_files


def generate_sponsorships_sql(csv_dir, state_name, session, output_dir):
    """Generate SQL files for sponsorships import (split into small files)."""
    spons_path = find_csv(csv_dir, '*_bill_sponsorships.csv')
    if not spons_path:
        print("  No sponsorships CSV found, skipping.")
        return []

    basename = os.path.basename(spons_path)
    state_abbrev = basename.split('_')[0]

    table = f"{TABLE_PREFIX}votecraft_sponsorships"
    columns = "(bill_id, legislator_id, legislator_name, sponsorship_type, classification)"
    on_dup = "AS new ON DUPLICATE KEY UPDATE legislator_id=new.legislator_id, classification=new.classification"

    total = 0
    file_num = 1
    file_rows = 0
    out = None
    output_files = []

    def open_new_file():
        nonlocal out, file_num, file_rows
        if out:
            out.close()
        fname = os.path.join(output_dir, f"import_{state_abbrev}_{session}_spons_{file_num:02d}.sql")
        out = open(fname, 'w', encoding='utf-8')
        out.write(f"-- VoteCraft Sponsorships Import: {state_name} {session} (part {file_num})\n")
        out.write(f"-- Upload to phpMyAdmin → Import tab → Format: SQL\n\n")
        output_files.append(fname)
        file_rows = 0
        file_num += 1

    open_new_file()

    with open(spons_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        batch = []

        for row in reader:
            spons_type = 'primary' if row['primary'].strip().lower() == 'true' else 'cosponsor'

            values = (
                f"{escape_sql(row['bill_id'])}, "
                f"{escape_sql(row.get('person_id', ''))}, "
                f"{escape_sql(row['name'])}, "
                f"{escape_sql(spons_type)}, "
                f"{escape_sql(row['classification'])}"
            )
            batch.append(f"({values})")

            if len(batch) >= BATCH_SIZE:
                out.write(f"INSERT INTO {table} {columns} VALUES\n")
                out.write(",\n".join(batch))
                out.write(f"\n{on_dup};\n\n")
                total += len(batch)
                file_rows += len(batch)
                batch = []
                if file_rows >= SPONS_ROWS_PER_FILE:
                    open_new_file()

        if batch:
            out.write(f"INSERT INTO {table} {columns} VALUES\n")
            out.write(",\n".join(batch))
            out.write(f"\n{on_dup};\n\n")
            total += len(batch)

    if out:
        out.close()

    for f in output_files:
        sz = os.path.getsize(f) / (1024 * 1024)
        print(f"  → {os.path.basename(f)} ({sz:.1f} MB)")
    print(f"  {total} sponsorships total in {len(output_files)} files")
    return output_files


def main():
    if len(sys.argv) < 4:
        print("Usage: python3 generate-import-sql.py <state_name> <session> <csv_directory>")
        print()
        print("Example:")
        print('  python3 generate-import-sql.py Massachusetts 194th "data/MA/MA_194th_csv_6GitCD8OoGv8LjqxprN0Aa/MA/194th/"')
        print()
        print("Output goes to sql_output/ directory.")
        sys.exit(1)

    state_name = sys.argv[1]
    session = sys.argv[2]
    csv_dir = sys.argv[3]

    if not os.path.isdir(csv_dir):
        print(f"Error: Directory not found: {csv_dir}")
        sys.exit(1)

    # Create output directory
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sql_output')
    os.makedirs(output_dir, exist_ok=True)

    print(f"=== VoteCraft SQL Generator ===")
    print(f"State: {state_name} | Session: {session}")
    print(f"CSV dir: {csv_dir}")
    print(f"Output: {output_dir}/")
    print()

    # Load lookup data
    print("Loading lookup data...")
    abstracts = load_abstracts(csv_dir)
    latest_actions = load_latest_actions(csv_dir)
    sources = load_sources(csv_dir)
    print()

    # Generate SQL files
    print("Generating SQL files...")
    bills_file = generate_bills_sql(csv_dir, state_name, session, abstracts, latest_actions, sources, output_dir)
    spons_file = generate_sponsorships_sql(csv_dir, state_name, session, output_dir)

    print()
    print("=== DONE ===")
    print("Next steps:")
    print("  1. Go to phpMyAdmin → Select your database")
    print("  2. Click 'Import' tab")
    print("  3. Choose file → select the .sql file")
    print("  4. Format: SQL")
    print("  5. Click 'Go'")
    print("  6. Do bills first, then sponsorships")


if __name__ == '__main__':
    main()
