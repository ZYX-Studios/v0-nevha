'use strict';

const fs = require('fs/promises');
const path = require('path');
const { createSupabaseClient } = require('./env');
const { listAllRecords } = require('./utils');

function usage() {
  console.error('Usage: node scripts/airtable/migrate-homeowners.js <BASE_ID> [--table "HOA_TABLE"] [--dry-run]');
  process.exit(2);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { baseId: null, table: 'HOA_TABLE', dryRun: false };
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

function buildAddress(f) {
  // Prefer existing formula field 'Full Address' if available
  const fa = f['Full Address'];
  if (fa && String(fa).trim()) return String(fa).trim();
  const block = f['Block'];
  const lot = f['Lot'];
  const phase = f['Phase'];
  const street = f['Street'];
  const parts = [];
  if (block != null) parts.push(`Block ${block}`);
  if (lot != null) parts.push(`Lot ${lot}`);
  if (phase != null) parts.push(`Phase ${phase}`);
  if (street) parts.push(`${street} Street`);
  return parts.join(', ') || null;
}

function isOwner(f) {
  const s = f['Status'];
  if (!s) return null;
  if (typeof s === 'string') return s.toLowerCase() === 'owner';
  if (s && s.name) return String(s.name).toLowerCase() === 'owner';
  return null;
}

function homeownerNotes(f) {
  const parts = [];
  if (f['Contact No'] != null) parts.push(`Contact No: ${f['Contact No']}`);
  if (f['Facebook Profile']) parts.push(`FB: ${f['Facebook Profile']}`);
  if (f['Name of Lot Owner (If Tenant)']) parts.push(`Lot Owner: ${f['Name of Lot Owner (If Tenant)']}`);
  if (f['Length of Residency'] != null) parts.push(`Years: ${f['Length of Residency']}`);
  if (f['Date Paid']) parts.push(`Date Paid: ${f['Date Paid']}`);
  if (f['Amount Paid'] != null) parts.push(`Amount Paid: ${f['Amount Paid']}`);
  return parts.join(' | ') || null;
}

(async () => {
  const supabase = createSupabaseClient();

  const records = await listAllRecords({ baseId, tableName: table });
  console.log(`Loaded ${records.length} record(s) from ${baseId}/${table}`);

  const mapPath = path.join(__dirname, 'output', `homeowners-map-${baseId}.json`);
  await fs.mkdir(path.dirname(mapPath), { recursive: true });
  let mapping = {};
  try {
    const buf = await fs.readFile(mapPath, 'utf8');
    mapping = JSON.parse(buf);
  } catch {}

  let inserted = 0, updated = 0, skipped = 0, errors = 0;

  for (const r of records) {
    const id = r.id;
    const f = r.fields || {};

    const fullName = f['Full Name'] || [f['First Name'], f['M Initial'], f['Surname']].filter(Boolean).join(' ');
    const propertyAddress = buildAddress(f);
    const owner = isOwner(f);
    const notes = homeownerNotes(f);

    if (!fullName && !propertyAddress) { skipped++; continue; }

    // Idempotent match: try by property_address
    let existing = null;
    {
      const { data, error } = await supabase
        .from('homeowners')
        .select('id, property_address, notes')
        .eq('property_address', propertyAddress)
        .limit(1)
        .maybeSingle();
      if (error) { console.error('select error', error.message || error); errors++; continue; }
      existing = data || null;
    }

    if (!existing) {
      if (dryRun) { inserted++; mapping[id] = { homeowner_id: 'DRY_RUN', propertyAddress, fullName }; continue; }
      const { data, error } = await supabase
        .from('homeowners')
        .insert({ property_address: propertyAddress, notes, is_owner: owner })
        .select('id')
        .maybeSingle();
      if (error) { console.error('insert error', error.message || error); errors++; continue; }
      mapping[id] = { homeowner_id: data.id, propertyAddress, fullName };
      inserted++;
    } else {
      // Optionally update notes/owner
      if (dryRun) { updated++; mapping[id] = { homeowner_id: existing.id, propertyAddress, fullName }; continue; }
      const { error } = await supabase
        .from('homeowners')
        .update({ notes, is_owner: owner })
        .eq('id', existing.id);
      if (error) { console.error('update error', error.message || error); errors++; continue; }
      mapping[id] = { homeowner_id: existing.id, propertyAddress, fullName };
      updated++;
    }
  }

  await fs.writeFile(mapPath, JSON.stringify(mapping, null, 2));

  console.log(JSON.stringify({ summary: { baseId, table, dryRun, inserted, updated, skipped, errors, mapPath } }, null, 2));
})();
