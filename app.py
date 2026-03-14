"""
EcoBank Sampah - Backend API
Python Flask + SQLite
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3, bcrypt, jwt, os
from datetime import datetime, timedelta
from functools import wraps

app = Flask(__name__)
CORS(app)

SECRET_KEY = os.environ.get('SECRET_KEY', 'ecobank_secret_2024')
DB_PATH    = 'bank_sampah.db'
TOKEN_EXP  = 7  # hari

# ─── DATABASE ─────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, phone TEXT, address TEXT,
        role TEXT DEFAULT 'user', balance REAL DEFAULT 0,
        join_date TEXT DEFAULT (date('now')), active INTEGER DEFAULT 1);

    CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, role TEXT DEFAULT 'admin',
        join_date TEXT DEFAULT (date('now')), active INTEGER DEFAULT 1);

    CREATE TABLE IF NOT EXISTS pemasok (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, phone TEXT, address TEXT,
        role TEXT DEFAULT 'pemasok',
        join_date TEXT DEFAULT (date('now')), active INTEGER DEFAULT 1);

    CREATE TABLE IF NOT EXISTS trash_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, icon TEXT DEFAULT "♻️",
        price_per_kg REAL NOT NULL, unit TEXT DEFAULT 'kg', active INTEGER DEFAULT 1);

    CREATE TABLE IF NOT EXISTS sembako (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, icon TEXT DEFAULT "🛒",
        price REAL NOT NULL, unit TEXT DEFAULT 'kg',
        stock INTEGER DEFAULT 0, pemasok_id INTEGER);

    CREATE TABLE IF NOT EXISTS deposits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL, trash_type_id INTEGER NOT NULL,
        weight REAL NOT NULL, amount REAL NOT NULL,
        date TEXT DEFAULT (date('now')), note TEXT);

    CREATE TABLE IF NOT EXISTS withdrawals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL, type TEXT NOT NULL,
        amount REAL NOT NULL, status TEXT DEFAULT 'pending',
        date TEXT DEFAULT (date('now')), note TEXT,
        sembako_id INTEGER, sembako_name TEXT, qty INTEGER,
        approved_date TEXT, rejected_date TEXT, reject_reason TEXT);
    ''')
    conn.commit()
    seed_db(conn)
    conn.close()

def seed_db(conn):
    c = conn.cursor()
    if c.execute("SELECT COUNT(*) FROM users").fetchone()[0] > 0:
        return

    # Users
    for name, email, pw, phone, addr, bal in [
        ('Budi Santoso',  'budi@mail.com', '123456', '081234567890', 'Jl. Merdeka No.10', 56500),
        ('Siti Rahayu',   'siti@mail.com', '123456', '082345678901', 'Jl. Pahlawan No.5', 30000),
        ('Agus Setiawan', 'agus@mail.com', '123456', '083456789012', 'Jl. Sudirman No.20', 20000)]:
        h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
        c.execute("INSERT INTO users (name,email,password,phone,address,balance) VALUES (?,?,?,?,?,?)",
                  (name, email, h, phone, addr, bal))

    # Admin
    h = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode()
    c.execute("INSERT INTO admins (name,email,password) VALUES (?,?,?)",
              ('Admin EcoBank', 'admin@eco.com', h))

    # Pemasok
    h = bcrypt.hashpw(b'123456', bcrypt.gensalt()).decode()
    c.execute("INSERT INTO pemasok (name,email,password,phone,address) VALUES (?,?,?,?,?)",
              ('Toko Makmur', 'pemasok@mail.com', h, '084567890123', 'Jl. Pasar No.1'))

    # Trash types
    for name, icon, price, unit in [
        ('Plastik',       '🧴', 3000,  'kg'),
        ('Kardus',        '📦', 1500,  'kg'),
        ('Kertas HVS',    '📄', 2000,  'kg'),
        ('Kaleng',        '🥫', 8000,  'kg'),
        ('Besi/Logam',    '🔩', 4000,  'kg'),
        ('Kaca/Botol',    '🍶', 500,   'kg'),
        ('Minyak Jelantah','🛢', 4500, 'liter'),
        ('Elektronik',    '📱', 10000, 'kg')]:
        c.execute("INSERT INTO trash_types (name,icon,price_per_kg,unit) VALUES (?,?,?,?)",
                  (name, icon, price, unit))

    # Sembako
    for name, icon, price, unit, stock in [
        ('Beras Premium', '🌾', 15000, 'kg',    250),
        ('Gula Pasir',    '🍚', 18000, 'kg',    100),
        ('Minyak Goreng', '🫙', 20000, 'liter',  80),
        ('Telur Ayam',    '🥚', 30000, 'kg',     60)]:
        c.execute("INSERT INTO sembako (name,icon,price,unit,stock,pemasok_id) VALUES (?,?,?,?,?,1)",
                  (name, icon, price, unit, stock))

    # Deposits
    for uid, tid, w, amt, dt, note in [
        (1,1,3.5,10500,'2024-06-01','Botol plastik'),
        (1,2,5.0,7500,'2024-06-05','Kardus'),
        (2,4,2.0,16000,'2024-06-08','Kaleng'),
        (3,5,10.0,40000,'2024-06-10','Besi tua'),
        (1,7,5.0,22500,'2024-06-12','Jelantah'),
        (2,3,3.0,6000,'2024-06-14','Kertas')]:
        c.execute("INSERT INTO deposits (user_id,trash_type_id,weight,amount,date,note) VALUES (?,?,?,?,?,?)",
                  (uid, tid, w, amt, dt, note))

    # Withdrawals
    c.execute("INSERT INTO withdrawals (user_id,type,amount,status,date,note,approved_date) VALUES (1,'cash',50000,'approved','2024-06-03','Tunai','2024-06-04')")
    c.execute("INSERT INTO withdrawals (user_id,type,amount,status,date,note,sembako_id,sembako_name,qty) VALUES (2,'sembako',30000,'pending','2024-06-09','Sembako',2,'Gula Pasir',1)")
    c.execute("INSERT INTO withdrawals (user_id,type,amount,status,date,note,sembako_id,sembako_name,qty,approved_date) VALUES (3,'sembako',60000,'approved','2024-06-11','Minyak',3,'Minyak Goreng',3,'2024-06-12')")

    conn.commit()
    print("Database berhasil di-seed!")

# ─── HELPERS ──────────────────────────────────────────────
def rdict(row):  return dict(row) if row else None
def rlist(rows): return [dict(r) for r in rows]

def ok(data=None, msg='OK', code=200):
    r = {'success': True, 'message': msg}
    if data is not None: r['data'] = data
    return jsonify(r), code

def err(msg, code=400):
    return jsonify({'success': False, 'message': msg}), code

def make_token(uid, role, email):
    return jwt.encode(
        {'id': uid, 'role': role, 'email': email,
         'exp': datetime.utcnow() + timedelta(days=TOKEN_EXP)},
        SECRET_KEY, algorithm='HS256')

# ─── MIDDLEWARE ───────────────────────────────────────────
def auth_required(f):
    @wraps(f)
    def wrap(*args, **kwargs):
        h = request.headers.get('Authorization', '')
        if not h.startswith('Bearer '):
            return err('Token tidak ditemukan.', 401)
        try:
            request.user = jwt.decode(h.split(' ')[1], SECRET_KEY, algorithms=['HS256'])
        except jwt.ExpiredSignatureError:
            return err('Token kadaluarsa.', 401)
        except Exception:
            return err('Token tidak valid.', 401)
        return f(*args, **kwargs)
    return wrap

def admin_only(f):
    @wraps(f)
    @auth_required
    def wrap(*args, **kwargs):
        if request.user.get('role') != 'admin':
            return err('Hanya admin.', 403)
        return f(*args, **kwargs)
    return wrap

def pemasok_only(f):
    @wraps(f)
    @auth_required
    def wrap(*args, **kwargs):
        if request.user.get('role') != 'pemasok':
            return err('Hanya pemasok.', 403)
        return f(*args, **kwargs)
    return wrap

# ══════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════
@app.route('/api/auth/login', methods=['POST'])
def login():
    d = request.get_json() or {}
    email = d.get('email', '').strip()
    pw    = d.get('password', '')
    role  = d.get('role', 'user')
    if not email or not pw:
        return err('Email dan password wajib diisi.')
    tables = {'user': 'users', 'admin': 'admins', 'pemasok': 'pemasok'}
    table = tables.get(role)
    if not table:
        return err('Role tidak valid.')
    conn = get_db()
    u = rdict(conn.execute(f"SELECT * FROM {table} WHERE email=?", (email,)).fetchone())
    conn.close()
    if not u or not u.get('active'):
        return err('Email/password salah.', 401)
    if not bcrypt.checkpw(pw.encode(), u['password'].encode()):
        return err('Email atau password salah.', 401)
    token = make_token(u['id'], u['role'], u['email'])
    u.pop('password', None)
    return ok({'token': token, 'user': u})

@app.route('/api/auth/register', methods=['POST'])
def register():
    d    = request.get_json() or {}
    name = d.get('name', '').strip()
    email = d.get('email', '').strip()
    pw   = d.get('password', '')
    phone = d.get('phone', '')
    addr  = d.get('address', '')
    if not name or not email or not pw or not phone:
        return err('Nama, email, password, telepon wajib diisi.')
    if len(pw) < 6:
        return err('Password minimal 6 karakter.')
    conn = get_db()
    if conn.execute("SELECT id FROM users WHERE email=?", (email,)).fetchone():
        conn.close(); return err('Email sudah terdaftar.', 409)
    h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    c = conn.cursor()
    c.execute("INSERT INTO users (name,email,password,phone,address) VALUES (?,?,?,?,?)",
              (name, email, h, phone, addr))
    conn.commit()
    conn.close()
    return ok({'userId': c.lastrowid}, 'Akun berhasil dibuat.', 201)

# ══════════════════════════════════════════════════════════
#  PUBLIC
# ══════════════════════════════════════════════════════════
@app.route('/api/public/trash-prices')
def public_trash():
    conn = get_db()
    rows = rlist(conn.execute("SELECT * FROM trash_types WHERE active=1").fetchall())
    conn.close(); return ok(rows)

@app.route('/api/public/sembako')
def public_sembako():
    conn = get_db()
    rows = rlist(conn.execute("SELECT * FROM sembako WHERE stock>0").fetchall())
    conn.close(); return ok(rows)

# ══════════════════════════════════════════════════════════
#  USER
# ══════════════════════════════════════════════════════════
@app.route('/api/users/me')
@auth_required
def user_me():
    conn = get_db()
    u = rdict(conn.execute(
        "SELECT id,name,email,phone,address,balance,join_date,active FROM users WHERE id=?",
        (request.user['id'],)).fetchone())
    conn.close()
    return ok(u) if u else err('Tidak ditemukan.', 404)

@app.route('/api/users/me', methods=['PUT'])
@auth_required
def update_me():
    d = request.get_json() or {}
    uid = request.user['id']
    conn = get_db()
    conn.execute(
        "UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), address=COALESCE(?,address) WHERE id=?",
        (d.get('name'), d.get('phone'), d.get('address'), uid))
    conn.commit()
    u = rdict(conn.execute(
        "SELECT id,name,email,phone,address,balance,join_date FROM users WHERE id=?", (uid,)).fetchone())
    conn.close(); return ok(u, 'Profil diperbarui.')

@app.route('/api/users/me/dashboard')
@auth_required
def user_dashboard():
    uid = request.user['id']
    conn = get_db()
    u = rdict(conn.execute(
        "SELECT id,name,email,phone,address,balance,join_date FROM users WHERE id=?", (uid,)).fetchone())
    deps = rlist(conn.execute(
        "SELECT d.*,t.name as trash_name,t.icon as trash_icon,t.unit as trash_unit "
        "FROM deposits d JOIN trash_types t ON d.trash_type_id=t.id "
        "WHERE d.user_id=? ORDER BY d.date DESC LIMIT 5", (uid,)).fetchall())
    s = conn.execute(
        "SELECT COALESCE(SUM(amount),0) td, COALESCE(SUM(weight),0) tw FROM deposits WHERE user_id=?", (uid,)).fetchone()
    tw = conn.execute("SELECT COALESCE(SUM(amount),0) v FROM withdrawals WHERE user_id=? AND status='approved'", (uid,)).fetchone()['v']
    pc = conn.execute("SELECT COUNT(*) v FROM withdrawals WHERE user_id=? AND status='pending'", (uid,)).fetchone()['v']
    conn.close()
    return ok({'user': u, 'recentDeposits': deps,
               'stats': {'balance': u['balance'], 'totalDeposit': s['td'],
                         'totalWeight': s['tw'], 'totalWithdraw': tw, 'pendingWithdrawals': pc}})

@app.route('/api/users/me/deposits')
@auth_required
def user_deposits():
    uid = request.user['id']
    conn = get_db()
    rows = rlist(conn.execute(
        "SELECT d.*,t.name as trash_name,t.icon as trash_icon,t.unit as trash_unit,t.price_per_kg "
        "FROM deposits d JOIN trash_types t ON d.trash_type_id=t.id "
        "WHERE d.user_id=? ORDER BY d.date DESC", (uid,)).fetchall())
    conn.close(); return ok(rows)

@app.route('/api/users/me/withdrawals')
@auth_required
def user_withdrawals():
    uid = request.user['id']
    conn = get_db()
    rows = rlist(conn.execute(
        "SELECT * FROM withdrawals WHERE user_id=? ORDER BY date DESC", (uid,)).fetchall())
    conn.close(); return ok(rows)

@app.route('/api/users/me/withdrawals', methods=['POST'])
@auth_required
def create_withdrawal():
    uid = request.user['id']
    d   = request.get_json() or {}
    wtype = d.get('type')
    conn = get_db()
    u = rdict(conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone())

    if wtype == 'cash':
        amount = float(d.get('amount', 0))
        note   = d.get('note', '')
        if amount < 10000: conn.close(); return err('Minimal Rp 10.000.')
        if amount > u['balance']: conn.close(); return err('Saldo tidak mencukupi.')
        conn.execute("UPDATE users SET balance=balance-? WHERE id=?", (amount, uid))
        c = conn.cursor()
        c.execute("INSERT INTO withdrawals (user_id,type,amount,note) VALUES (?,?,?,?)",
                  (uid, 'cash', amount, note))
        wid = c.lastrowid

    elif wtype == 'sembako':
        sid = d.get('sembakoId')
        qty = int(d.get('qty', 0))
        if not sid or qty < 1: conn.close(); return err('sembakoId dan qty wajib diisi.')
        sem = rdict(conn.execute("SELECT * FROM sembako WHERE id=?", (sid,)).fetchone())
        if not sem: conn.close(); return err('Produk tidak ditemukan.', 404)
        if sem['stock'] < qty: conn.close(); return err(f"Stok {sem['name']} tidak cukup.")
        total = sem['price'] * qty
        if total > u['balance']: conn.close(); return err('Saldo tidak mencukupi.')
        conn.execute("UPDATE users SET balance=balance-? WHERE id=?", (total, uid))
        c = conn.cursor()
        c.execute("INSERT INTO withdrawals (user_id,type,amount,sembako_id,sembako_name,qty,note) VALUES (?,?,?,?,?,?,?)",
                  (uid, 'sembako', total, sid, sem['name'], qty, d.get('note', '')))
        wid = c.lastrowid
    else:
        conn.close(); return err('Tipe tidak valid.')

    conn.commit()
    w = rdict(conn.execute("SELECT * FROM withdrawals WHERE id=?", (wid,)).fetchone())
    conn.close()
    return ok(w, 'Permintaan berhasil diajukan.', 201)

# ══════════════════════════════════════════════════════════
#  ADMIN
# ══════════════════════════════════════════════════════════
@app.route('/api/admin/dashboard')
@admin_only
def admin_dashboard():
    conn = get_db()
    s = {
        'totalNasabah':   conn.execute("SELECT COUNT(*) v FROM users").fetchone()['v'],
        'activeNasabah':  conn.execute("SELECT COUNT(*) v FROM users WHERE active=1").fetchone()['v'],
        'totalSaldo':     conn.execute("SELECT COALESCE(SUM(balance),0) v FROM users").fetchone()['v'],
        'totalDeposit':   conn.execute("SELECT COALESCE(SUM(amount),0) v FROM deposits").fetchone()['v'],
        'totalWithdraw':  conn.execute("SELECT COALESCE(SUM(amount),0) v FROM withdrawals WHERE status='approved'").fetchone()['v'],
        'pendingCount':   conn.execute("SELECT COUNT(*) v FROM withdrawals WHERE status='pending'").fetchone()['v'],
        'depositCount':   conn.execute("SELECT COUNT(*) v FROM deposits").fetchone()['v'],
    }
    conn.close(); return ok({'stats': s})

@app.route('/api/admin/nasabah')
@admin_only
def admin_get_nasabah():
    search = request.args.get('search', '')
    conn = get_db()
    q = "SELECT id,name,email,phone,address,balance,join_date,active FROM users WHERE 1=1"
    p = []
    if search:
        q += " AND (name LIKE ? OR email LIKE ?)"; p += [f'%{search}%', f'%{search}%']
    rows = rlist(conn.execute(q, p).fetchall())
    for u in rows:
        u['total_deposit'] = conn.execute("SELECT COALESCE(SUM(amount),0) v FROM deposits WHERE user_id=?", (u['id'],)).fetchone()['v']
        u['deposit_count'] = conn.execute("SELECT COUNT(*) v FROM deposits WHERE user_id=?", (u['id'],)).fetchone()['v']
    conn.close(); return ok(rows)

@app.route('/api/admin/nasabah/<int:uid>', methods=['PUT'])
@admin_only
def admin_update_nasabah(uid):
    d = request.get_json() or {}
    conn = get_db()
    conn.execute(
        "UPDATE users SET name=COALESCE(?,name), phone=COALESCE(?,phone), address=COALESCE(?,address), active=COALESCE(?,active) WHERE id=?",
        (d.get('name'), d.get('phone'), d.get('address'), d.get('active'), uid))
    conn.commit()
    u = rdict(conn.execute("SELECT id,name,email,phone,address,balance,join_date,active FROM users WHERE id=?", (uid,)).fetchone())
    conn.close(); return ok(u, 'Diperbarui.')

@app.route('/api/admin/setoran')
@admin_only
def admin_get_setoran():
    conn = get_db()
    rows = rlist(conn.execute(
        "SELECT d.*,u.name as user_name,t.name as trash_name,t.icon as trash_icon,t.unit as trash_unit "
        "FROM deposits d JOIN users u ON d.user_id=u.id JOIN trash_types t ON d.trash_type_id=t.id "
        "ORDER BY d.date DESC").fetchall())
    conn.close(); return ok(rows)

@app.route('/api/admin/setoran', methods=['POST'])
@admin_only
def admin_add_setoran():
    d = request.get_json() or {}
    uid = d.get('userId'); tid = d.get('trashTypeId'); weight = float(d.get('weight', 0))
    if not uid or not tid or weight <= 0:
        return err('userId, trashTypeId, weight wajib diisi.')
    conn = get_db()
    u = conn.execute("SELECT * FROM users WHERE id=?", (uid,)).fetchone()
    t = conn.execute("SELECT * FROM trash_types WHERE id=? AND active=1", (tid,)).fetchone()
    if not u: conn.close(); return err('Nasabah tidak ditemukan.', 404)
    if not t: conn.close(); return err('Jenis sampah tidak ditemukan.', 404)
    amount = t['price_per_kg'] * weight
    c = conn.cursor()
    c.execute("INSERT INTO deposits (user_id,trash_type_id,weight,amount,note) VALUES (?,?,?,?,?)",
              (uid, tid, weight, amount, d.get('note', '')))
    conn.execute("UPDATE users SET balance=balance+? WHERE id=?", (amount, uid))
    conn.commit()
    dep = rdict(conn.execute(
        "SELECT d.*,u.name as user_name,t.name as trash_name FROM deposits d "
        "JOIN users u ON d.user_id=u.id JOIN trash_types t ON d.trash_type_id=t.id WHERE d.id=?",
        (c.lastrowid,)).fetchone())
    conn.close()
    return ok(dep, f'Setoran berhasil. Rp {amount:,.0f} ditambahkan.', 201)

@app.route('/api/admin/penarikan')
@admin_only
def admin_get_penarikan():
    status = request.args.get('status')
    conn = get_db()
    q = "SELECT w.*,u.name as user_name FROM withdrawals w JOIN users u ON w.user_id=u.id WHERE 1=1"
    p = []
    if status: q += " AND w.status=?"; p.append(status)
    q += " ORDER BY w.date DESC"
    rows = rlist(conn.execute(q, p).fetchall())
    conn.close(); return ok(rows)

@app.route('/api/admin/penarikan/<int:wid>/approve', methods=['PUT'])
@admin_only
def admin_approve(wid):
    conn = get_db()
    w = rdict(conn.execute("SELECT * FROM withdrawals WHERE id=?", (wid,)).fetchone())
    if not w: conn.close(); return err('Tidak ditemukan.', 404)
    if w['status'] != 'pending': conn.close(); return err('Hanya pending yang bisa disetujui.')
    if w['type'] == 'sembako' and w['sembako_id']:
        sem = conn.execute("SELECT * FROM sembako WHERE id=?", (w['sembako_id'],)).fetchone()
        if sem and sem['stock'] < (w['qty'] or 0):
            conn.close(); return err('Stok tidak cukup.')
        conn.execute("UPDATE sembako SET stock=MAX(0,stock-?) WHERE id=?", (w['qty'] or 0, w['sembako_id']))
    conn.execute("UPDATE withdrawals SET status='approved', approved_date=date('now') WHERE id=?", (wid,))
    conn.commit()
    w = rdict(conn.execute("SELECT * FROM withdrawals WHERE id=?", (wid,)).fetchone())
    conn.close(); return ok(w, 'Penarikan disetujui.')

@app.route('/api/admin/penarikan/<int:wid>/reject', methods=['PUT'])
@admin_only
def admin_reject(wid):
    d = request.get_json() or {}
    conn = get_db()
    w = rdict(conn.execute("SELECT * FROM withdrawals WHERE id=?", (wid,)).fetchone())
    if not w: conn.close(); return err('Tidak ditemukan.', 404)
    if w['status'] != 'pending': conn.close(); return err('Hanya pending yang bisa ditolak.')
    conn.execute("UPDATE users SET balance=balance+? WHERE id=?", (w['amount'], w['user_id']))
    conn.execute("UPDATE withdrawals SET status='rejected', rejected_date=date('now'), reject_reason=? WHERE id=?",
                 (d.get('reason', ''), wid))
    conn.commit()
    w = rdict(conn.execute("SELECT * FROM withdrawals WHERE id=?", (wid,)).fetchone())
    conn.close(); return ok(w, 'Penarikan ditolak dan saldo dikembalikan.')

@app.route('/api/admin/trash-types')
@admin_only
def admin_get_trash():
    conn = get_db()
    rows = rlist(conn.execute("SELECT * FROM trash_types").fetchall())
    conn.close(); return ok(rows)

@app.route('/api/admin/trash-types', methods=['POST'])
@admin_only
def admin_add_trash():
    d = request.get_json() or {}
    name  = d.get('name', '').strip()
    price = float(d.get('pricePerKg', 0))
    if not name or price <= 0: return err('name dan pricePerKg wajib diisi.')
    conn = get_db(); c = conn.cursor()
    c.execute("INSERT INTO trash_types (name,icon,price_per_kg,unit) VALUES (?,?,?,?)",
              (name, d.get('icon', '♻️'), price, d.get('unit', 'kg')))
    conn.commit()
    row = rdict(conn.execute("SELECT * FROM trash_types WHERE id=?", (c.lastrowid,)).fetchone())
    conn.close(); return ok(row, 'Ditambahkan.', 201)

@app.route('/api/admin/trash-types/<int:tid>', methods=['PUT'])
@admin_only
def admin_update_trash(tid):
    d = request.get_json() or {}
    conn = get_db()
    conn.execute(
        "UPDATE trash_types SET name=COALESCE(?,name), icon=COALESCE(?,icon), "
        "price_per_kg=COALESCE(?,price_per_kg), unit=COALESCE(?,unit), active=COALESCE(?,active) WHERE id=?",
        (d.get('name'), d.get('icon'), d.get('pricePerKg'), d.get('unit'), d.get('active'), tid))
    conn.commit()
    row = rdict(conn.execute("SELECT * FROM trash_types WHERE id=?", (tid,)).fetchone())
    conn.close(); return ok(row, 'Diperbarui.')

@app.route('/api/admin/sembako')
@admin_only
def admin_get_sembako():
    conn = get_db()
    rows = rlist(conn.execute("SELECT * FROM sembako").fetchall())
    conn.close(); return ok(rows)

@app.route('/api/admin/sembako', methods=['POST'])
@admin_only
def admin_add_sembako():
    d = request.get_json() or {}
    name  = d.get('name', '').strip()
    price = float(d.get('price', 0))
    if not name or price <= 0: return err('name dan price wajib diisi.')
    conn = get_db(); c = conn.cursor()
    c.execute("INSERT INTO sembako (name,icon,price,unit,pemasok_id) VALUES (?,?,?,?,?)",
              (name, d.get('icon', '🛒'), price, d.get('unit', 'kg'), d.get('pemasokId')))
    conn.commit()
    row = rdict(conn.execute("SELECT * FROM sembako WHERE id=?", (c.lastrowid,)).fetchone())
    conn.close(); return ok(row, 'Sembako ditambahkan.', 201)

@app.route('/api/admin/pemasok')
@admin_only
def admin_get_pemasok():
    conn = get_db()
    rows = rlist(conn.execute("SELECT id,name,email,phone,address,join_date,active FROM pemasok").fetchall())
    for p in rows:
        p['sembako_count'] = conn.execute(
            "SELECT COUNT(*) v FROM sembako WHERE pemasok_id=?", (p['id'],)).fetchone()['v']
    conn.close(); return ok(rows)

@app.route('/api/admin/pemasok', methods=['POST'])
@admin_only
def admin_add_pemasok():
    d = request.get_json() or {}
    name  = d.get('name', '').strip()
    email = d.get('email', '').strip()
    pw    = d.get('password', '')
    if not name or not email or not pw: return err('Nama, email, password wajib diisi.')
    conn = get_db()
    if conn.execute("SELECT id FROM pemasok WHERE email=?", (email,)).fetchone():
        conn.close(); return err('Email sudah terdaftar.', 409)
    h = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
    c = conn.cursor()
    c.execute("INSERT INTO pemasok (name,email,password,phone,address) VALUES (?,?,?,?,?)",
              (name, email, h, d.get('phone', ''), d.get('address', '')))
    conn.commit()
    row = rdict(conn.execute(
        "SELECT id,name,email,phone,address,join_date,active FROM pemasok WHERE id=?", (c.lastrowid,)).fetchone())
    conn.close(); return ok(row, 'Pemasok ditambahkan.', 201)

@app.route('/api/admin/transaksi')
@admin_only
def admin_transaksi():
    conn = get_db()
    deps = rlist(conn.execute(
        "SELECT d.*,'deposit' as tx_type,u.name as user_name,t.name as trash_name,t.icon as trash_icon "
        "FROM deposits d JOIN users u ON d.user_id=u.id JOIN trash_types t ON d.trash_type_id=t.id").fetchall())
    wits = rlist(conn.execute(
        "SELECT w.*,w.type as tx_type,u.name as user_name FROM withdrawals w JOIN users u ON w.user_id=u.id").fetchall())
    all_tx = sorted(deps + wits, key=lambda x: x['date'], reverse=True)
    conn.close(); return ok(all_tx)

# ══════════════════════════════════════════════════════════
#  PEMASOK
# ══════════════════════════════════════════════════════════
@app.route('/api/pemasok/dashboard')
@pemasok_only
def pemasok_dashboard():
    pid = request.user['id']
    conn = get_db()
    products = rlist(conn.execute("SELECT * FROM sembako WHERE pemasok_id=?", (pid,)).fetchall())
    reqs = rlist(conn.execute(
        "SELECT w.*,u.name as user_name FROM withdrawals w JOIN users u ON w.user_id=u.id "
        "WHERE w.type='sembako' AND w.status='pending' LIMIT 5").fetchall())
    stats = {
        'productCount':    len(products),
        'pendingRequests': conn.execute("SELECT COUNT(*) v FROM withdrawals WHERE type='sembako' AND status='pending'").fetchone()['v'],
        'approvedRequests':conn.execute("SELECT COUNT(*) v FROM withdrawals WHERE type='sembako' AND status='approved'").fetchone()['v'],
        'totalRevenue':    conn.execute("SELECT COALESCE(SUM(amount),0) v FROM withdrawals WHERE type='sembako' AND status='approved'").fetchone()['v'],
    }
    conn.close(); return ok({'stats': stats, 'products': products, 'recentRequests': reqs})

@app.route('/api/pemasok/sembako')
@pemasok_only
def pemasok_get_sembako():
    pid = request.user['id']
    conn = get_db()
    rows = rlist(conn.execute("SELECT * FROM sembako WHERE pemasok_id=?", (pid,)).fetchall())
    conn.close(); return ok(rows)

@app.route('/api/pemasok/sembako/<int:sid>', methods=['PUT'])
@pemasok_only
def pemasok_update_sembako(sid):
    pid = request.user['id']
    d = request.get_json() or {}
    conn = get_db()
    if not conn.execute("SELECT id FROM sembako WHERE id=? AND pemasok_id=?", (sid, pid)).fetchone():
        conn.close(); return err('Produk tidak ditemukan.', 404)
    conn.execute("UPDATE sembako SET name=COALESCE(?,name), price=COALESCE(?,price), icon=COALESCE(?,icon) WHERE id=?",
                 (d.get('name'), d.get('price'), d.get('icon'), sid))
    conn.commit()
    row = rdict(conn.execute("SELECT * FROM sembako WHERE id=?", (sid,)).fetchone())
    conn.close(); return ok(row, 'Produk diperbarui.')

@app.route('/api/pemasok/sembako/<int:sid>/add-stock', methods=['POST'])
@pemasok_only
def pemasok_add_stock(sid):
    pid = request.user['id']
    d = request.get_json() or {}
    qty = int(d.get('qty', 0))
    if qty < 1: return err('qty harus lebih dari 0.')
    conn = get_db()
    if not conn.execute("SELECT id FROM sembako WHERE id=? AND pemasok_id=?", (sid, pid)).fetchone():
        conn.close(); return err('Produk tidak ditemukan.', 404)
    conn.execute("UPDATE sembako SET stock=stock+? WHERE id=?", (qty, sid))
    conn.commit()
    row = rdict(conn.execute("SELECT * FROM sembako WHERE id=?", (sid,)).fetchone())
    conn.close(); return ok(row, f"Stok {row['name']} bertambah {qty} {row['unit']}.")

@app.route('/api/pemasok/sembako/<int:sid>/price-stock', methods=['PUT'])
@pemasok_only
def pemasok_price_stock(sid):
    pid = request.user['id']
    d = request.get_json() or {}
    conn = get_db()
    if not conn.execute("SELECT id FROM sembako WHERE id=? AND pemasok_id=?", (sid, pid)).fetchone():
        conn.close(); return err('Produk tidak ditemukan.', 404)
    price     = float(d.get('price') or 0)
    add_stock = int(d.get('addStock') or 0)
    if price > 0:     conn.execute("UPDATE sembako SET price=? WHERE id=?", (price, sid))
    if add_stock > 0: conn.execute("UPDATE sembako SET stock=stock+? WHERE id=?", (add_stock, sid))
    conn.commit()
    row = rdict(conn.execute("SELECT * FROM sembako WHERE id=?", (sid,)).fetchone())
    conn.close(); return ok(row, f"{row['name']} diperbarui.")

@app.route('/api/pemasok/permintaan')
@pemasok_only
def pemasok_get_permintaan():
    status = request.args.get('status')
    conn = get_db()
    q = "SELECT w.*,u.name as user_name,u.phone as user_phone FROM withdrawals w JOIN users u ON w.user_id=u.id WHERE w.type='sembako'"
    p = []
    if status: q += " AND w.status=?"; p.append(status)
    q += " ORDER BY w.date DESC"
    rows = rlist(conn.execute(q, p).fetchall())
    conn.close(); return ok(rows)

@app.route('/api/pemasok/permintaan/<int:wid>/approve', methods=['PUT'])
@pemasok_only
def pemasok_approve(wid):
    conn = get_db()
    w = rdict(conn.execute("SELECT * FROM withdrawals WHERE id=? AND type='sembako'", (wid,)).fetchone())
    if not w: conn.close(); return err('Tidak ditemukan.', 404)
    if w['status'] != 'pending': conn.close(); return err('Hanya pending yang bisa diproses.')
    if w['sembako_id']:
        sem = conn.execute("SELECT * FROM sembako WHERE id=?", (w['sembako_id'],)).fetchone()
        if sem and sem['stock'] < (w['qty'] or 0):
            conn.close(); return err('Stok tidak cukup.')
        conn.execute("UPDATE sembako SET stock=MAX(0,stock-?) WHERE id=?", (w['qty'] or 0, w['sembako_id']))
    conn.execute("UPDATE withdrawals SET status='approved', approved_date=date('now') WHERE id=?", (wid,))
    conn.commit()
    w = rdict(conn.execute("SELECT * FROM withdrawals WHERE id=?", (wid,)).fetchone())
    conn.close(); return ok(w, 'Permintaan disetujui.')

@app.route('/api/pemasok/permintaan/<int:wid>/reject', methods=['PUT'])
@pemasok_only
def pemasok_reject(wid):
    d = request.get_json() or {}
    conn = get_db()
    w = rdict(conn.execute("SELECT * FROM withdrawals WHERE id=? AND type='sembako'", (wid,)).fetchone())
    if not w: conn.close(); return err('Tidak ditemukan.', 404)
    if w['status'] != 'pending': conn.close(); return err('Hanya pending yang bisa ditolak.')
    conn.execute("UPDATE users SET balance=balance+? WHERE id=?", (w['amount'], w['user_id']))
    conn.execute("UPDATE withdrawals SET status='rejected', rejected_date=date('now'), reject_reason=? WHERE id=?",
                 (d.get('reason', ''), wid))
    conn.commit()
    w = rdict(conn.execute("SELECT * FROM withdrawals WHERE id=?", (wid,)).fetchone())
    conn.close(); return ok(w, 'Ditolak dan saldo dikembalikan.')

# ─── ROOT ─────────────────────────────────────────────────
@app.route('/')
def root():
    return jsonify({'name': 'EcoBank Sampah API', 'version': '1.0.0',
                    'status': 'running', 'stack': 'Python Flask + SQLite'})

if __name__ == '__main__':
    init_db()
    print("╔══════════════════════════════════════╗")
    print("║  🌿 EcoBank Sampah Flask API          ║")
    print("║  http://localhost:5000                ║")
    print("╚══════════════════════════════════════╝")
    app.run(debug=True, port=5000)
