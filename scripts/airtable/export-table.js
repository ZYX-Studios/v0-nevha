'use strict';

const fs = require('fs/promises');
const path = require('path');
const { airtableAuthHeaders } = require('./env');

function usage() {
  console.error('Usage: node scripts/airtable/export-table.js <BASE_ID> <TABLE_NAME> [OUTPUT_JSON_PATH]');
  process.exit(2);
}

const baseId = process.argv[2] || process.env.AIRTABLE_BASE_ID;
const tableName = process.argv[3] || process.env.AIRTABLE_TABLE_NAME;
const outputPathArg = process.argv[4];
if (!baseId || !tableName) usage();

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...airtableAuthHeaders(), ...(init.headers || {}) },
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after')) || 2;
    await sleep(retryAfter * 1000);
    return fetchJson(url, init);
  }
  if (!res.ok) {
    let extra = '';
    try { extra = await res.text(); } catch {}
    const err = new Error(`Airtable API error ${res.status} ${res.statusText} -> ${url}\n${extra}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function encodeQuery(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) usp.append(k, String(item));
    } else {
      usp.set(k, String(v));
    }
  }
  return usp.toString();
}

async function listAllRecords({ baseId, tableName, view, fields, filterByFormula }) {
  const baseUrl = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
  const pageSize = 100; // Airtable max page size is 100
  let offset;
  const all = [];
  let pages = 0;

  while (true) {
    const qs = encodeQuery({ pageSize, offset, view });
    const url = `${baseUrl}?${qs}`;
    const json = await fetchJson(url, {
      method: 'GET',
    });
    if (Array.isArray(json.records)) {
      all.push(...json.records);
    }
    pages += 1;
    process.stdout.write(`\rFetched ${all.length} records across ${pages} page(s)...`);
    if (!json.offset) break;
    offset = json.offset;
    // Be polite to rate limits
    await sleep(220);
  }

  process.stdout.write('\n');
  return all;
}

(async () => {
  try {
    const records = await listAllRecords({ baseId, tableName });
    const payload = { exportedAt: new Date().toISOString(), baseId, tableName, count: records.length, records };

    const outPath = outputPathArg || path.join(__dirname, 'output', `${tableName.replace(/[^a-z0-9_-]/gi, '_')}.json`);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, JSON.stringify(payload, null, 2));

    console.log(`Exported ${records.length} records from ${baseId}/${tableName} -> ${outPath}`);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
