'use strict';

const { createSupabaseClient } = require('./env');
const { listAllRecords } = require('./utils');
const fs = require('fs/promises');
const path = require('path');

function usage() {
  console.error('Usage: node scripts/airtable/migrate-members.js <BASE_ID> [--table "Household Members"] [--dry-run]');
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

function selName(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val && val.name) return val.name;
  return null;
}

(async () => {
  const supabase = createSupabaseClient();

  const mapPath = path.join(__dirname, 'output', `homeowners-map-${baseId}.json`);
  let homeownerMap = {};
  try {
    homeownerMap = JSON.parse(await fs.readFile(mapPath, 'utf8'));
  } catch {
    console.warn(`[warn] Homeowner mapping not found at ${mapPath}. Run migrate-homeowners first.`);
  }

  const records = await listAllRecords({ baseId, tableName: table });
  console.log(`Loaded ${records.length} record(s) from ${baseId}/${table}`);

  let inserted = 0, updated = 0, skipped = 0, errors = 0, missingHomeowner = 0;

  for (const r of records) {
    const f = r.fields || {};
    const name = f['Name'] || null;
    const relation = selName(f['Relationship to Homeowner/Tenant']);
    const age = f['Age'] != null ? Number(f['Age']) : null;

    // Link to HOA via 'Member Name' linked field
    const links = f['Member Name'];
    const linkedId = Array.isArray(links) && links.length > 0 ? links[0] : null;
    const homeownerEntry = linkedId ? homeownerMap[linkedId] : null;
    const homeownerId = homeownerEntry ? homeownerEntry.homeowner_id : null;

    if (!name) { skipped++; continue; }
    if (!homeownerId) { missingHomeowner++; continue; }

    if (dryRun) {
      // In dry-run, estimate as insert if homeowner mapping exists
      inserted++;
      continue;
    }

    // Check if exists by homeowner_id + full_name
    const { data: existing, error: selErr } = await supabase
      .from('members')
      .select('id,full_name')
      .eq('homeowner_id', homeownerId)
      .eq('full_name', name)
      .limit(1)
      .maybeSingle();

    if (selErr) { console.error('select error', selErr.message || selErr); errors++; continue; }

    if (!existing) {
      const { error: insErr } = await supabase
        .from('members')
        .insert({ homeowner_id: homeownerId, full_name: name, relation, is_active: true });
      if (insErr) { console.error('insert error', insErr.message || insErr); errors++; continue; }
      inserted++;
    } else {
      const { error: updErr } = await supabase
        .from('members')
        .update({ relation })
        .eq('id', existing.id);
      if (updErr) { console.error('update error', updErr.message || updErr); errors++; continue; }
      updated++;
    }
  }

  console.log(JSON.stringify({ summary: { baseId, table, dryRun, inserted, updated, skipped, missingHomeowner, errors } }, null, 2));
})();
