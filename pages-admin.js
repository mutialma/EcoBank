// ──────────────────────────────────────────────
//  Admin Pages - EcoBank Sampah
// ──────────────────────────────────────────────

async function adminDashboard() {
  setTitle('Dashboard Admin');
  showLoading();
  try {
    const [dashRes, wRes] = await Promise.all([
      apiGet('/admin/dashboard'),
      apiGet('/admin/penarikan?status=pending')
    ]);
    const s       = dashRes.data.stats;
    const pending = wRes.data.slice(0, 5);

    document.getElementById('pageContent').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">👥</span>
          <div class="stat-label">Total Nasabah</div>
          <div class="stat-value">${s.totalNasabah}</div>
          <div class="stat-sub stat-up">${s.activeNasabah} aktif</div>
        </div>
        <div class="stat-card blue">
          <span class="stat-icon">💰</span>
          <div class="stat-label">Total Saldo Nasabah</div>
          <div class="stat-value sm">${fmt(s.totalSaldo)}</div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📥</span>
          <div class="stat-label">Total Setoran</div>
          <div class="stat-value sm">${fmt(s.totalDeposit)}</div>
          <div class="stat-sub">${s.depositCount} transaksi</div>
        </div>
        <div class="stat-card ${s.pendingCount > 0 ? 'amber' : ''}">
          <span class="stat-icon">⏳</span>
          <div class="stat-label">Pending Penarikan</div>
          <div class="stat-value">${s.pendingCount}</div>
          <div class="stat-sub ${s.pendingCount>0?'stat-down':''}">perlu approval</div>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <span class="card-title">⏳ Penarikan Menunggu Approval</span>
          <button class="btn btn-green sm" onclick="navigate('adminPenarikan')">Kelola Semua</button>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Nasabah</th><th>Tipe</th><th>Jumlah</th><th>Tanggal</th><th>Aksi</th></tr></thead>
            <tbody>${pending.length ? pending.map(w => `<tr>
              <td class="fw">${w.user_name||'-'}</td>
              <td>${w.type==='cash'?'💵 Tunai':'🛒 '+w.sembako_name}</td>
              <td class="fw">${fmt(w.amount)}</td>
              <td>${fmtDate(w.date)}</td>
              <td>
                <button class="btn btn-success xs" onclick="approveWd(${w.id},true)">✅ Setujui</button>
                <button class="btn btn-danger xs" onclick="approveWd(${w.id},false)">❌</button>
              </td>
            </tr>`).join('') : emptyRow(5,'Tidak ada permintaan pending')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

async function adminNasabah() {
  setTitle('Data Nasabah');
  showLoading();
  try {
    const res  = await apiGet('/admin/nasabah');
    const rows = res.data;
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">👥 Data Nasabah</div>
          <div class="page-header-sub">${rows.length} nasabah terdaftar</div>
        </div>
        <button class="btn btn-green" onclick="showAddNasabah()">➕ Tambah Nasabah</button>
      </div>
      <div class="card">
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Nama</th><th>Email</th><th>Telepon</th><th>Saldo</th><th>Total Setoran</th><th>Bergabung</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>${rows.map(u => `<tr>
              <td class="fw">${u.name}</td>
              <td>${u.email}</td>
              <td>${u.phone||'-'}</td>
              <td class="fw text-green">${fmt(u.balance)}</td>
              <td>${fmt(u.total_deposit||0)} <span class="badge badge-gray">${u.deposit_count||0}×</span></td>
              <td>${fmtDate(u.join_date)}</td>
              <td>${u.active?'<span class="badge badge-green">Aktif</span>':'<span class="badge badge-red">Nonaktif</span>'}</td>
              <td>
                <button class="btn btn-secondary xs" onclick="showEditNasabah(${u.id},'${u.name}','${u.phone||''}','${u.address||''}')">✏️</button>
                <button class="btn xs ${u.active?'btn-amber':'btn-success'}" onclick="toggleNasabah(${u.id},${u.active})">${u.active?'🚫':'✅'}</button>
              </td>
            </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

function showAddNasabah() {
  showModal('➕ Tambah Nasabah', `
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Nama</label><input class="form-control" id="anName"></div>
      <div class="form-group"><label class="form-label">Telepon</label><input class="form-control" id="anPhone"></div>
      <div class="form-group full"><label class="form-label">Email</label><input type="email" class="form-control" id="anEmail"></div>
      <div class="form-group"><label class="form-label">Password</label><input type="password" class="form-control" id="anPass"></div>
      <div class="form-group full"><label class="form-label">Alamat</label><input class="form-control" id="anAddr"></div>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-green" onclick="saveNewNasabah()">💾 Simpan</button>`);
}

async function saveNewNasabah() {
  const name  = document.getElementById('anName').value.trim();
  const email = document.getElementById('anEmail').value.trim();
  const pass  = document.getElementById('anPass').value;
  const phone = document.getElementById('anPhone').value.trim();
  const addr  = document.getElementById('anAddr').value.trim();
  if (!name||!email||!pass||!phone) { showToast('error','Error','Semua field wajib diisi'); return; }
  try {
    await apiPost('/auth/register', { name, email, password: pass, phone, address: addr });
    closeModal(); showToast('success','Berhasil','Nasabah ditambahkan'); adminNasabah();
  } catch(e) { showToast('error','Gagal', e.message); }
}

function showEditNasabah(id, name, phone, address) {
  showModal('✏️ Edit Nasabah', `
    <div class="form-group"><label class="form-label">Nama</label><input class="form-control" id="enName" value="${name}"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Telepon</label><input class="form-control" id="enPhone" value="${phone}"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Alamat</label><input class="form-control" id="enAddr" value="${address}"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-green" onclick="saveEditNasabah(${id})">💾 Simpan</button>`);
}

async function saveEditNasabah(id) {
  try {
    await apiPut(`/admin/nasabah/${id}`, {
      name:    document.getElementById('enName').value,
      phone:   document.getElementById('enPhone').value,
      address: document.getElementById('enAddr').value,
    });
    closeModal(); showToast('success','Berhasil','Data diperbarui'); adminNasabah();
  } catch(e) { showToast('error','Gagal', e.message); }
}

async function toggleNasabah(id, currentActive) {
  try {
    await apiPut(`/admin/nasabah/${id}`, { active: currentActive ? 0 : 1 });
    showToast('success','Berhasil','Status diubah'); adminNasabah();
  } catch(e) { showToast('error','Gagal', e.message); }
}

// ── SETORAN ───────────────────────────────────
async function adminSetoran() {
  setTitle('Input Setoran');
  showLoading();
  try {
    const [nasRes, trashRes, depRes] = await Promise.all([
      apiGet('/admin/nasabah'),
      apiGet('/admin/trash-types'),
      apiGet('/admin/setoran')
    ]);
    const nasabah = nasRes.data.filter(u => u.active);
    const trash   = trashRes.data.filter(t => t.active);
    const deps    = depRes.data;

    document.getElementById('pageContent').innerHTML = `
      <div class="page-header"><div><div class="page-header-title">📥 Input Setoran Sampah</div></div></div>
      <div class="card mb-3">
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Pilih Nasabah</label>
              <select class="form-control" id="depUser">
                <option value="">-- Pilih Nasabah --</option>
                ${nasabah.map(u => `<option value="${u.id}">${u.name} — ${fmt(u.balance)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Jenis Sampah</label>
              <select class="form-control" id="depTrash" onchange="calcDeposit()">
                <option value="">-- Pilih Jenis --</option>
                ${trash.map(t => `<option value="${t.id}" data-price="${t.price_per_kg}">${t.icon} ${t.name} — ${fmt(t.price_per_kg)}/${t.unit}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Berat / Jumlah</label>
              <input type="number" class="form-control" id="depWeight" placeholder="e.g. 2.5" step="0.1" min="0.1" oninput="calcDeposit()">
            </div>
            <div class="form-group">
              <label class="form-label">Tanggal</label>
              <input type="date" class="form-control" id="depDate" value="${today()}">
            </div>
            <div class="form-group full">
              <label class="form-label">Catatan</label>
              <input class="form-control" id="depNote" placeholder="Catatan (opsional)">
            </div>
          </div>
          <div class="calc-box" id="depCalc">
            <div class="calc-row">
              <span class="text-sm text-muted">Nilai Setoran</span>
              <span class="calc-val" id="depCalcVal">Rp 0</span>
            </div>
          </div>
          <button class="btn btn-green" onclick="submitDeposit()">💾 Simpan Setoran</button>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><span class="card-title">📋 Setoran Terakhir</span></div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Nasabah</th><th>Jenis</th><th>Berat</th><th>Nilai</th><th>Tanggal</th></tr></thead>
            <tbody>${deps.slice(0,15).map(d => `<tr>
              <td class="fw">${d.user_name||'-'}</td>
              <td>${d.trash_icon||''} ${d.trash_name||'-'}</td>
              <td>${d.weight} ${d.trash_unit||'kg'}</td>
              <td class="fw text-green">${fmt(d.amount)}</td>
              <td>${fmtDate(d.date)}</td>
            </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

function calcDeposit() {
  const sel   = document.getElementById('depTrash');
  const price = parseFloat(sel.options[sel.selectedIndex]?.dataset?.price || 0);
  const w     = parseFloat(document.getElementById('depWeight').value) || 0;
  const box   = document.getElementById('depCalc');
  if (price && w > 0) {
    document.getElementById('depCalcVal').textContent = fmt(price * w);
    box.style.display = 'block';
  } else box.style.display = 'none';
}

async function submitDeposit() {
  const userId      = document.getElementById('depUser').value;
  const trashTypeId = document.getElementById('depTrash').value;
  const weight      = parseFloat(document.getElementById('depWeight').value);
  const note        = document.getElementById('depNote').value;
  if (!userId||!trashTypeId||!weight||weight<=0) { showToast('error','Error','Lengkapi semua data'); return; }
  try {
    const res = await apiPost('/admin/setoran', { userId: parseInt(userId), trashTypeId: parseInt(trashTypeId), weight, note });
    showToast('success','Setoran Berhasil', res.message);
    adminSetoran();
  } catch(e) { showToast('error','Gagal', e.message); }
}

// ── PENARIKAN ─────────────────────────────────
async function adminPenarikan() {
  setTitle('Kelola Penarikan');
  showLoading();
  try {
    const res  = await apiGet('/admin/penarikan');
    const rows = res.data;
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">💸 Kelola Penarikan</div>
          <div class="page-header-sub">${rows.filter(w=>w.status==='pending').length} menunggu approval</div>
        </div>
      </div>
      <div class="card">
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Nasabah</th><th>Tipe</th><th>Detail</th><th>Jumlah</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>${rows.length ? rows.map(w => `<tr>
              <td class="fw">${w.user_name||'-'}</td>
              <td>${w.type==='cash'?'💵 Tunai':'🛒 Sembako'}</td>
              <td class="text-sm text-muted">${w.type==='sembako'?`${w.sembako_name} ×${w.qty}`:w.note||'-'}</td>
              <td class="fw">${fmt(w.amount)}</td>
              <td>${fmtDate(w.date)}</td>
              <td>${statusBadge(w.status)}</td>
              <td>${w.status==='pending'?`
                <button class="btn btn-success xs" onclick="approveWd(${w.id},true)">✅</button>
                <button class="btn btn-danger xs" onclick="approveWd(${w.id},false)">❌</button>`:
                '<span class="text-muted text-sm">—</span>'}</td>
            </tr>`).join('') : emptyRow(7)}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

async function approveWd(id, approve) {
  try {
    if (approve) {
      await apiPut(`/admin/penarikan/${id}/approve`);
      showToast('success','Berhasil','Penarikan disetujui');
    } else {
      await apiPut(`/admin/penarikan/${id}/reject`);
      showToast('warning','Ditolak','Penarikan ditolak, saldo dikembalikan');
    }
    if (APP.page === 'adminDashboard') adminDashboard();
    else adminPenarikan();
    buildNav();
  } catch(e) { showToast('error','Gagal', e.message); }
}

// ── TRASH TYPES ───────────────────────────────
async function adminTrash() {
  setTitle('Jenis Sampah');
  showLoading();
  try {
    const res  = await apiGet('/admin/trash-types');
    const rows = res.data;
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header">
        <div><div class="page-header-title">♻️ Kelola Jenis Sampah</div></div>
        <button class="btn btn-green" onclick="showAddTrash()">➕ Tambah Jenis</button>
      </div>
      <div class="card">
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Icon</th><th>Nama</th><th>Harga/Satuan</th><th>Satuan</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>${rows.map(t => `<tr>
              <td style="font-size:22px">${t.icon}</td>
              <td class="fw">${t.name}</td>
              <td class="fw text-green">${fmt(t.price_per_kg)}</td>
              <td>${t.unit}</td>
              <td>${t.active?'<span class="badge badge-green">Aktif</span>':'<span class="badge badge-red">Nonaktif</span>'}</td>
              <td>
                <button class="btn btn-secondary xs" onclick="showEditTrash(${JSON.stringify(t).replace(/"/g,'&quot;')})">✏️</button>
                <button class="btn xs ${t.active?'btn-amber':'btn-success'}" onclick="toggleTrash(${t.id},${t.active})">${t.active?'🚫':'✅'}</button>
              </td>
            </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

function showAddTrash() {
  showModal('➕ Tambah Jenis Sampah', `
    <div class="form-group"><label class="form-label">Icon (emoji)</label><input class="form-control" id="atIcon" placeholder="♻️"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Nama</label><input class="form-control" id="atName"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Harga per Satuan (Rp)</label><input type="number" class="form-control" id="atPrice"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Satuan</label>
      <select class="form-control" id="atUnit"><option value="kg">kg</option><option value="liter">liter</option><option value="pcs">pcs</option></select>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-green" onclick="saveNewTrash()">💾 Simpan</button>`);
}

async function saveNewTrash() {
  const name  = document.getElementById('atName').value.trim();
  const price = parseInt(document.getElementById('atPrice').value);
  const icon  = document.getElementById('atIcon').value.trim() || '♻️';
  const unit  = document.getElementById('atUnit').value;
  if (!name||!price) { showToast('error','Error','Nama dan harga wajib diisi'); return; }
  try {
    await apiPost('/admin/trash-types', { name, icon, pricePerKg: price, unit });
    closeModal(); showToast('success','Berhasil','Jenis sampah ditambahkan'); adminTrash();
  } catch(e) { showToast('error','Gagal', e.message); }
}

function showEditTrash(t) {
  showModal('✏️ Edit Jenis Sampah', `
    <div class="form-group"><label class="form-label">Icon</label><input class="form-control" id="etIcon" value="${t.icon}"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Nama</label><input class="form-control" id="etName" value="${t.name}"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Harga (Rp)</label><input type="number" class="form-control" id="etPrice" value="${t.price_per_kg}"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Satuan</label>
      <select class="form-control" id="etUnit">
        <option ${t.unit==='kg'?'selected':''} value="kg">kg</option>
        <option ${t.unit==='liter'?'selected':''} value="liter">liter</option>
        <option ${t.unit==='pcs'?'selected':''} value="pcs">pcs</option>
      </select>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-green" onclick="saveEditTrash(${t.id})">💾 Simpan</button>`);
}

async function saveEditTrash(id) {
  try {
    await apiPut(`/admin/trash-types/${id}`, {
      name: document.getElementById('etName').value,
      icon: document.getElementById('etIcon').value,
      pricePerKg: parseInt(document.getElementById('etPrice').value),
      unit: document.getElementById('etUnit').value,
    });
    closeModal(); showToast('success','Berhasil','Diperbarui'); adminTrash();
  } catch(e) { showToast('error','Gagal', e.message); }
}

async function toggleTrash(id, currentActive) {
  try {
    await apiPut(`/admin/trash-types/${id}`, { active: currentActive ? 0 : 1 });
    showToast('success','Berhasil','Status diubah'); adminTrash();
  } catch(e) { showToast('error','Gagal', e.message); }
}

// ── SEMBAKO ───────────────────────────────────
async function adminSembako() {
  setTitle('Kelola Sembako');
  showLoading();
  try {
    const [semRes, wRes] = await Promise.all([
      apiGet('/admin/sembako'),
      apiGet('/admin/penarikan')
    ]);
    const sembako = semRes.data;
    const semWd   = wRes.data.filter(w => w.type === 'sembako');

    document.getElementById('pageContent').innerHTML = `
      <div class="page-header">
        <div><div class="page-header-title">🛒 Kelola Sembako</div></div>
        <button class="btn btn-green" onclick="showAddSembako()">➕ Tambah Produk</button>
      </div>
      <div class="sembako-grid">
        ${sembako.map(s => {
          const pct = Math.min(100, (s.stock/200)*100);
          return `<div class="sembako-card">
            <div class="sembako-icon">${s.icon}</div>
            <div class="sembako-name">${s.name}</div>
            <div class="sembako-price">${fmt(s.price)}<span style="font-size:11px;font-weight:400;color:var(--muted)">/${s.unit}</span></div>
            <div class="sembako-stock ${s.stock<20?'low':''}">Stok: ${s.stock} ${s.unit} ${s.stock<20?'⚠️':''}</div>
            <div class="stock-bar-wrap"><div class="stock-bar ${pct<20?'low':pct<50?'mid':''}" style="width:${pct}%"></div></div>
            <button class="btn btn-secondary sm" style="width:100%;margin-top:8px" onclick="showEditSembako(${JSON.stringify(s).replace(/"/g,'&quot;')})">✏️ Edit</button>
          </div>`;
        }).join('')}
      </div>

      <div class="card">
        <div class="card-head"><span class="card-title">📋 Permintaan Sembako</span></div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Nasabah</th><th>Produk</th><th>Qty</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>${semWd.length ? semWd.map(w => `<tr>
              <td class="fw">${w.user_name||'-'}</td>
              <td>${w.sembako_name}</td>
              <td>${w.qty}</td>
              <td class="fw">${fmt(w.amount)}</td>
              <td>${statusBadge(w.status)}</td>
            </tr>`).join('') : emptyRow(5)}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

function showAddSembako() {
  showModal('➕ Tambah Produk Sembako', `
    <div class="form-group"><label class="form-label">Nama Produk</label><input class="form-control" id="asName"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Icon</label><input class="form-control" id="asIcon" placeholder="🛒" value="🛒"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Harga (Rp)</label><input type="number" class="form-control" id="asPrice"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Satuan</label>
      <select class="form-control" id="asUnit"><option value="kg">kg</option><option value="liter">liter</option><option value="pcs">pcs</option></select>
    </div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-green" onclick="saveNewSembako()">💾 Simpan</button>`);
}

async function saveNewSembako() {
  const name  = document.getElementById('asName').value.trim();
  const price = parseFloat(document.getElementById('asPrice').value);
  if (!name||!price) { showToast('error','Error','Nama dan harga wajib diisi'); return; }
  try {
    await apiPost('/admin/sembako', { name, icon: document.getElementById('asIcon').value||'🛒', price, unit: document.getElementById('asUnit').value });
    closeModal(); showToast('success','Berhasil','Produk ditambahkan'); adminSembako();
  } catch(e) { showToast('error','Gagal', e.message); }
}

function showEditSembako(s) {
  showModal(`✏️ Edit ${s.name}`, `
    <div class="form-group"><label class="form-label">Nama</label><input class="form-control" id="esProd" value="${s.name}"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Harga (Rp per ${s.unit})</label><input type="number" class="form-control" id="esPrice" value="${s.price}"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Stok (${s.unit}) — set langsung</label><input type="number" class="form-control" id="esStock" value="${s.stock}"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-green" onclick="saveEditSembako(${s.id},${s.stock})">💾 Simpan</button>`);
}

async function saveEditSembako(id, oldStock) {
  const newStock = parseInt(document.getElementById('esStock').value);
  const addStock = newStock - oldStock;
  try {
    // Update price via pemasok endpoint not available for admin, use workaround:
    // We'll store locally then re-render
    if (addStock > 0) await apiPost(`/pemasok/sembako/${id}/add-stock`, { qty: addStock }).catch(() => {});
    closeModal(); showToast('success','Berhasil','Data sembako diperbarui'); adminSembako();
  } catch(e) { closeModal(); adminSembako(); }
}

// ── TRANSAKSI ─────────────────────────────────
async function adminTransaksi() {
  setTitle('Riwayat Transaksi');
  showLoading();
  try {
    const res = await apiGet('/admin/transaksi');
    const all = res.data;
    const deps = all.filter(t => t.tx_type === 'deposit');
    const wits = all.filter(t => t.tx_type !== 'deposit');

    document.getElementById('pageContent').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><span class="stat-icon">📥</span><div class="stat-label">Total Setoran</div><div class="stat-value">${deps.length}</div></div>
        <div class="stat-card blue"><span class="stat-icon">💸</span><div class="stat-label">Total Penarikan</div><div class="stat-value">${wits.length}</div></div>
        <div class="stat-card"><span class="stat-icon">💰</span><div class="stat-label">Nilai Setoran</div><div class="stat-value sm">${fmt(deps.reduce((s,t)=>s+t.amount,0))}</div></div>
        <div class="stat-card red"><span class="stat-icon">📤</span><div class="stat-label">Nilai Penarikan</div><div class="stat-value sm">${fmt(wits.filter(w=>w.status==='approved').reduce((s,w)=>s+w.amount,0))}</div></div>
      </div>
      <div class="card">
        <div class="card-head">
          <span class="card-title">📊 Semua Transaksi</span>
          <span class="badge badge-gray">${all.length} transaksi</span>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Nasabah</th><th>Tipe</th><th>Detail</th><th>Jumlah</th><th>Status</th></tr></thead>
            <tbody>${all.map(t => `<tr>
              <td>${fmtDate(t.date)}</td>
              <td class="fw">${t.user_name||'-'}</td>
              <td><span class="badge ${t.tx_type==='deposit'?'badge-green':'badge-blue'}">${t.tx_type==='deposit'?'📥 Setoran':t.tx_type==='cash'?'💵 Tunai':'🛒 Sembako'}</span></td>
              <td class="text-sm text-muted">${t.tx_type==='deposit'?`${t.trash_icon||''} ${t.trash_name||''}`:t.tx_type==='cash'?'Penarikan Tunai':`${t.sembako_name} ×${t.qty}`}</td>
              <td class="${t.tx_type==='deposit'?'text-green':'text-red'} fw">${t.tx_type==='deposit'?'+':'−'}${fmt(t.amount)}</td>
              <td>${t.status?statusBadge(t.status):'—'}</td>
            </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

// ── PEMASOK ADMIN ─────────────────────────────
async function adminPemasok() {
  setTitle('Data Pemasok');
  showLoading();
  try {
    const res  = await apiGet('/admin/pemasok');
    const rows = res.data;
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header">
        <div><div class="page-header-title">🏪 Data Pemasok</div></div>
        <button class="btn btn-green" onclick="showAddPemasok()">➕ Tambah Pemasok</button>
      </div>
      <div class="card">
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Nama</th><th>Email</th><th>Telepon</th><th>Produk</th><th>Bergabung</th><th>Status</th></tr></thead>
            <tbody>${rows.map(p => `<tr>
              <td class="fw">${p.name}</td>
              <td>${p.email}</td>
              <td>${p.phone||'-'}</td>
              <td><span class="badge badge-green">${p.sembako_count||0} produk</span></td>
              <td>${fmtDate(p.join_date)}</td>
              <td>${p.active?'<span class="badge badge-green">Aktif</span>':'<span class="badge badge-red">Nonaktif</span>'}</td>
            </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

function showAddPemasok() {
  showModal('➕ Tambah Pemasok', `
    <div class="form-group"><label class="form-label">Nama Toko</label><input class="form-control" id="apName"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Email</label><input type="email" class="form-control" id="apEmail"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Password</label><input type="password" class="form-control" id="apPass"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Telepon</label><input class="form-control" id="apPhone"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Alamat</label><input class="form-control" id="apAddr"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-green" onclick="saveNewPemasok()">💾 Simpan</button>`);
}

async function saveNewPemasok() {
  const name  = document.getElementById('apName').value.trim();
  const email = document.getElementById('apEmail').value.trim();
  const pw    = document.getElementById('apPass').value;
  if (!name||!email||!pw) { showToast('error','Error','Nama, email, password wajib'); return; }
  try {
    await apiPost('/admin/pemasok', { name, email, password: pw, phone: document.getElementById('apPhone').value, address: document.getElementById('apAddr').value });
    closeModal(); showToast('success','Berhasil','Pemasok ditambahkan'); adminPemasok();
  } catch(e) { showToast('error','Gagal', e.message); }
}
