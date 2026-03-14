// ──────────────────────────────────────────────
//  Pemasok Pages - EcoBank Sampah
// ──────────────────────────────────────────────

async function pemasokDashboard() {
  setTitle('Dashboard Pemasok');
  showLoading();
  try {
    const res = await apiGet('/pemasok/dashboard');
    const { stats, products, recentRequests } = res.data;

    document.getElementById('pageContent').innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">🛒</span>
          <div class="stat-label">Produk Sembako</div>
          <div class="stat-value">${stats.productCount}</div>
        </div>
        <div class="stat-card ${stats.pendingRequests>0?'amber':''}">
          <span class="stat-icon">⏳</span>
          <div class="stat-label">Permintaan Pending</div>
          <div class="stat-value">${stats.pendingRequests}</div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">✅</span>
          <div class="stat-label">Sudah Diproses</div>
          <div class="stat-value">${stats.approvedRequests}</div>
        </div>
        <div class="stat-card blue">
          <span class="stat-icon">💰</span>
          <div class="stat-label">Total Nilai</div>
          <div class="stat-value sm">${fmt(stats.totalRevenue)}</div>
        </div>
      </div>

      <div class="page-header">
        <div><div class="page-header-title">Stok Produk Saya</div></div>
        <button class="btn btn-green sm" onclick="navigate('pemasokSembako')">Kelola Semua</button>
      </div>

      <div class="sembako-grid">
        ${products.map(s => {
          const pct = Math.min(100, (s.stock/200)*100);
          return `<div class="sembako-card">
            <div class="sembako-icon">${s.icon}</div>
            <div class="sembako-name">${s.name}</div>
            <div class="sembako-price">${fmt(s.price)}/${s.unit}</div>
            <div class="sembako-stock ${s.stock<20?'low':''}">Stok: ${s.stock} ${s.unit} ${s.stock<20?'⚠️':''}</div>
            <div class="stock-bar-wrap"><div class="stock-bar ${pct<20?'low':pct<50?'mid':''}" style="width:${pct}%"></div></div>
          </div>`;
        }).join('')}
      </div>

      ${recentRequests.length ? `
      <div class="card">
        <div class="card-head">
          <span class="card-title">⏳ Permintaan Perlu Diproses</span>
          <button class="btn btn-green sm" onclick="navigate('pemasokPermintaan')">Lihat Semua</button>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Nasabah</th><th>Produk</th><th>Qty</th><th>Total</th><th>Tanggal</th></tr></thead>
            <tbody>${recentRequests.map(w => `<tr>
              <td class="fw">${w.user_name||'-'}</td>
              <td>${w.sembako_name}</td>
              <td>${w.qty}</td>
              <td class="fw">${fmt(w.amount)}</td>
              <td>${fmtDate(w.date)}</td>
            </tr>`).join('')}</tbody>
          </table>
        </div>
      </div>` : ''}`;
  } catch(e) { showToast('error','Error', e.message); }
}

async function pemasokSembako() {
  setTitle('Kelola Sembako');
  showLoading();
  try {
    const res  = await apiGet('/pemasok/sembako');
    const rows = res.data;
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header"><div><div class="page-header-title">🛒 Produk Sembako Saya</div></div></div>
      <div class="card">
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Produk</th><th>Harga</th><th>Stok</th><th>Bar</th><th>Aksi</th></tr></thead>
            <tbody>${rows.map(s => {
              const pct = Math.min(100,(s.stock/200)*100);
              return `<tr>
                <td><span style="font-size:20px">${s.icon}</span> <span class="fw">${s.name}</span></td>
                <td class="fw text-green">${fmt(s.price)}</td>
                <td class="${s.stock<20?'text-red fw':''}">${s.stock} ${s.unit}</td>
                <td style="min-width:100px">
                  <div class="stock-bar-wrap"><div class="stock-bar ${pct<20?'low':pct<50?'mid':''}" style="width:${pct}%"></div></div>
                </td>
                <td>
                  <button class="btn btn-secondary xs" onclick="showEditSembakoP(${JSON.stringify(s).replace(/"/g,'&quot;')})">✏️ Edit</button>
                  <button class="btn btn-green xs" onclick="showAddStok(${s.id},'${s.name}',${s.stock},'${s.unit}')">📦 Tambah Stok</button>
                </td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

function showEditSembakoP(s) {
  showModal(`✏️ Edit ${s.name}`, `
    <div class="form-group"><label class="form-label">Nama Produk</label><input class="form-control" id="espName" value="${s.name}"></div>
    <div class="form-group" style="margin-top:12px"><label class="form-label">Harga (Rp per ${s.unit})</label><input type="number" class="form-control" id="espPrice" value="${s.price}"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-green" onclick="savePemSembako(${s.id})">💾 Simpan</button>`);
}

