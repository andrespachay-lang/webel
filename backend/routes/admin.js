/**
 * Rutas del panel de administración (requieren X-Admin-Key)
 *
 *   GET  /api/admin/reservas                     — lista reservas con filtros
 *   PUT  /api/admin/reservas/:id/estado          — cambia estado de reserva
 *   GET  /api/admin/disponibilidad/calendario    — mapa de ocupación por habitación
 *   GET  /api/admin/checkins                     — lista check-ins registrados
 */

const express   = require('express');
const router    = express.Router();
const { soloAdmin } = require('../middleware/auth');
const { HABITACIONES } = require('../models/Reserva');

// Aplica autenticación a todas las rutas de este router
router.use(soloAdmin);

// ── GET /api/admin/reservas ───────────────────────────────────────────────────
router.get('/reservas', (req, res) => {
  const db = req.app.get('db');
  const { habitacion, estado, desde, hasta, pagina = 1, por_pagina = 20 } = req.query;

  let sql    = 'SELECT * FROM reservas WHERE 1=1';
  const args = [];

  if (habitacion) { sql += ' AND habitacion = ?'; args.push(habitacion); }
  if (estado)     { sql += ' AND estado = ?';     args.push(estado); }
  if (desde)      { sql += ' AND fecha_entrada >= ?'; args.push(desde); }
  if (hasta)      { sql += ' AND fecha_salida  <= ?'; args.push(hasta); }

  sql += ' ORDER BY creado_en DESC';

  const limite  = parseInt(por_pagina, 10);
  const offset  = (parseInt(pagina, 10) - 1) * limite;
  const sqlPage = sql + ` LIMIT ${limite} OFFSET ${offset}`;

  const reservas = db.prepare(sqlPage).all(...args);
  const total    = db.prepare(`SELECT COUNT(*) as n FROM reservas WHERE 1=1${
    [habitacion, estado, desde, hasta].filter(Boolean).map(() => '').join('')
  }`).get()?.n ?? 0;

  // Recuento real con filtros
  const sqlCount = sql.replace('SELECT *', 'SELECT COUNT(*) as n').split(' ORDER BY')[0];
  const cuenta   = db.prepare(sqlCount).get(...args)?.n ?? 0;

  return res.json({ reservas, total: cuenta, pagina: parseInt(pagina, 10), por_pagina: limite });
});

// ── PUT /api/admin/reservas/:id/estado ────────────────────────────────────────
router.put('/reservas/:id/estado', (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { estado } = req.body;

  const estadosValidos = ['pendiente', 'confirmada', 'cancelada'];
  if (!estadosValidos.includes(estado)) {
    return res.status(400).json({ error: `Estado no válido. Opciones: ${estadosValidos.join(', ')}` });
  }

  const resultado = db.prepare('UPDATE reservas SET estado = ? WHERE id = ?').run(estado, id);

  if (resultado.changes === 0) {
    return res.status(404).json({ error: 'Reserva no encontrada' });
  }

  const reserva = db.prepare('SELECT * FROM reservas WHERE id = ?').get(id);
  return res.json({ mensaje: 'Estado actualizado', reserva });
});

// ── GET /api/admin/disponibilidad/calendario ──────────────────────────────────
router.get('/disponibilidad/calendario', (req, res) => {
  const db = req.app.get('db');

  // Por defecto muestra los próximos 60 días
  const hoy   = new Date();
  const desde = req.query.desde || hoy.toISOString().slice(0, 10);
  const hasta = req.query.hasta || new Date(hoy.setDate(hoy.getDate() + 60)).toISOString().slice(0, 10);

  const reservas = db.prepare(`
    SELECT habitacion, fecha_entrada, fecha_salida, estado, codigo, nombre, apellido
    FROM reservas
    WHERE estado != 'cancelada'
      AND fecha_entrada < ?
      AND fecha_salida  > ?
    ORDER BY habitacion, fecha_entrada
  `).all(hasta, desde);

  // Construye mapa { habitacion: [{ codigo, nombre, fecha_entrada, fecha_salida }] }
  const calendario = {};
  for (const hab of Object.keys(HABITACIONES)) {
    calendario[hab] = [];
  }
  for (const r of reservas) {
    if (calendario[r.habitacion]) {
      calendario[r.habitacion].push({
        codigo:        r.codigo,
        huesped:       `${r.nombre} ${r.apellido}`,
        fecha_entrada: r.fecha_entrada,
        fecha_salida:  r.fecha_salida,
        estado:        r.estado,
      });
    }
  }

  return res.json({ desde, hasta, calendario });
});

// ── GET /api/admin/checkins ───────────────────────────────────────────────────
router.get('/checkins', (req, res) => {
  const db = req.app.get('db');
  const checkins = db.prepare(`
    SELECT c.*, r.habitacion, r.fecha_entrada, r.fecha_salida
    FROM checkins c
    JOIN reservas r ON r.codigo = c.codigo_reserva
    ORDER BY c.creado_en DESC
  `).all();

  return res.json({ checkins });
});

module.exports = router;
