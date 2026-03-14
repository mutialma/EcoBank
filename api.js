// ──────────────────────────────────────────────
//  API Helper - EcoBank Sampah
// ──────────────────────────────────────────────
const API_BASE = 'http://localhost:5000/api';

let TOKEN = localStorage.getItem('eco_token') || null;

async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (TOKEN) opts.headers['Authorization'] = `Bearer ${TOKEN}`;
  if (body)  opts.body = JSON.stringify(body);

  try {
    const res  = await fetch(`${API_BASE}${path}`, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request gagal');
    return data;
  } catch (e) {
    if (e.message === 'Failed to fetch')
      throw new Error('Tidak dapat terhubung ke server. Pastikan Flask berjalan di port 5000.');
    throw e;
  }
}

function apiGet(path)           { return api('GET',    path); }
function apiPost(path, body)    { return api('POST',   path, body); }
function apiPut(path, body)     { return api('PUT',    path, body || {}); }
function apiDelete(path)        { return api('DELETE', path); }
