'use strict';

const { createSupabaseClient } = require('./env');
const { listAllRecords } = require('./utils');

function usage() {
  console.error('Usage: node scripts/airtable/migrate-roles.js <BASE_ID> [--table Roles] [--dry-run] [--create-missing]');
  process.exit(2);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { baseId: null, table: 'Roles', dryRun: false, createMissing: false };
  for (const a of args) {
    if (!a || a === '--') continue;
    if (!out.baseId && !a.startsWith('--')) { out.baseId = a; continue; }
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--create-missing') out.createMissing = true;
    else if (a === '--table') {
      const idx = args.indexOf(a);
      if (idx >= 0 && args[idx+1]) out.table = args[idx+1];
    }
  }
  return out;
}

const { baseId, table, dryRun, createMissing } = parseArgs();
if (!baseId) usage();

function mapRole(value) {
  if (!value) return null;
  const v = String(value).trim().toLowerCase();
  if (v === 'admin') return 'ADMIN';
  if (v === 'editor') return 'STAFF';
  if (v === 'viewer') return 'PUBLIC';
  return null;
}

(async () => {
  const supabase = createSupabaseClient();
  const recs = await listAllRecords({ baseId, tableName: table });
  console.log(`Loaded ${recs.length} record(s) from ${baseId}/${table}`);

  let updated = 0, skipped = 0, created = 0, missingUsers = 0;
  for (const r of recs) {
    const email = r.fields?.Email || r.fields?.email || r.fields?.E-mail;
    const roleRaw = r.fields?.Role;
    const role = mapRole(roleRaw);
    if (!email || !role) { skipped++; continue; }

    // Check if user exists
    const { data: existing, error: selErr } = await supabase
      .from('users')
      .select('id,email,role')
      .eq('email', email)
      .limit(1)
      .maybeSingle();

    if (selErr) { throw selErr; }

    if (!existing) {
      missingUsers++;
      if (!createMissing) continue;
      if (dryRun) { created++; continue; }
      const { error: insErr } = await supabase
        .from('users')
        .insert({ email, role, first_name: email.split('@')[0], last_name: '', password_hash: 'migrated' });
      if (insErr) throw insErr;
      created++;
      continue;
    }

    if (existing.role === role) { skipped++; continue; }

    if (dryRun) { updated++; continue; }
    const { error: updErr } = await supabase
      .from('users')
      .update({ role })
      .eq('id', existing.id);
    if (updErr) throw updErr;
    updated++;
  }

  console.log(JSON.stringify({ summary: { baseId, table, dryRun, createMissing, updated, skipped, created, missingUsers } }, null, 2));
})();
