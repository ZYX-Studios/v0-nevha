'use strict';

const { createSupabaseClient } = require('./env');

function usage() {
  console.error('Usage: node scripts/airtable/transform-members.js <BASE_ID> [--table "Household Members"] [--dry-run]');
  process.exit(2);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { baseId: null, table: 'Household Members', dryRun: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a || a === '--') continue;
    if (!out.baseId && !a.startsWith('--')) { out.baseId = a; continue; }
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--table') { if (args[i+1]) out.table = args[++i]; }
  }
  return out;
}

const { baseId, table, dryRun } = parseArgs();
if (!baseId) usage();

function getSelName(v) { return v && v.name ? v.name : (typeof v === 'string' ? v : null); }

async function fetchStagingRecords(supabase, baseId, tableName) {
  const batchSize = 1000;
  let from = 0;
  const rows = [];
  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await supabase
      .from('airtable_raw_records')
      .select('record_id,fields,created_time')
      .eq('base_id', baseId)
      .eq('table_name', tableName)
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return rows;
}

async function fetchHomeownerMap(supabase, baseId) {
  const map = new Map();
  const batchSize = 1000;
  let from = 0;
  while (true) {
    const to = from + batchSize - 1;
    const { data, error } = await supabase
      .from('airtable_record_map')
      .select('record_id,target_id')
      .eq('base_id', baseId)
      .eq('table_name', 'HOA_TABLE')
      .eq('target_table', 'homeowners')
      .range(from, to);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) map.set(r.record_id, r.target_id);
    if (data.length < batchSize) break;
    from += batchSize;
  }
  return map;
}

async function upsertMappings(supabase, mappings) {
  if (!mappings.length) return;
  const CHUNK = 1000;
  for (let i = 0; i < mappings.length; i += CHUNK) {
    const batch = mappings.slice(i, i + CHUNK);
    const { error } = await supabase
      .from('airtable_record_map')
      .upsert(batch, { onConflict: 'base_id,table_name,record_id,target_table' });
    if (error) throw error;
  }
}

(async () => {
  try {
    const supabase = createSupabaseClient();

    const staging = await fetchStagingRecords(supabase, baseId, table);
    console.log(`Loaded ${staging.length} staging row(s) for ${table}`);

    const homeownerMap = await fetchHomeownerMap(supabase, baseId);
    console.log(`Loaded homeowner mapping: ${homeownerMap.size} entries`);

    let inserted = 0, updated = 0, skipped = 0, errors = 0, missingHomeowner = 0, mapped = 0;
    const mappings = [];

    for (const row of staging) {
      const f = row.fields || {};
      const name = f['Name'] || null;
      const relation = getSelName(f['Relationship to Homeowner/Tenant']);
      const links = f['Member Name'];
      const linkedId = Array.isArray(links) && links.length > 0 ? links[0] : null;
      const homeownerId = linkedId ? homeownerMap.get(linkedId) : null;

      if (!name) { skipped++; continue; }
      if (!homeownerId) { missingHomeowner++; continue; }

      if (dryRun) { inserted++; continue; }

      // Check if exists by homeowner_id + full_name
      const { data: existing, error: selErr } = await supabase
        .from('members')
        .select('id,full_name,relation')
        .eq('homeowner_id', homeownerId)
        .eq('full_name', name)
        .limit(1)
        .maybeSingle();
      if (selErr) { console.error('select error', selErr.message || selErr); errors++; continue; }

      if (!existing) {
        const { data: ins, error: insErr } = await supabase
          .from('members')
          .insert({ homeowner_id: homeownerId, full_name: name, relation, is_active: true })
          .select('id')
          .maybeSingle();
        if (insErr) { console.error('insert error', insErr.message || insErr); errors++; continue; }
        inserted++;
        mappings.push({ base_id: baseId, table_name: table, record_id: row.record_id, target_table: 'members', target_id: ins.id });
        mapped++;
      } else {
        const { error: updErr } = await supabase
          .from('members')
          .update({ relation })
          .eq('id', existing.id);
        if (updErr) { console.error('update error', updErr.message || updErr); errors++; continue; }
        updated++;
      }
    }

    if (!dryRun && mappings.length) {
      await upsertMappings(supabase, mappings);
    }

    console.log(JSON.stringify({ summary: { baseId, table, dryRun, inserted, updated, skipped, missingHomeowner, errors, mapped } }, null, 2));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
