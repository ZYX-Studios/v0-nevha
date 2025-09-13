'use strict';

const { createSupabaseClient } = require('./env');

function usage() {
  console.error('Usage: node scripts/airtable/transform-homeowners.js <BASE_ID> [--table "HOA_TABLE"] [--dry-run]');
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

function getSelName(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val && val.name) return val.name;
  return null;
}

function buildAddress(fields) {
  const fa = fields['Full Address'];
  if (fa && String(fa).trim()) return String(fa).trim();
  const block = fields['Block'];
  const lot = fields['Lot'];
  const phase = fields['Phase'];
  const street = fields['Street'];
  const parts = [];
  if (block != null) parts.push(`Block ${block}`);
  if (lot != null) parts.push(`Lot ${lot}`);
  if (phase != null) parts.push(`Phase ${phase}`);
  if (street) parts.push(`${street} Street`);
  return parts.join(', ') || null;
}

function isOwner(fields) {
  const s = fields['Status'];
  const name = getSelName(s);
  if (!name) return null;
  return name.toLowerCase() === 'owner';
}

function makeNotes(fields) {
  const parts = [];
  if (fields['Contact Number'] != null) parts.push(`Contact: ${fields['Contact Number']}`);
  if (fields['Contact No'] != null) parts.push(`Contact: ${fields['Contact No']}`);
  if (fields['Facebook Profile']) parts.push(`FB: ${fields['Facebook Profile']}`);
  if (fields['Name of Lot Owner (If Tenant)']) parts.push(`Lot Owner: ${fields['Name of Lot Owner (If Tenant)']}`);
  if (fields['Length of Residency'] != null) parts.push(`Years: ${fields['Length of Residency']}`);
  if (fields['Date Paid']) parts.push(`Date Paid: ${fields['Date Paid']}`);
  if (fields['Amount Paid'] != null) parts.push(`Amount Paid: ${fields['Amount Paid']}`);
  return parts.join(' | ') || null;
}

function parseNameParts(fields) {
  const first = fields['First Name'] && String(fields['First Name']).trim();
  const last = fields['Surname'] && String(fields['Surname']).trim();
  const mid = fields['M Initial'] && String(fields['M Initial']).trim();
  if (first || last || mid) {
    return { firstName: first || null, lastName: last || null, middleInitial: mid || null };
  }
  const full = fields['Full Name'] && String(fields['Full Name']).trim();
  if (!full) return { firstName: null, lastName: null, middleInitial: null };
  // Try formats: "Last, First M" or "First M Last"
  let firstName = null, lastName = null, middleInitial = null;
  if (full.includes(',')) {
    const [l, rest] = full.split(',', 2).map(s => s.trim());
    lastName = l || null;
    if (rest) {
      const parts = rest.split(/\s+/).filter(Boolean);
      if (parts.length > 0) firstName = parts[0];
      if (parts.length > 1) middleInitial = parts[1].replace('.', '');
    }
  } else {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      firstName = parts[0];
    } else if (parts.length >= 2) {
      // Assume last token is last name, first is first name, second (if present) is middle initial
      firstName = parts[0];
      lastName = parts[parts.length - 1];
      if (parts.length >= 3) middleInitial = parts[1].replace('.', '');
    }
  }
  return {
    firstName: firstName || null,
    lastName: lastName || null,
    middleInitial: middleInitial || null,
  };
}

function coalesceContact(fields) {
  const a = fields['Contact Number'];
  const b = fields['Contact No'];
  const v = a != null && String(a).trim() ? a : b;
  return v != null && String(v).trim() ? String(v).trim() : null;
}

function parseIntOrNull(v) {
  if (v == null) return null;
  const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
}

