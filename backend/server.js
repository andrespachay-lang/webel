/**
 * Servidor principal — Estación del Sol
 * Hotel Las Núñez, Santa Elena, Ecuador
 */

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');
const rateLimit  = require('express-rate-limit');
const Database   = require('better-sqlite3');

const { crearTablaReservas } = require('./models/Reserva');
const { crearTablaCheckins } = require('./models/Checkin');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Base de datos ─────────────────────────────────────────────────────────────
const dbPath = process.env.DATABASE_URL || './datos/estacion_del_sol.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

crearTablaReservas(db);
crearTablaCheckins(db);
db.exec(`
  CREATE TABLE IF NOT EXISTS datos_bancarios_log (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    correo       TEXT NOT NULL,
    codigo_reserva TEXT,
    enviado_en   TEXT NOT NULL
  )
`);
app.set('db', db);

console.log(`[DB] Base de datos iniciada en ${dbPath}`);

// ── CORS ──────────────────────────────────────────────────────────────────────
const origenesPermitidos = [
  process.env.FRONTEND_URL,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origen, callback) => {
    // Permite peticiones sin origen (curl, Postman) y los orígenes de la lista
    if (!origen || origenesPermitidos.includes(origen)) {
      callback(null, true);
    } else {
      callback(new Error(`Origen no permitido por CORS: ${origen}`));
    }
  },
  credentials: true,
}));

// ── Middlewares globales ──────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sirve archivos estáticos del frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// Sirve archivos subidos — solo accesible con la API key de admin en producción
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiteGeneral = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, intenta en unos minutos' },
});

const limiteReservas = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10,
  message: { error: 'Límite de reservas alcanzado desde esta IP' },
});

app.use('/api', limiteGeneral);
app.use('/api/reservas', limiteReservas);

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/reservas',            require('./routes/reservas'));
app.use('/api/checkin',             require('./routes/checkin'));
app.use('/api/admin',               require('./routes/admin'));
app.use('/api/contacto',            require('./routes/contacto'));
app.use('/api/webhook',             require('./routes/webhook'));
app.use('/api/enviar-datos-bancarios', require('./routes/datosbancarios'));

// Ruta de salud
app.get('/api/salud', (req, res) => {
  res.json({ estado: 'ok', hotel: 'Estación del Sol', timestamp: new Date().toISOString() });
});

// Ruta de disponibilidad (acceso directo desde el frontend)
app.use('/api/disponibilidad', require('./routes/reservas'));

// Sirve el frontend para cualquier ruta no-API (SPA fallback)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'frontend/index.html'));
  }
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// ── Manejo de errores global ──────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'El archivo excede el tamaño máximo de 5 MB' });
  }
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message });
});

// ── Inicio ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n☀  Estación del Sol — backend corriendo en http://localhost:${PORT}`);
  console.log(`   Panel admin: GET /api/admin/reservas  (header X-Admin-Key requerido)`);
  console.log(`   Salud:       GET /api/salud\n`);
});

// Cierre limpio
process.on('SIGINT', () => { db.close(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); process.exit(0); });
