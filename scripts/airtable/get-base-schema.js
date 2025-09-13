'use strict';

const { airtableAuthHeaders, requireEnv } = require('./env');

function usage() {
  console.error('Usage: node scripts/airtable/get-base-schema.js <BASE_ID>');
  process.exit(2);
}

// Support pnpm passing a "--" token: pick the first arg that doesn't start with '-'
function firstArg() {
  const args = process.argv.slice(2);
  for (const a of args) {
    if (!a || a === '--') continue;
    if (a.startsWith('-')) continue;
    return a;
  }
  return undefined;
}

const baseId = firstArg() || process.env.AIRTABLE_BASE_ID;
if (!baseId) usage();

async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...airtableAuthHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) {
    let extra = '';
    try { extra = await res.text(); } catch {}
    const err = new Error(`Airtable API error ${res.status} ${res.statusText} -> ${url}\n${extra}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

(async () => {
  try {
    const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(baseId)}/tables`;
    const data = await fetchJson(url);

    // Print quick summary
    console.log(`Base ${baseId} tables:`);
    for (const t of data.tables || []) {
      console.log(`- ${t.id}  ${t.name}  (fields: ${t.fields?.length ?? 0})`);
    }

    // Write full JSON to stdout (user can redirect to file)
    console.log('\nFull JSON ->');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