function parseAmountOrNull(v) {
  if (v == null) return null;
  const s = String(v).replace(/,/g, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDateOrNull(v) {
  if (!v) return null;
  // Accept ISO or common MM/DD/YYYY
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const [mm, dd, yyyy] = s.split('/');
    const y = String(yyyy).length === 2 ? `20${yyyy}` : yyyy;
    const m = mm.padStart(2, '0');
    const d = dd.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
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

(async () => {
  try {
    const supabase = createSupabaseClient();

    const staging = await fetchStagingRecords(supabase, baseId, table);
    console.log(`Loaded ${staging.length} staging row(s) for ${table}`);

    let inserted = 0, updated = 0, skipped = 0, errors = 0, mapped = 0;
    const mappings = [];

    for (const row of staging) {
      const fields = row.fields || {};
      const propertyAddress = buildAddress(fields);
      const owner = isOwner(fields);
      const notes = makeNotes(fields);
      let { firstName, lastName, middleInitial } = parseNameParts(fields);
      // Ensure middle initial is a single character when available
      middleInitial = middleInitial ? String(middleInitial).trim().charAt(0) : null;
      const block = fields['Block'] != null ? String(fields['Block']) : null;
      const lot = fields['Lot'] != null ? String(fields['Lot']) : null;
      const phase = fields['Phase'] != null ? String(fields['Phase']) : null;
      const street = fields['Street'] != null ? String(fields['Street']) : null;
      const contactNumber = coalesceContact(fields);
      const lengthOfResidency = parseIntOrNull(fields['Length of Residency']);
      const email = fields['Email'] ? String(fields['Email']).trim() : null;
      const facebook = fields['Facebook Profile'] ? String(fields['Facebook Profile']).trim() : null;
      const datePaid = parseDateOrNull(fields['Date Paid']);
      const amountPaid = parseAmountOrNull(fields['Amount Paid']);

      if (!propertyAddress) { skipped++; continue; }

      // Try find existing homeowner by property_address
      const { data: existing, error: selErr } = await supabase
        .from('homeowners')
        .select('id,property_address,notes,is_owner')
        .eq('property_address', propertyAddress)
        .limit(1)
        .maybeSingle();
      if (selErr) { console.error('select error', selErr.message || selErr); errors++; continue; }

      let homeownerId;
      if (!existing) {
        if (dryRun) { inserted++; homeownerId = 'DRY_RUN'; }
        else {
          const { data: ins, error: insErr } = await supabase
            .from('homeowners')
            .insert({
              property_address: propertyAddress,
              is_owner: owner,
              notes,
              first_name: firstName,
              last_name: lastName,
              middle_initial: middleInitial,
              block,
              lot,
              phase,
              street,
              contact_number: contactNumber,
              length_of_residency: lengthOfResidency,
              email,
              facebook_profile: facebook,
              date_paid: datePaid,
              amount_paid: amountPaid,
            })
            .select('id')
            .maybeSingle();
          if (insErr) { console.error('insert error', insErr.message || insErr); errors++; continue; }
          homeownerId = ins.id;
          inserted++;
        }
      } else {
        homeownerId = existing.id;
        if (dryRun) { updated++; }
        else {
          const { error: updErr } = await supabase
            .from('homeowners')
            .update({
              is_owner: owner,
              notes,
              first_name: firstName,
              last_name: lastName,
              middle_initial: middleInitial,
              block,
              lot,
              phase,
              street,
              contact_number: contactNumber,
              length_of_residency: lengthOfResidency,
              email,
              facebook_profile: facebook,
              date_paid: datePaid,
              amount_paid: amountPaid,
            })
            .eq('id', existing.id);
          if (updErr) { console.error('update error', updErr.message || updErr); errors++; continue; }
          updated++;
        }
      }

      // Record mapping to link downstream
      if (!dryRun) {
        mappings.push({
          base_id: baseId,
          table_name: table,
          record_id: row.record_id,
          target_table: 'homeowners',
          target_id: homeownerId,
        });
        mapped++;
      }
    }

    if (!dryRun && mappings.length) {
      const { error: mapErr } = await supabase
        .from('airtable_record_map')
        .upsert(mappings, { onConflict: 'base_id,table_name,record_id,target_table' });
      if (mapErr) throw mapErr;
    }

    console.log(JSON.stringify({ summary: { baseId, table, dryRun, inserted, updated, skipped, errors, mapped } }, null, 2));
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
