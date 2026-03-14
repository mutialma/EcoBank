// ──────────────────────────────────────────────
//  App Core - EcoBank Sampah
// ──────────────────────────────────────────────

const APP = {
  user: null,
  page: '',
  role: 'user',
};

// ── LOGIN ROLE SWITCH ─────────────────────────
function setRole(role, el) {
  APP.role = role;
  document.querySelectorAll('.role-pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('loginSwitch').style.display = role === 'user' ? '' : 'none';
}

// ── LOGIN ─────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pw    = document.getElementById('loginPassword').value;
  if (!email || !pw) { showToast('error','Error','Email dan password wajib diisi'); return; }
  const btn = document.getElementById('loginBtn');
  btn.textContent = '⏳ Memproses…'; btn.disabled = true;
  try {
    const res = await apiPost('/auth/login', { email, password: pw, role: APP.role });
    TOKEN = res.data.token;
    APP.user = res.data.user;
    localStorage.setItem('eco_token', TOKEN);
    localStorage.setItem('eco_user', JSON.stringify(APP.user));
    startApp();
  } catch(e) {
    showToast('error','Login Gagal', e.message);
  } finally {
    btn.textContent = 'Masuk →'; btn.disabled = false;
  }
}

// ── REGISTER ──────────────────────────────────
async function doRegister() {
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pw    = document.getElementById('regPass').value;
  const phone = document.getElementById('regPhone').value.trim();
  const addr  = document.getElementById('regAddress').value.trim();
  if (!name||!email||!pw||!phone) { showToast('error','Error','Semua field wajib diisi'); return; }
  try {
    await apiPost('/auth/register', { name, email, password: pw, phone, address: addr });
    showToast('success','Berhasil','Akun berhasil dibuat! Silakan login');
    showAuth('loginScreen');
  } catch(e) { showToast('error','Gagal', e.message); }
}

// ── LOGOUT ────────────────────────────────────
function doLogout() {
  TOKEN = null;
  APP.user = null;
  localStorage.removeItem('eco_token');
  localStorage.removeItem('eco_user');
  document.getElementById('appScreen').classList.add('hidden');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('loginEmail').value = '';
  document.getElementById('loginPassword').value = '';
  showAuth('loginScreen');
}

// ── START APP ─────────────────────────────────
function startApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');

  updateSidebarUser();
  document.getElementById('topbarDate').textContent =
    new Date().toLocaleDateString('id-ID', {weekday:'long',day:'numeric',month:'long',year:'numeric'});

  const role = APP.user.role;
  if      (role === 'admin')   { document.getElementById('roleLabel').textContent = 'Panel Admin';    buildNav(); navigate('adminDashboard'); }
  else if (role === 'pemasok') { document.getElementById('roleLabel').textContent = 'Panel Pemasok';  buildNav(); navigate('pemasokDashboard'); }
  else                         { document.getElementById('roleLabel').textContent = 'Panel Nasabah';  buildNav(); navigate('userDashboard'); }
}

// ── SIDEBAR USER ──────────────────────────────
function updateSidebarUser() {
  if (!APP.user) return;
  const initials = APP.user.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
  document.getElementById('sAvatar').textContent = initials;
  document.getElementById('sName').textContent   = APP.user.name;
  document.getElementById('sRole').textContent   = APP.user.role === 'admin' ? 'Administrator' : APP.user.role === 'pemasok' ? 'Pemasok' : 'Nasabah';
}

