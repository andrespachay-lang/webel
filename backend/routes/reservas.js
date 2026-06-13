/**
 * Rutas de reservas
 *   POST /api/reservas          — crea una nueva reserva (acepta multipart para comprobante)
 *   GET  /api/disponibilidad    — consulta disponibilidad
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const { HABITACIONES, generarCodigo, calcularTotal } = require('../models/Reserva');
const email     = require('../services/email');
const whatsapp  = require('../services/whatsapp');

// ── Multer para comprobante de transferencia ──────────────────────────────────
const almacenamientoComprobante = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/comprobantes');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-comprobante${ext}`);
  },
});

const filtro = (req, file, cb) => {
  if (/jpeg|jpg|png|pdf/.test(path.extname(file.originalname).toLowerCase())) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten JPG, PNG o PDF'));
  }
};

const subirComprobante = multer({
  storage: almacenamientoComprobante,
  limits: { fileSize: 2 * 1024 * 1024 },  // 2 MB máximo
  fileFilter: filtro,
});

// ── POST /api/reservas ────────────────────────────────────────────────────────
router.post('/', subirComprobante.single('comprobante_pago'), async (req, res) => {
  const db = req.app.get('db');

  const {
    habitacion,
    fecha_entrada,
    fecha_salida,
    huespedes,
    nombre,
    apellido,
    cedula,
    telefono,
    pais,
    correo,
    metodo_pago,
    mensaje_anfitrion,
  } = req.body;

  // ── Validación básica ────────────────────────────────────────────────────
  const camposObligatorios = { habitacion, fecha_entrada, fecha_salida, huespedes, nombre, apellido, cedula, telefono, pais, correo, metodo_pago };
  for (const [campo, valor] of Object.entries(camposObligatorios)) {
    if (!valor) {
      return res.status(400).json({ error: `El campo "${campo}" es obligatorio` });
    }
  }

  if (!HABITACIONES[habitacion]) {
    return res.status(400).json({ error: `Habitación "${habitacion}" no existe. Opciones: ${Object.keys(HABITACIONES).join(', ')}` });
  }

  const entrada = new Date(fecha_entrada);
  const salida  = new Date(fecha_salida);
  if (isNaN(entrada) || isNaN(salida) || salida <= entrada) {
    return res.status(400).json({ error: 'Fechas no válidas o la salida debe ser posterior a la entrada' });
  }

  const numHuespedes = parseInt(huespedes, 10);
  if (numHuespedes < 1 || numHuespedes > HABITACIONES[habitacion].capacidad) {
    return res.status(400).json({
      error: `La habitación ${habitacion} acepta máximo ${HABITACIONES[habitacion].capacidad} huéspedes`,
    });
  }

  // ── Comprobante obligatorio si es transferencia ──────────────────────────
  const esTransferencia = metodo_pago.toLowerCase().includes('transferencia');
  const archivoComprobante = req.file ? req.file.filename : null;

  // (No bloqueamos si no adjunta comprobante — el hotel puede pedirlo luego)

  // ── Verificar disponibilidad ─────────────────────────────────────────────
  const conflicto = db.prepare(`
    SELECT id FROM reservas
    WHERE habitacion = ?
      AND estado != 'cancelada'
      AND fecha_entrada < ?
      AND fecha_salida  > ?
  `).get(habitacion, fecha_salida, fecha_entrada);

  if (conflicto) {
    return res.status(409).json({ error: 'La habitación no está disponible para las fechas seleccionadas' });
  }

  // ── Calcular totales ─────────────────────────────────────────────────────
  const { noches, subtotal, iva, total } = calcularTotal(numHuespedes, fecha_entrada, fecha_salida);
  const codigo = generarCodigo(db);

  // ── Guardar reserva ──────────────────────────────────────────────────────
  try {
    db.prepare(`
      INSERT INTO reservas
        (codigo, habitacion, fecha_entrada, fecha_salida, noches, huespedes,
         nombre, apellido, cedula, telefono, pais, correo, metodo_pago,
         subtotal, iva, total, mensaje_anfitrion, comprobante_pago)
      VALUES
        (@codigo, @habitacion, @fecha_entrada, @fecha_salida, @noches, @huespedes,
         @nombre, @apellido, @cedula, @telefono, @pais, @correo, @metodo_pago,
         @subtotal, @iva, @total, @mensaje_anfitrion, @comprobante_pago)
    `).run({
      codigo, habitacion, fecha_entrada, fecha_salida, noches, huespedes: numHuespedes,
      nombre, apellido, cedula, telefono, pais, correo, metodo_pago,
      subtotal, iva, total,
      mensaje_anfitrion:  mensaje_anfitrion  || null,
      comprobante_pago:   archivoComprobante || null,
    });
  } catch (err) {
    console.error('[Reserva] Error guardando:', err);
    return res.status(500).json({ error: 'Error interno al guardar la reserva' });
  }

  const reserva = db.prepare('SELECT * FROM reservas WHERE codigo = ?').get(codigo);

  // Ruta completa del archivo para adjuntarlo al correo del hotel
  const rutaComprobante = archivoComprobante
    ? path.join(__dirname, '../uploads/comprobantes', archivoComprobante)
    : null;

  // ── Notificaciones (no bloqueantes) ─────────────────────────────────────
  email.enviarConfirmacionHuesped(reserva).catch(e => console.error('[Email huésped]', e.message));
  email.enviarNotificacionHotel(reserva, rutaComprobante).catch(e => console.error('[Email hotel]', e.message));
  whatsapp.enviarWhatsApp(whatsapp.mensajeNuevaReserva(reserva)).catch(e => console.error('[WA]', e.message));

  return res.status(201).json({
    codigo,
    mensaje: '¡Reserva confirmada! Revisa tu correo para los detalles.',
    total,
    noches,
  });
});

// ── GET /api/disponibilidad ───────────────────────────────────────────────────
router.get('/disponibilidad', (req, res) => {
  const db = req.app.get('db');
  const { habitacion, fecha_entrada, fecha_salida } = req.query;

  if (!habitacion || !fecha_entrada || !fecha_salida) {
    return res.status(400).json({ error: 'Parámetros requeridos: habitacion, fecha_entrada, fecha_salida' });
  }

  if (!HABITACIONES[habitacion]) {
    return res.status(400).json({ error: `Habitación "${habitacion}" no existe` });
  }

  const conflicto = db.prepare(`
    SELECT id FROM reservas
    WHERE habitacion = ?
      AND estado != 'cancelada'
      AND fecha_entrada < ?
      AND fecha_salida  > ?
  `).get(habitacion, fecha_salida, fecha_entrada);

  return res.json({
    disponible: !conflicto,
    habitacion,
    fecha_entrada,
    fecha_salida,
    capacidad: HABITACIONES[habitacion].capacidad,
  });
});

module.exports = router;