async function savePemSembako(id) {
  try {
    await apiPut(`/pemasok/sembako/${id}`, {
      name:  document.getElementById('espName').value,
      price: parseInt(document.getElementById('espPrice').value),
    });
    closeModal(); showToast('success','Berhasil','Produk diperbarui'); pemasokSembako();
  } catch(e) { showToast('error','Gagal', e.message); }
}

function showAddStok(id, name, stock, unit) {
  showModal(`📦 Tambah Stok ${name}`, `
    <p class="text-sm text-muted" style="margin-bottom:16px">Stok saat ini: <strong>${stock} ${unit}</strong></p>
    <div class="form-group"><label class="form-label">Jumlah yang Ditambahkan</label><input type="number" class="form-control" id="addStokVal" min="1" placeholder="Masukkan jumlah"></div>`,
    `<button class="btn btn-secondary" onclick="closeModal()">Batal</button>
     <button class="btn btn-green" onclick="saveAddStok(${id})">📦 Tambah Stok</button>`);
}

async function saveAddStok(id) {
  const qty = parseInt(document.getElementById('addStokVal').value);
  if (!qty || qty < 1) { showToast('error','Error','Masukkan jumlah yang valid'); return; }
  try {
    const res = await apiPost(`/pemasok/sembako/${id}/add-stock`, { qty });
    closeModal(); showToast('success','Berhasil', res.message); pemasokSembako();
  } catch(e) { showToast('error','Gagal', e.message); }
}

async function pemasokStok() {
  setTitle('Update Stok & Harga');
  showLoading();
  try {
    const res  = await apiGet('/pemasok/sembako');
    const rows = res.data;
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header"><div><div class="page-header-title">📦 Update Massal Stok & Harga</div></div></div>
      <div class="sembako-grid">
        ${rows.map(s => `
          <div class="sembako-card">
            <div class="sembako-icon">${s.icon}</div>
            <div class="sembako-name">${s.name}</div>
            <div class="sembako-stock ${s.stock<20?'low':''}">Stok: ${s.stock} ${s.unit}</div>
            <div class="form-group" style="margin-top:12px">
              <label class="form-label">Harga Baru (Rp)</label>
              <input type="number" class="form-control" id="ph_${s.id}" value="${s.price}">
            </div>
            <div class="form-group" style="margin-top:8px">
              <label class="form-label">+ Tambah Stok</label>
              <input type="number" class="form-control" id="ps_${s.id}" placeholder="0">
            </div>
            <button class="btn btn-green sm" style="width:100%;margin-top:10px" onclick="updateStokItem(${s.id})">💾 Update</button>
          </div>`).join('')}
      </div>`;
  } catch(e) { showToast('error','Error', e.message); }
}

async function updateStokItem(id) {
  const price    = parseInt(document.getElementById(`ph_${id}`).value);
  const addStock = parseInt(document.getElementById(`ps_${id}`).value) || 0;
  try {
    const res = await apiPut(`/pemasok/sembako/${id}/price-stock`, { price, addStock });
    showToast('success','Berhasil', res.message);
    pemasokStok();
  } catch(e) { showToast('error','Gagal', e.message); }
}

async function pemasokPermintaan() {
  setTitle('Permintaan Sembako');
  showLoading();
  try {
    const res  = await apiGet('/pemasok/permintaan');
    const rows = res.data;
    document.getElementById('pageContent').innerHTML = `
      <div class="page-header">
        <div>
          <div class="page-header-title">📋 Permintaan Sembako</div>
          <div class="page-header-sub">${rows.filter(w=>w.status==='pending').length} menunggu diproses</div>
        </div>
      </div>
      <div class="card">
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Nasabah</th><th>Produk</th><th>Qty</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>${rows.length ? rows.map(w => `<tr>
              <td>${fmtDate(w.date)}</td>
              <td class="fw">${w.user_name||'-'}</td>
              <td>${w.sembako_name}</td>
              <td>${w.qty}</td>
              <td class="fw">${fmt(w.amount)}</td>
              <td>${statusBadge(w.status)}</td>
              <td>${w.status==='pending'?`
                <button class="btn btn-success xs" onclick="approvePemReq(${w.id},true)">✅ Proses</button>
                <button class="btn btn-danger xs" onclick="approvePemReq(${w.id},false)">❌</button>`:
                '<span class="text-muted text-sm">—</span>'}</td>
            </tr>`).join('') : emptyRow(7)}
            </tbody>
          </table>
        </div>
      </div>`;
    buildNav();
  } catch(e) { showToast('error','Error', e.message); }
}

async function approvePemReq(id, approve) {
  try {
    if (approve) {
      await apiPut(`/pemasok/permintaan/${id}/approve`);
      showToast('success','Berhasil','Permintaan diproses');
    } else {
      await apiPut(`/pemasok/permintaan/${id}/reject`);
      showToast('warning','Ditolak','Permintaan ditolak, saldo dikembalikan');
    }
    pemasokPermintaan();
    buildNav();
  } catch(e) { showToast('error','Gagal', e.message); }
}
