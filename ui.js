// ──────────────────────────────────────────────
//  UI Utilities - EcoBank Sampah
// ──────────────────────────────────────────────

const fmt     = n => 'Rp ' + Number(n).toLocaleString('id-ID');
const fmtDate = d => d ? new Date(d).toLocaleDateString('id-ID', {day:'2-digit',month:'short',year:'numeric'}) : '-';
const today   = () => new Date().toISOString().split('T')[0];

// TOAST
function showToast(type, title, msg) {
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const wrap  = document.getElementById('toastWrap');
  const el    = document.createElement('div');
  el.className = `toast ${type !== 'success' ? type : ''}`;
  el.innerHTML = `
    <div class="toast-icon">${icons[type]||'ℹ️'}</div>
    <div>
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>`;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

// MODAL
function showModal(title, body, foot) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modalFoot').innerHTML = foot || '<button class="btn btn-secondary" onclick="closeModal()">Tutup</button>';
  document.getElementById('modalBg').classList.remove('hidden');
}
function closeModal()          { document.getElementById('modalBg').classList.add('hidden'); }
function closeModalOut(e)      { if (e.target === document.getElementById('modalBg')) closeModal(); }

// LOADING
function showLoading() {
  document.getElementById('pageContent').innerHTML = `
    <div class="loading-state">
      <span class="spin">♻️</span>
      <span>Memuat data…</span>
    </div>`;
}

// SIDEBAR
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// TITLE
function setTitle(t) { document.getElementById('topbarTitle').textContent = t; }

// AUTH SCREEN SWITCH
function showAuth(id) {
  ['loginScreen','registerScreen'].forEach(s =>
    document.getElementById(s).classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// STATUS BADGE
function statusBadge(s) {
  const map = {
    approved: '<span class="badge badge-green">✅ Disetujui</span>',
    rejected: '<span class="badge badge-red">❌ Ditolak</span>',
    pending:  '<span class="badge badge-amber">⏳ Pending</span>',
  };
  return map[s] || `<span class="badge badge-gray">${s}</span>`;
}

// EMPTY ROW
function emptyRow(cols, text = 'Belum ada data') {
  return `<tr><td colspan="${cols}">
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">${text}</div>
    </div></td></tr>`;
}
