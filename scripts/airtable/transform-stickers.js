'use strict';

const { createSupabaseClient } = require('./env');

function usage() {
  console.error('Usage: node scripts/airtable/transform-stickers.js <BASE_ID> [--table "STICKER_TABLE 2"] [--dry-run]');
  process.exit(2);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { baseId: null, table: 'STICKER_TABLE 2', dryRun: false };
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

function getSelName(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val && val.name) return val.name;
  return null;
}

function stickerNotes(f) {
  const parts = [];
  if (f['Amount Pd'] != null) parts.push(`Amount Pd: ${f['Amount Pd']}`);
  if (f['Sticker Released?']) parts.push(`Released: ${getSelName(f['Sticker Released?'])}`);
  if (f['Category']) parts.push(`Category: ${getSelName(f['Category'])}`);
  return parts.join(' | ') || null;
}

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

    let upVeh = 0, upStk = 0, skipped = 0, missingHomeowner = 0, errors = 0, mapped = 0;
    const mappings = [];

    for (const row of staging) {
      const f = row.fields || {};
      const code = f['Sticker No'] != null ? String(f['Sticker No']) : null;
      if (!code) { skipped++; continue; }

      const links = f['Full Name'];
      const linkedId = Array.isArray(links) && links.length > 0 ? links[0] : null;
      const homeownerId = linkedId ? homeownerMap.get(linkedId) : null;
      if (!homeownerId) { missingHomeowner++; continue; }

      const plateNo = f['Plate No'] ? String(f['Plate No']) : null;
      const make = f['Maker'] || null;
      const model = f['Model'] || null;
      const issuedAt = f['Date Issued'] ? new Date(f['Date Issued']).toISOString().slice(0,10) : null; // date only
      const notes = stickerNotes(f);

      let vehicleId = null;
      if (plateNo) {
        if (!dryRun) {
          const { data: veh, error: vehErr } = await supabase
            .from('vehicles')
            .upsert({ plate_no: plateNo, make: make || null, model: model || null, homeowner_id: homeownerId }, { onConflict: 'plate_no' })
            .select('id')
            .maybeSingle();
          if (vehErr) { console.error('vehicle upsert error', vehErr.message || vehErr); errors++; continue; }
          vehicleId = veh?.id || null;
        } else {
          upVeh++;
        }
      }

      if (!dryRun) {
        const { data: stk, error: stkErr } = await supabase
          .from('stickers')
          .upsert({ code, homeowner_id: homeownerId, vehicle_id: vehicleId, issued_at: issuedAt, notes }, { onConflict: 'code' })
          .select('id')
          .maybeSingle();
        if (stkErr) { console.error('sticker upsert error', stkErr.message || stkErr); errors++; continue; }
        upStk++;
        mappings.push({ base_id: baseId, table_name: table, record_id: row.record_id, target_table: 'stickers', target_id: stk.id });
        mapped++;
      } else {
        upStk++;
      }
    }

    if (!dryRun && mappings.length) {
      await upsertMappings(supabase, mappings);
    }

    console.log(JSON.stringify({ summary: { baseId, table, dryRun, upsertedVehicles: upVeh, upsertedStickers: upStk, skipped, missingHomeowner, errors, mapped } }, null, 2));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
