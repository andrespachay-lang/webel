/**
 * Rutas de reservas
 *   POST /api/reservas          — crea reserva e inicia cobro PayPhone
 *   GET  /api/reservas/:codigo/estado — consulta estado de pago (polling del frontend)
 *   GET  /api/disponibilidad    — consulta disponibilidad
 */

const express  = require('express');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const router   = express.Router();
const { HABITACIONES, generarCodigo, calcularTotal } = require('../models/Reserva');
const payphone = require('../services/payphone');
const whatsapp = require('../services/whatsapp');

// ── Multer para comprobante de transferencia ──────────────────────────────────
const almacenamientoComprobante = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/comprobantes');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-comprobante${ext}`);
  },
});

const subirComprobante = multer({
  storage: almacenamientoComprobante,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    /jpeg|jpg|png|pdf/.test(path.extname(file.originalname).toLowerCase())
      ? cb(null, true) : cb(new Error('Solo JPG, PNG o PDF'));
  },
});

// ── POST /api/reservas ────────────────────────────────────────────────────────
router.post('/', subirComprobante.single('comprobante_pago'), async (req, res) => {
  const db = req.app.get('db');

  const {
    habitacion, fecha_entrada, fecha_salida, huespedes,
    nombre, apellido, cedula, telefono, pais, correo,
    metodo_pago, mensaje_anfitrion,
  } = req.body;

  // ── Validación ───────────────────────────────────────────────────────────
  const requeridos = { habitacion, fecha_entrada, fecha_salida, huespedes, nombre, apellido, cedula, telefono, pais, correo, metodo_pago };
  for (const [campo, valor] of Object.entries(requeridos)) {
    if (!valor) return res.status(400).json({ error: `El campo "${campo}" es obligatorio` });
  }

  if (!HABITACIONES[habitacion]) {
    return res.status(400).json({ error: `Habitación "${habitacion}" no existe` });
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

  // ── Disponibilidad ───────────────────────────────────────────────────────
  const conflicto = db.prepare(`
    SELECT id FROM reservas
    WHERE habitacion = ?
      AND estado NOT IN ('cancelada', 'pendiente_pago')
      AND fecha_entrada < ?
      AND fecha_salida  > ?
  `).get(habitacion, fecha_salida, fecha_entrada);

  if (conflicto) {
    return res.status(409).json({ error: 'La habitación no está disponible para las fechas seleccionadas' });
  }

  // ── Calcular totales ─────────────────────────────────────────────────────
  const { noches, subtotal, iva, total } = calcularTotal(numHuespedes, fecha_entrada, fecha_salida);
  const codigo             = generarCodigo(db);
  const archivoComprobante = req.file ? req.file.filename : null;

  // ── Guardar reserva como pendiente_pago ──────────────────────────────────
  try {
    db.prepare(`
      INSERT INTO reservas
        (codigo, habitacion, fecha_entrada, fecha_salida, noches, huespedes,
         nombre, apellido, cedula, telefono, pais, correo, metodo_pago,
         subtotal, iva, total, mensaje_anfitrion, comprobante_pago, estado)
      VALUES
        (@codigo, @habitacion, @fecha_entrada, @fecha_salida, @noches, @huespedes,
         @nombre, @apellido, @cedula, @telefono, @pais, @correo, @metodo_pago,
         @subtotal, @iva, @total, @mensaje_anfitrion, @comprobante_pago, @estado)
    `).run({
      codigo, habitacion, fecha_entrada, fecha_salida, noches, huespedes: numHuespedes,
      nombre, apellido, cedula, telefono, pais, correo, metodo_pago,
      subtotal, iva, total,
      mensaje_anfitrion:  mensaje_anfitrion  || null,
      comprobante_pago:   archivoComprobante || null,
      estado:             'pendiente_pago',
    });
  } catch (err) {
    console.error('[Reserva] Error guardando:', err);
    return res.status(500).json({ error: 'Error interno al guardar la reserva' });
  }

  // ── Pago con PayPhone ────────────────────────────────────────────────────
  const esPayPhone    = metodo_pago.toLowerCase().includes('payphone');
  const esTransfer    = metodo_pago.toLowerCase().includes('transferencia');

  if (esPayPhone) {
    try {
      const subtotalCentavos = payphone.aCentavos(subtotal);
      const ivaCentavos      = payphone.aCentavos(iva);
      const totalCentavos    = payphone.aCentavos(total);

      const respuesta = await payphone.iniciarCobro({
        phoneNumber:         telefono,
        totalCentavos,
        subtotalCentavos,
        ivaCentavos,
        clientTransactionId: codigo,
        reference:           `Reserva ${codigo} — Estación del Sol`,
        correoCliente:       correo,
        nombreCliente:       nombre,
        apellidoCliente:     apellido,
      });

      console.log(`[PayPhone] Cobro iniciado para ${codigo}:`, JSON.stringify(respuesta));

      return res.status(201).json({
        codigo,
        estado:  'pendiente_pago',
        mensaje: 'Revisa tu app PayPhone para aprobar el pago.',
        total,
        noches,
      });

    } catch (err) {
      console.error('[PayPhone] Error iniciando cobro:', err.message);
      // Marcar como error pero no perder la reserva
      db.prepare('UPDATE reservas SET estado = ? WHERE codigo = ?').run('error_pago', codigo);
      return res.status(502).json({
        error: 'No se pudo iniciar el cobro con PayPhone. Intenta de nuevo o contacta al hotel.',
        codigo,
      });
    }
  }

  // ── Pago por transferencia (manual) ─────────────────────────────────────
  if (esTransfer) {
    // El hotel confirma manualmente al revisar el comprobante
    db.prepare('UPDATE reservas SET estado = ? WHERE codigo = ?').run('pendiente_confirmacion', codigo);
    whatsapp.enviarWhatsApp(
      whatsapp.mensajeNuevaReserva({ ...db.prepare('SELECT * FROM reservas WHERE codigo = ?').get(codigo) })
    ).catch(e => console.error('[WA]', e.message));

    return res.status(201).json({
      codigo,
      estado:  'pendiente_confirmacion',
      mensaje: 'Reserva recibida. El hotel verificará tu comprobante y confirmará.',
      total,
      noches,
    });
  }

  // ── Otro método (tarjeta manual, etc.) ───────────────────────────────────
  return res.status(201).json({
    codigo,
    estado:  'pendiente_pago',
    mensaje: '¡Reserva registrada! El hotel te contactará para coordinar el pago.',
    total,
    noches,
  });
});

// ── GET /api/reservas/:codigo/estado — polling del frontend ───────────────────
router.get('/:codigo/estado', (req, res) => {
  const db     = req.app.get('db');
  const codigo = req.params.codigo.toUpperCase();

  const reserva = db.prepare(`
    SELECT codigo, estado, habitacion, fecha_entrada, fecha_salida, noches, huespedes, total, nombre
    FROM reservas WHERE codigo = ?
  `).get(codigo);

  if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });

  return res.json(reserva);
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
      AND estado NOT IN ('cancelada', 'pendiente_pago', 'error_pago')
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
