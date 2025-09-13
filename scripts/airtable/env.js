'use strict';

// Centralized config for Airtable + Supabase scripts
// - Loads environment variables from .env
// - Provides helpers for Airtable metadata requests and Supabase client creation

// Try to load dotenv if available; otherwise rely on shell-exported env vars.
try {
  require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });
} catch (e) {
  if (e && e.code === 'MODULE_NOT_FOUND') {
    console.warn('[airtable-migration] dotenv not installed; ensure required env vars are exported in your shell.');
  } else {
    throw e;
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const AIRTABLE_API_KEY = requireEnv('AIRTABLE_API_KEY');
const SUPABASE_URL = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

const { createClient } = require('@supabase/supabase-js');

function createSupabaseClient() {
  // Service role bypasses RLS; DO NOT expose this key client-side.
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
    global: { headers: { 'X-Client-Info': 'airtable-migration' } },
  });
}

function airtableAuthHeaders() {
  return {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function fetchAirtableMeta(path, init = {}) {
  const res = await fetch(`https://api.airtable.com/v0${path}`, {
    ...init,
    headers: { ...airtableAuthHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) {
    let extra = '';
    try { extra = await res.text(); } catch {}
    const err = new Error(`Airtable API error ${res.status} ${res.statusText} for ${path}\n${extra}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

module.exports = {
  requireEnv,
  AIRTABLE_API_KEY,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  createSupabaseClient,
  airtableAuthHeaders,
  fetchAirtableMeta,
};
