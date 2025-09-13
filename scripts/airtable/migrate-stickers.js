'use strict';

const fs = require('fs/promises');
const path = require('path');
const { createSupabaseClient } = require('./env');
const { listAllRecords } = require('./utils');

function usage() {
  console.error('Usage: node scripts/airtable/migrate-stickers.js <BASE_ID> [--table "STICKER_TABLE 2"|"Sticker Table 2025"] [--dry-run]');
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

(async () => {
  const supabase = createSupabaseClient();

  // Load homeowners mapping
  const mapPath = path.join(__dirname, 'output', `homeowners-map-${baseId}.json`);
  let homeownerMap = {};
  try {
    homeownerMap = JSON.parse(await fs.readFile(mapPath, 'utf8'));
  } catch {
    console.warn(`[warn] Homeowner mapping not found at ${mapPath}. Run migrate-homeowners first to build mapping.`);
  }

  const records = await listAllRecords({ baseId, tableName: table });
  console.log(`Loaded ${records.length} record(s) from ${baseId}/${table}`);

  let upsertedVehicles = 0, upsertedStickers = 0, skipped = 0, missingHomeowner = 0, errors = 0;

  for (const r of records) {
    const f = r.fields || {};
    const code = f['Sticker No'];
    const plateNo = f['Plate No'] || null;
    const make = f['Maker'] || null;
    const model = f['Model'] || null;
    const issuedAt = f['Date Issued'] ? new Date(f['Date Issued']).toISOString() : null;
    const notes = stickerNotes(f);

    // Link to HOA record via linked field "Full Name"
    const links = f['Full Name'];
    const linkedId = Array.isArray(links) && links.length > 0 ? links[0] : null;
    const homeownerEntry = linkedId ? homeownerMap[linkedId] : null;
    const homeownerId = homeownerEntry ? homeownerEntry.homeowner_id : null;

    if (!code) { skipped++; continue; }

    // Vehicle upsert by plate_no if available
    let vehicleId = null;
    if (plateNo) {
      if (!dryRun) {
        const { data: veh, error: vehErr } = await supabase
          .from('vehicles')
          .upsert({ plate_no: String(plateNo), make: make || null, model: model || null, homeowner_id: homeownerId || null }, { onConflict: 'plate_no' })
          .select('id')
          .maybeSingle();
        if (vehErr) { console.error('vehicle upsert error', vehErr.message || vehErr); errors++; continue; }
        vehicleId = veh?.id || null;
      } else {
        upsertedVehicles++;
      }
    }

    // Sticker upsert by code
    if (!dryRun) {
      const { error: stkErr } = await supabase
        .from('stickers')
        .upsert({ code: String(code), homeowner_id: homeownerId || null, vehicle_id: vehicleId, issued_at: issuedAt, notes }, { onConflict: 'code' });
      if (stkErr) { console.error('sticker upsert error', stkErr.message || stkErr); errors++; continue; }
      upsertedStickers++;
    } else {
      upsertedStickers++;
    }

    if (!homeownerId) missingHomeowner++;
  }

  console.log(JSON.stringify({ summary: { baseId, table, dryRun, upsertedVehicles, upsertedStickers, skipped, missingHomeowner, errors } }, null, 2));
})();
