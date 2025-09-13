'use strict';

const { airtableAuthHeaders } = require('./env');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: { ...airtableAuthHeaders(), ...(init.headers || {}) },
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after')) || 2;
    await sleep(retryAfter * 1000);
    return fetchJson(url, init);
  }
  if (!res.ok) {
    let extra = '';
    try { extra = await res.text(); } catch {}
    const err = new Error(`Airtable API error ${res.status} ${res.statusText} -> ${url}\n${extra}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function encodeQuery(params) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) {
      for (const item of v) usp.append(k, String(item));
    } else {
      usp.set(k, String(v));
    }
  }
  return usp.toString();
}

async function listAllRecords({ baseId, tableName, view, fields, filterByFormula }) {
  const baseUrl = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableName)}`;
  const pageSize = 100;
  let offset;
  const all = [];
  let pages = 0;

  while (true) {
    const qs = encodeQuery({ pageSize, offset, view, ... (fields ? { fields } : {}), filterByFormula });
    const url = `${baseUrl}?${qs}`;
    const json = await fetchJson(url, { method: 'GET' });
    if (Array.isArray(json.records)) {
      all.push(...json.records);
    }
    pages += 1;
    process.stdout.write(`\rFetched ${all.length} records across ${pages} page(s)...`);
    if (!json.offset) break;
    offset = json.offset;
    await sleep(220);
  }

  process.stdout.write('\n');
  return all;
}

module.exports = {
  sleep,
  fetchJson,
  encodeQuery,
  listAllRecords,
};