// ── BUILD NAV ─────────────────────────────────
function buildNav() {
  const role = APP.user?.role;
  let items  = [];

  if (role === 'user') {
    items = [
      { id:'userDashboard',    icon:'🏠', label:'Dashboard' },
      { id:'userSaldo',        icon:'💰', label:'Saldo & Tarik' },
      { id:'userDeposits',     icon:'📥', label:'Riwayat Setoran' },
      { id:'userWithdrawals',  icon:'📤', label:'Riwayat Penarikan' },
      { id:'userPrices',       icon:'💹', label:'Harga Sampah' },
      { id:'userProfile',      icon:'👤', label:'Profil Saya' },
    ];
  } else if (role === 'admin') {
    items = [
      { id:'adminDashboard',   icon:'🏠', label:'Dashboard' },
      { id:'adminNasabah',     icon:'👥', label:'Data Nasabah' },
      { id:'adminSetoran',     icon:'📥', label:'Input Setoran' },
      { id:'adminTrash',       icon:'♻️', label:'Jenis Sampah' },
      { id:'adminPenarikan',   icon:'💸', label:'Kelola Penarikan', badgeFn: async () => {
          try { const r = await apiGet('/admin/penarikan?status=pending'); return r.data.length || 0; } catch { return 0; }
      }},
      { id:'adminSembako',     icon:'🛒', label:'Kelola Sembako' },
      { id:'adminTransaksi',   icon:'📊', label:'Riwayat Transaksi' },
      { id:'adminPemasok',     icon:'🏪', label:'Data Pemasok' },
    ];
  } else {
    items = [
      { id:'pemasokDashboard', icon:'🏠', label:'Dashboard' },
      { id:'pemasokSembako',   icon:'🛒', label:'Kelola Sembako' },
      { id:'pemasokStok',      icon:'📦', label:'Update Stok & Harga' },
      { id:'pemasokPermintaan',icon:'📋', label:'Permintaan Sembako', badgeFn: async () => {
          try { const r = await apiGet('/pemasok/permintaan?status=pending'); return r.data.length || 0; } catch { return 0; }
      }},
    ];
  }

  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = items.map(item => `
    <div class="nav-item${APP.page === item.id ? ' active' : ''}" id="nav-${item.id}" onclick="navigate('${item.id}')">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
      <span class="nav-badge" id="badge-${item.id}" style="display:none">0</span>
    </div>`).join('');

  // Load badges async
  items.filter(i => i.badgeFn).forEach(async item => {
    const count = await item.badgeFn();
    const el    = document.getElementById(`badge-${item.id}`);
    if (el && count > 0) { el.textContent = count; el.style.display = ''; }
  });
}

// ── NAVIGATE ──────────────────────────────────
function navigate(page) {
  APP.page = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const el = document.getElementById(`nav-${page}`);
  if (el) el.classList.add('active');
  closeSidebar();

  const routes = {
    userDashboard, userSaldo, userDeposits, userWithdrawals, userPrices, userProfile,
    adminDashboard, adminNasabah, adminSetoran, adminTrash, adminPenarikan,
    adminSembako, adminTransaksi, adminPemasok,
    pemasokDashboard, pemasokSembako, pemasokStok, pemasokPermintaan,
  };
  if (routes[page]) routes[page]();
}

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Auto-login
  const savedToken = localStorage.getItem('eco_token');
  const savedUser  = localStorage.getItem('eco_user');
  if (savedToken && savedUser) {
    TOKEN    = savedToken;
    APP.user = JSON.parse(savedUser);
    startApp();
    return;
  }

  // Demo hint
  const hint = document.createElement('div');
  hint.style.cssText = 'position:fixed;bottom:16px;left:16px;background:var(--green-900);color:var(--cream);padding:16px 20px;border-radius:14px;font-size:12.5px;z-index:9999;max-width:270px;line-height:1.9;box-shadow:0 8px 32px rgba(0,0,0,.3)';
  hint.innerHTML = `
    <div style="font-family:Syne,sans-serif;font-weight:800;margin-bottom:8px;color:var(--green-300)">🔑 Akun Demo</div>
    <div>👤 <b>Nasabah</b> · budi@mail.com / 123456</div>
    <div>🛡️ <b>Admin</b> · admin@eco.com / admin123</div>
    <div>🏪 <b>Pemasok</b> · pemasok@mail.com / 123456</div>
    <button onclick="this.parentElement.remove()" style="position:absolute;top:10px;right:12px;background:none;border:none;color:var(--green-400);cursor:pointer;font-size:16px">✕</button>`;
  document.body.appendChild(hint);
});
