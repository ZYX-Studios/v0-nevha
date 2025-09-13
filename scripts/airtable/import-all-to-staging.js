'use strict';

const { createSupabaseClient, airtableAuthHeaders } = require('./env');
const { listAllRecords, fetchJson } = require('./utils');

function usage() {
  console.error('Usage: node scripts/airtable/import-all-to-staging.js <BASE_ID> [--verify] [--include <tableNameRegex>] [--exclude <tableNameRegex>]');
  process.exit(2);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { baseId: null, verify: false, include: null, exclude: null };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a || a === '--') continue;
    if (!out.baseId && !a.startsWith('--')) { out.baseId = a; continue; }
    if (a === '--verify') out.verify = true;
    else if (a === '--include') { if (args[i+1]) out.include = new RegExp(args[++i]); }
    else if (a === '--exclude') { if (args[i+1]) out.exclude = new RegExp(args[++i]); }
  }
  return out;
}

const { baseId, verify, include, exclude } = parseArgs();
if (!baseId) usage();

async function fetchTables(baseId) {
  const url = `https://api.airtable.com/v0/meta/bases/${encodeURIComponent(baseId)}/tables`;
  const res = await fetch(url, { headers: airtableAuthHeaders() });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Failed to fetch tables: ${res.status} ${res.statusText}\n${txt}`);
  }
  const json = await res.json();
  return json.tables || [];
}

function shouldProcessTable(name) {
  if (include && !include.test(name)) return false;
  if (exclude && exclude.test(name)) return false;
  return true;
}

async function upsertChunk(supabase, rows) {
  if (!rows.length) return { count: 0 };
  const { error } = await supabase
    .from('airtable_raw_records')
    .upsert(rows, { onConflict: 'base_id,table_name,record_id' });
  if (error) throw error;
  return { count: rows.length };
}

async function importTable(supabase, baseId, table) {
  const tableName = table.name;
  const tableId = table.id;
  if (!shouldProcessTable(tableName)) {
    console.log(`Skipping table ${tableName} due to include/exclude filter`);
    return { tableName, fetched: 0, upserted: 0 };
  }
  console.log(`\nImporting table: ${tableName} (${tableId})`);
  const records = await listAllRecords({ baseId, tableName });
  console.log(`Fetched ${records.length} records from ${tableName}`);

  // Chunk upserts to avoid payload limits
  const CHUNK_SIZE = 200;
  let upserted = 0;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const batch = records.slice(i, i + CHUNK_SIZE).map(rec => ({
      base_id: baseId,
      table_id: tableId,
      table_name: tableName,
      record_id: rec.id,
      created_time: rec.createdTime ? new Date(rec.createdTime).toISOString() : null,
      fields: rec.fields || {},
    }));
    await upsertChunk(supabase, batch);
    upserted += batch.length;
    process.stdout.write(`\rUpserted ${upserted}/${records.length}...`);
  }
  process.stdout.write('\n');

  return { tableName, fetched: records.length, upserted };
}

async function verifyCounts(supabase, baseId, tableName) {
  const { count, error } = await supabase
    .from('airtable_raw_records')
    .select('id', { count: 'exact', head: true })
    .eq('base_id', baseId)
    .eq('table_name', tableName);
  if (error) throw error;
  return count || 0;
}

(async () => {
  try {
    const supabase = createSupabaseClient();
    const tables = await fetchTables(baseId);

    console.log(`Base ${baseId} has ${tables.length} table(s).`);
    const summaries = [];
    for (const t of tables) {
      const s = await importTable(supabase, baseId, t);
      if (verify) {
        const c = await verifyCounts(supabase, baseId, t.name);
        s.stagingCount = c;
      }
      summaries.push(s);
    }

    console.log('\nImport completed. Summary:');
    for (const s of summaries) {
      console.log(`- ${s.tableName}: fetched=${s.fetched} upserted=${s.upserted}${s.stagingCount != null ? ` stagingCount=${s.stagingCount}` : ''}`);
    }
    console.log('\nJSON ->');
    console.log(JSON.stringify({ baseId, summaries }, null, 2));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
