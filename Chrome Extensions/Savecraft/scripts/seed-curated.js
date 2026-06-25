#!/usr/bin/env node
// Seed SaveCraft curated items into Firestore.
// Run once from the savecraft root: node scripts/seed-curated.js

const https = require('https');
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const PROJECT_ID = 'votecraft-789';
const API_KEY    = 'AIzaSyArJ6pkXUDbZf4jcxRita0qcdr-hT46kI8';

// ---------------------------------------------------------------------------
// Extract CURATED_GENRES and CURATED_ITEMS from app.js via vm.runInNewContext
// ---------------------------------------------------------------------------
function extractCuratedData() {
  const appJs = fs.readFileSync(path.join(__dirname, '../app/app.js'), 'utf-8');

  // Grab the CURATED_GENRES array declaration
  const genresMatch = appJs.match(/const CURATED_GENRES\s*=\s*\[[\s\S]*?\];/);
  if (!genresMatch) throw new Error('Could not find CURATED_GENRES in app.js');

  // Grab CURATED_ITEMS from its comment header to the closing }; before STATE
  const itemsStart = appJs.indexOf('const CURATED_ITEMS = {');
  const stateMarker = '\n// ===== STATE =====';
  const itemsEnd   = appJs.indexOf(stateMarker, itemsStart);
  if (itemsStart === -1 || itemsEnd === -1) throw new Error('Could not find CURATED_ITEMS boundaries');

  // Trim trailing whitespace/newlines from the CURATED_ITEMS block
  const itemsBlock = appJs.slice(itemsStart, itemsEnd).trimEnd();

  // `const`/`let` are block-scoped and not exposed to the sandbox context;
  // rewrite them to `var` so they land on the sandbox object.
  const code = genresMatch[0].replace(/^const /, 'var ')
    + '\n'
    + itemsBlock.replace(/^const /, 'var ');

  const sandbox = {};
  vm.runInNewContext(code, sandbox);

  return { CURATED_GENRES: sandbox.CURATED_GENRES, CURATED_ITEMS: sandbox.CURATED_ITEMS };
}

// ---------------------------------------------------------------------------
// Firestore REST helpers
// ---------------------------------------------------------------------------
function toFV(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string')  return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number')  return { integerValue: String(val) };
  return { nullValue: null };
}

function firestoreRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const fullPath = `/v1/projects/${PROJECT_ID}/databases/(default)/documents${urlPath}?key=${API_KEY}`;
    const opts = {
      hostname: 'firestore.googleapis.com',
      path: fullPath,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    const req = https.request(opts, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        resolve(raw ? JSON.parse(raw) : {});
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function batchWrite(writes) {
  const BATCH_SIZE = 400; // Firestore max is 500; stay safe
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const slice = writes.slice(i, i + BATCH_SIZE);
    await firestoreRequest('POST', ':batchWrite', { writes: slice });
    console.log(`  ✓ ${Math.min(i + BATCH_SIZE, writes.length)} / ${writes.length} documents written`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('Extracting curated data from app.js…');
  const { CURATED_GENRES, CURATED_ITEMS } = extractCuratedData();

  const writes = [];

  // --- curated_items ---
  // Use a composite doc ID so the same item.id can appear in multiple
  // genre+category buckets (e.g. "cur-top100-1" in both Top 100/Movies
  // and Thriller/Movies).  The `id` field in the document is what the
  // app uses for hiddenCurated / curatedOverrides lookups.
  function slugify(s) { return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''); }

  for (const [genre, categories] of Object.entries(CURATED_ITEMS)) {
    for (const [category, items] of Object.entries(categories)) {
      for (const item of items) {
        const docId = `${slugify(genre)}-${slugify(category)}-${item.id}`;
        writes.push({
          update: {
            name: `projects/${PROJECT_ID}/databases/(default)/documents/curated_items/${docId}`,
            fields: {
              id:       toFV(item.id),
              title:    toFV(item.title),
              url:      toFV(item.url),
              imageUrl: toFV(item.imageUrl),
              notes:    toFV(item.notes),
              genre:    toFV(genre),
              category: toFV(category),
            },
          },
        });
      }
    }
  }

  // --- curated_genres ---
  for (let i = 0; i < CURATED_GENRES.length; i++) {
    const name    = CURATED_GENRES[i];
    const genreId = name.toLowerCase().replace(/\s+/g, '-');
    writes.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/curated_genres/${genreId}`,
        fields: {
          name:  toFV(name),
          order: { integerValue: String(i) },
        },
      },
    });
  }

  console.log(`Seeding ${writes.length} documents to Firestore (project: ${PROJECT_ID})…`);
  await batchWrite(writes);
  console.log('Done! All curated data is in Firestore.');
}

main().catch(err => { console.error(err); process.exit(1); });
