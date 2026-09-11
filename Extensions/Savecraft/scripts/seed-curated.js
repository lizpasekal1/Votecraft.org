#!/usr/bin/env node
// Seed SaveCraft curated items into Firestore.
// Run once from the savecraft root: node scripts/seed-curated.js

const https = require('https');
const fs   = require('fs');
const path = require('path');

const PROJECT_ID = 'votecraft-789';
const API_KEY    = 'AIzaSyArJ6pkXUDbZf4jcxRita0qcdr-hT46kI8';

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
  console.log('Reading curated data from seed-payload.json…');
  // Firestore-ready { docId, data } pairs for both collections — already flattened, so no
  // extraction/slugify step is needed here (see git history for the old app.js-parsing version).
  const { genres, items } = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-payload.json'), 'utf-8'));

  const writes = [];

  for (const { docId, data } of items) {
    writes.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/curated_items/${docId}`,
        fields: {
          id:       toFV(data.id),
          title:    toFV(data.title),
          url:      toFV(data.url),
          imageUrl: toFV(data.imageUrl),
          notes:    toFV(data.notes),
          genre:    toFV(data.genre),
          category: toFV(data.category),
        },
      },
    });
  }

  for (const { docId, data } of genres) {
    writes.push({
      update: {
        name: `projects/${PROJECT_ID}/databases/(default)/documents/curated_genres/${docId}`,
        fields: {
          name:  toFV(data.name),
          order: { integerValue: String(data.order) },
        },
      },
    });
  }

  console.log(`Seeding ${writes.length} documents to Firestore (project: ${PROJECT_ID})…`);
  await batchWrite(writes);
  console.log('Done! All curated data is in Firestore.');
}

main().catch(err => { console.error(err); process.exit(1); });
