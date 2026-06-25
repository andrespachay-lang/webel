/**
 * Rutas de check-in en línea
 *   POST /api/checkin   — registra el check-in con foto de cédula
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const router  = express.Router();
const email     = require('../services/email');
const whatsapp  = require('../services/whatsapp');

// ── Configuración de Multer (subida de foto de cédula) ────────────────────────
const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/cedulas'));
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const nombre = `${Date.now()}-${req.body.codigo_reserva || 'sincodigo'}${ext}`;
    cb(null, nombre);
  },
});

const filtroArchivos = (req, file, cb) => {
  const tiposPermitidos = /jpeg|jpg|png|pdf/;
  const ext = tiposPermitidos.test(path.extname(file.originalname).toLowerCase());
  const mime = tiposPermitidos.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Solo se permiten archivos JPG, PNG o PDF'));
};

const subida = multer({
  storage: almacenamiento,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB máximo
  fileFilter: filtroArchivos,
});

// ── POST /api/checkin ─────────────────────────────────────────────────────────
router.post('/', subida.single('foto_cedula'), async (req, res) => {
  const db = req.app.get('db');

  const {
    codigo_reserva,
    nombre,
    apellido,
    cedula,
    direccion,
    telefono,
    contacto_emergencia,
    hora_llegada,
    personas,
    solicitudes,
    acepto_terminos,
  } = req.body;

  // ── Validación ───────────────────────────────────────────────────────────
  const camposObligatorios = {
    codigo_reserva, nombre, apellido, cedula, direccion, telefono,
    contacto_emergencia, hora_llegada, personas,
  };
  for (const [campo, valor] of Object.entries(camposObligatorios)) {
    if (!valor) {
      return res.status(400).json({ error: `El campo "${campo}" es obligatorio` });
    }
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Debes subir la foto de tu cédula o pasaporte' });
  }

  if (acepto_terminos !== 'true' && acepto_terminos !== '1') {
    return res.status(400).json({ error: 'Debes aceptar las condiciones de la estancia para continuar' });
  }

  // Verificar que la reserva existe y no está cancelada
  const reserva = db.prepare(`
    SELECT * FROM reservas WHERE codigo = ? AND estado != 'cancelada'
  `).get(codigo_reserva);

  if (!reserva) {
    return res.status(404).json({ error: 'Código de reserva no encontrado o cancelado' });
  }

  // ── Evitar check-in duplicado ────────────────────────────────────────────
  const existente = db.prepare('SELECT id FROM checkins WHERE codigo_reserva = ?').get(codigo_reserva);
  if (existente) {
    return res.status(409).json({ error: 'Ya existe un check-in registrado para esta reserva' });
  }

  const fotoCedula = req.file ? req.file.filename : null;
  const numPersonas = parseInt(personas, 10);

  // ── Guardar check-in ─────────────────────────────────────────────────────
  try {
    db.prepare(`
      INSERT INTO checkins (codigo_reserva, nombre, apellido, cedula, direccion, telefono, contacto_emergencia, hora_llegada, personas, solicitudes, foto_cedula, acepto_terminos)
      VALUES (@codigo_reserva, @nombre, @apellido, @cedula, @direccion, @telefono, @contacto_emergencia, @hora_llegada, @personas, @solicitudes, @foto_cedula, @acepto_terminos)
    `).run({
      codigo_reserva,
      nombre,
      apellido,
      cedula,
      direccion,
      telefono,
      contacto_emergencia,
      hora_llegada,
      personas: numPersonas,
      solicitudes: solicitudes || null,
      foto_cedula: fotoCedula,
      acepto_terminos: 1,
    });
  } catch (err) {
    console.error('[Checkin] Error guardando:', err);
    return res.status(500).json({ error: 'Error interno al guardar el check-in' });
  }

  const checkin = db.prepare('SELECT * FROM checkins WHERE codigo_reserva = ?').get(codigo_reserva);
  const rutaFotoCedula = fotoCedula ? path.join(__dirname, '../uploads/cedulas', fotoCedula) : null;

  // ── Notificaciones ───────────────────────────────────────────────────────
  email.enviarConfirmacionCheckin(checkin, reserva).catch(e => console.error('[Email checkin]', e.message));
  email.enviarNotificacionCheckinHotel(checkin, reserva, rutaFotoCedula).catch(e => console.error('[Email checkin hotel]', e.message));
  whatsapp.enviarWhatsApp(whatsapp.mensajeCheckin(checkin, reserva)).catch(e => console.error('[WA checkin]', e.message));

  return res.status(201).json({
    mensaje: '¡Check-in registrado! El anfitrión ya tiene tu información.',
    codigo_reserva,
    hora_llegada,
  });
});

module.exports = router;
