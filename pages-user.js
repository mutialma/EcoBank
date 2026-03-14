// ──────────────────────────────────────────────
//  User Pages - EcoBank Sampah
// ──────────────────────────────────────────────

async function userDashboard() {
  setTitle('Dashboard');
  showLoading();
  try {
    const res = await apiGet('/users/me/dashboard');
    const { user, stats, recentDeposits } = res.data;
    APP.user = { ...APP.user, balance: user.balance };

    document.getElementById('pageContent').innerHTML = `
      <div class="saldo-hero">
        <div class="saldo-label">💰 Saldo Aktif Anda</div>
        <div class="saldo-amount">${fmt(stats.balance)}</div>
        <div class="saldo-btns">
          <button class="saldo-btn primary" onclick="navigate('userSaldo')">💸 Tarik Saldo</button>
          <button class="saldo-btn secondary" onclick="navigate('userDeposits')">📋 Riwayat</button>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">📥</span>
          <div class="stat-label">Total Setoran</div>
          <div class="stat-value sm">${fmt(stats.totalDeposit)}</div>
        </div>
        <div class="stat-card blue">
          <span class="stat-icon">📤</span>
          <div class="stat-label">Total Penarikan</div>
          <div class="stat-value sm">${fmt(stats.totalWithdraw)}</div>
        </div>
        <div class="stat-card amber">
          <span class="stat-icon">⏳</span>
          <div class="stat-label">Pending</div>
          <div class="stat-value">${stats.pendingWithdrawals}</div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">♻️</span>
          <div class="stat-label">Total Sampah</div>
          <div class="stat-value">${Number(stats.totalWeight).toFixed(1)} <span style="font-size:14px;font-weight:400">kg</span></div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <span class="card-title">📋 Setoran Terakhir</span>
          <button class="btn btn-gray sm" onclick="navigate('userDeposits')">Lihat Semua</button>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Jenis Sampah</th><th>Berat</th><th>Nilai</th></tr></thead>
            <tbody>${recentDeposits.length ? recentDeposits.map(d => `
              <tr>
                <td>${fmtDate(d.date)}</td>
                <td>${d.trash_icon||''} <span class="fw">${d.trash_name||'-'}</span></td>
                <td>${d.weight} ${d.trash_unit||'kg'}</td>
                <td class="fw text-green">${fmt(d.amount)}</td>
              </tr>`).join('') : emptyRow(4)}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

async function userSaldo() {
  setTitle('Saldo & Penarikan');
  showLoading();
  try {
    const [meRes, semRes, wRes] = await Promise.all([
      apiGet('/users/me'),
      apiGet('/public/sembako'),
      apiGet('/users/me/withdrawals')
    ]);
    const user     = meRes.data;
    const sembako  = semRes.data;
    const pending  = wRes.data.filter(w => w.status === 'pending');

    document.getElementById('pageContent').innerHTML = `
      <div class="saldo-hero" style="margin-bottom:24px">
        <div class="saldo-label">💰 Saldo Anda</div>
        <div class="saldo-amount">${fmt(user.balance)}</div>
      </div>

      <div class="page-header">
        <div>
          <div class="page-header-title">Ajukan Penarikan</div>
          <div class="page-header-sub">Pilih metode penarikan saldo</div>
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-body">
          <div class="form-group" style="margin-bottom:18px">
            <div class="form-label">Metode Penarikan</div>
            <div class="method-cards">
              <div class="method-card selected" id="mCash" onclick="selectMethod('cash')">
                <div class="method-icon">💵</div>
                <div class="method-name">Tunai (Cash)</div>
              </div>
              <div class="method-card" id="mSembako" onclick="selectMethod('sembako')">
                <div class="method-icon">🛒</div>
                <div class="method-name">Tukar Sembako</div>
              </div>
            </div>
          </div>

          <div id="cashForm">
            <div class="form-group">
              <label class="form-label">Jumlah Penarikan (Rp)</label>
              <input type="number" class="form-control" id="wAmount" placeholder="Masukkan jumlah" min="10000" step="5000">
            </div>
            <div class="form-group" style="margin-top:12px">
              <label class="form-label">Catatan (opsional)</label>
              <input class="form-control" id="wNote" placeholder="Catatan">
            </div>
            <button class="btn btn-green" style="margin-top:16px" onclick="submitWithdrawal('cash')">💸 Ajukan Penarikan Tunai</button>
          </div>

          <div id="sembakoForm" class="hidden">
            <div class="form-group">
              <label class="form-label">Pilih Sembako</label>
              <select class="form-control" id="semSel" onchange="updateSemTotal()">
                <option value="">-- Pilih Produk --</option>
                ${sembako.map(s => `<option value="${s.id}" data-price="${s.price}">${s.icon} ${s.name} — ${fmt(s.price)}/${s.unit} (Stok: ${s.stock})</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-top:12px">
              <label class="form-label">Jumlah</label>
              <input type="number" class="form-control" id="semQty" value="1" min="1" oninput="updateSemTotal()">
            </div>
            <div class="calc-box" id="semCalc">
              <div class="calc-row">
                <span class="text-sm text-muted">Total Biaya</span>
                <span class="calc-val" id="semCalcVal">Rp 0</span>
              </div>
            </div>
            <button class="btn btn-green" onclick="submitWithdrawal('sembako')">🛒 Ajukan Tukar Sembako</button>
          </div>
        </div>
      </div>

      ${pending.length ? `
      <div class="card">
        <div class="card-head"><span class="card-title">⏳ Permintaan Pending</span></div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Tipe</th><th>Jumlah</th><th>Tanggal</th><th>Status</th></tr></thead>
            <tbody>${pending.map(w => `<tr>
              <td>${w.type==='cash'?'💵 Tunai':'🛒 '+w.sembako_name}</td>
              <td class="fw">${fmt(w.amount)}</td>
              <td>${fmtDate(w.date)}</td>
              <td>${statusBadge(w.status)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>` : ''}`;
  } catch(e) { showToast('error','Error', e.message); }
}

function selectMethod(type) {
  document.querySelectorAll('.method-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(type === 'cash' ? 'mCash' : 'mSembako').classList.add('selected');
  document.getElementById('cashForm').classList.toggle('hidden', type !== 'cash');
  document.getElementById('sembakoForm').classList.toggle('hidden', type !== 'sembako');
}

function updateSemTotal() {
  const sel   = document.getElementById('semSel');
  const qty   = parseInt(document.getElementById('semQty').value) || 0;
  const price = parseInt(sel.options[sel.selectedIndex]?.dataset?.price || 0);
  const box   = document.getElementById('semCalc');
  if (price && qty > 0) {
    document.getElementById('semCalcVal').textContent = fmt(price * qty);
    box.style.display = 'block';
  } else box.style.display = 'none';
}

async function submitWithdrawal(type) {
  try {
    let body = { type };
    if (type === 'cash') {
      const amount = parseInt(document.getElementById('wAmount').value);
      const note   = document.getElementById('wNote').value;
      if (!amount || amount < 10000) { showToast('error','Error','Minimal Rp 10.000'); return; }
      body = { ...body, amount, note };
    } else {
      const sembakoId = document.getElementById('semSel').value;
      const qty       = parseInt(document.getElementById('semQty').value);
      if (!sembakoId) { showToast('error','Error','Pilih produk sembako'); return; }
      body = { ...body, sembakoId: parseInt(sembakoId), qty };
    }
    await apiPost('/users/me/withdrawals', body);
    showToast('success','Berhasil','Permintaan penarikan berhasil diajukan');
    userSaldo();
  } catch(e) { showToast('error','Gagal', e.message); }
}

async function userDeposits() {
  setTitle('Riwayat Setoran');
  showLoading();
  try {
    const res  = await apiGet('/users/me/deposits');
    const deps = res.data;
    document.getElementById('pageContent').innerHTML = `
      <div class="card">
        <div class="card-head">
          <span class="card-title">📥 Semua Setoran Sampah</span>
          <span class="badge badge-green">${deps.length} transaksi</span>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Jenis Sampah</th><th>Berat</th><th>Harga/Satuan</th><th>Total</th></tr></thead>
            <tbody>${deps.length ? deps.map(d => `<tr>
              <td>${fmtDate(d.date)}</td>
              <td>${d.trash_icon||''} <span class="fw">${d.trash_name||'-'}</span></td>
              <td>${d.weight} ${d.trash_unit||'kg'}</td>
              <td>${fmt(d.price_per_kg||0)}</td>
              <td class="fw text-green">${fmt(d.amount)}</td>
            </tr>`).join('') : emptyRow(5)}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

async function userWithdrawals() {
  setTitle('Riwayat Penarikan');
  showLoading();
  try {
    const res  = await apiGet('/users/me/withdrawals');
    const rows = res.data;
    document.getElementById('pageContent').innerHTML = `
      <div class="card">
        <div class="card-head">
          <span class="card-title">📤 Semua Penarikan</span>
          <span class="badge badge-blue">${rows.length} transaksi</span>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Tipe</th><th>Detail</th><th>Jumlah</th><th>Status</th></tr></thead>
            <tbody>${rows.length ? rows.map(w => `<tr>
              <td>${fmtDate(w.date)}</td>
              <td>${w.type==='cash'?'💵 Tunai':'🛒 Sembako'}</td>
              <td class="text-sm text-muted">${w.type==='sembako'?`${w.sembako_name} ×${w.qty}`:w.note||'-'}</td>
              <td class="fw">${fmt(w.amount)}</td>
              <td>${statusBadge(w.status)}</td>
            </tr>`).join('') : emptyRow(5)}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

async function userPrices() {
  setTitle('Harga Sampah');
  showLoading();
  try {
    const res  = await apiGet('/public/trash-prices');
    const rows = res.data;
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">💹 Harga Sampah Hari Ini</div>
          <div class="page-header-sub">Harga dapat berubah sewaktu-waktu</div>
        </div>
      </div>
      <div class="price-grid">
        ${rows.map(t => `
          <div class="price-card">
            <div class="price-card-icon">${t.icon}</div>
            <div class="price-card-name">${t.name}</div>
            <div class="price-card-price">${fmt(t.price_per_kg)}</div>
            <div class="price-card-unit">per ${t.unit}</div>
          </div>`).join('')}
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

async function userProfile() {
  setTitle('Profil Saya');
  showLoading();
  try {
    const res = await apiGet('/users/me');
    const u   = res.data;
    const initials = u.name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
    document.getElementById('pageContent').innerHTML = `
      <div class="profile-hero">
        <div class="profile-avatar">${initials}</div>
        <div>
          <div class="profile-name">${u.name}</div>
          <div class="profile-email">${u.email}</div>
          <div class="profile-bal">${fmt(u.balance)}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head">
          <span class="card-title">📋 Informasi Akun</span>
          <button class="btn btn-outline sm" onclick="showEditProfile(${JSON.stringify(u).replace(/"/g,'&quot;')})">✏️ Edit</button>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div><div class="form-label">Nama Lengkap</div><div class="fw">${u.name}</div></div>
            <div><div class="form-label">Email</div><div class="fw">${u.email}</div></div>
            <div><div class="form-label">No. Telepon</div><div class="fw">${u.phone||'-'}</div></div>
            <div><div class="form-label">Bergabung</div><div class="fw">${fmtDate(u.join_date)}</div></div>
            <div class="full"><div class="form-label">Alamat</div><div class="fw">${u.address||'-'}</div></div>
          </div>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

function showEditProfile(u) {
  showModal('✏️ Edit Profil', `
    <div class="form-group"><label class="form-label">Nama Lengkap</label><input class="form-control" id="epName" value="${u.name}"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">No. Telepon</label><input class="form-control" id="epPhone" value="${u.phone||''}"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Alamat</label><input class="form-control" id="epAddr" value="${u.address||''}"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-green" onclick="saveProfile()">💾 Simpan</button>`);
}

async function saveProfile() {
  try {
    const res = await apiPut('/users/me', {
      name:    document.getElementById('epName').value,
      phone:   document.getElementById('epPhone').value,
      address: document.getElementById('epAddr').value,
    });
    APP.user = { ...APP.user, ...res.data };
    localStorage.setItem('eco_user', JSON.stringify(APP.user));
    updateSidebarUser();
    closeModal();
    showToast('success','Berhasil','Profil berhasil diperbarui');
    userProfile();
  } catch(e) { showToast('error','Gagal', e.message); }
}
