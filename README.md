# 🌿 EcoBank Sampah — Full Stack App
**Frontend:** HTML + CSS + JS (Vanilla)  
**Backend:** Python Flask + SQLite

---

## 📁 Struktur Folder

```
bank-sampah/
├── backend/
│   ├── app.py              ← Flask API utama
│   ├── requirements.txt    ← Dependensi Python
│   └── bank_sampah.db      ← SQLite (auto-dibuat saat pertama run)
│
└── frontend/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── api.js           ← Fungsi fetch ke backend
        ├── ui.js            ← Toast, modal, utilitas
        ├── pages-user.js    ← Halaman nasabah
        ├── pages-admin.js   ← Halaman admin
        ├── pages-pemasok.js ← Halaman pemasok
        └── app.js           ← Login, routing, init
```

---

## 🚀 Cara Menjalankan

### 1. Jalankan Backend (Flask)

Buka terminal / Command Prompt, lalu:

```bash
cd bank-sampah/backend

# Install dependensi (cukup sekali)
pip install -r requirements.txt

# Jalankan server
python app.py
```

Server berjalan di: **http://localhost:5000**

### 2. Buka Frontend

Buka file `frontend/index.html` langsung di browser Chrome.

> ⚠️ Pastikan backend sudah berjalan **sebelum** membuka frontend.

---

## 🔑 Akun Demo

| Role    | Email              | Password  |
|---------|--------------------|-----------|
| Nasabah | budi@mail.com      | 123456    |
| Admin   | admin@eco.com      | admin123  |
| Pemasok | pemasok@mail.com   | 123456    |

---

## 📡 API Endpoints

| Method | URL                                    | Keterangan                |
|--------|----------------------------------------|---------------------------|
| POST   | /api/auth/login                        | Login (semua role)        |
| POST   | /api/auth/register                     | Daftar nasabah baru       |
| GET    | /api/public/trash-prices               | Harga sampah (publik)     |
| GET    | /api/public/sembako                    | Daftar sembako (publik)   |
| GET    | /api/users/me/dashboard                | Dashboard nasabah         |
| POST   | /api/users/me/withdrawals              | Ajukan penarikan          |
| GET    | /api/admin/nasabah                     | Daftar nasabah            |
| POST   | /api/admin/setoran                     | Input setoran sampah      |
| PUT    | /api/admin/penarikan/:id/approve       | Setujui penarikan         |
| PUT    | /api/admin/penarikan/:id/reject        | Tolak penarikan           |
| GET    | /api/pemasok/dashboard                 | Dashboard pemasok         |
| POST   | /api/pemasok/sembako/:id/add-stock     | Tambah stok               |

---

## 🛠️ Teknologi

- **Backend:** Python 3.10+, Flask 3, Flask-CORS, bcrypt, PyJWT, SQLite3
- **Frontend:** HTML5, CSS3, Vanilla JS (ES2020+), Chart.js
- **Auth:** JWT Bearer Token (disimpan di localStorage)
- **Database:** SQLite (file `bank_sampah.db`, auto-created)
