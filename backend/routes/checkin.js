/**
 * Rutas de check-in en línea
 *   POST /api/checkin   — registra el check-in con foto de cédula
 */

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();
const email     = require('../services/email');
const whatsapp  = require('../services/whatsapp');
const ocr       = require('../services/ocr');

// ── Configuración de Multer (subida de foto de cédula) ────────────────────────
const almacenamiento = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/cedulas');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
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
    nombre, apellido, cedula, direccion, telefono,
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

  // Si no viene código, generar uno único para este check-in directo
  const codigoFinal = codigo_reserva || `DIRECTO-${Date.now()}`;

  // Buscar reserva si hay código; si no, usar objeto vacío
  const reserva = codigo_reserva
    ? db.prepare(`SELECT * FROM reservas WHERE codigo = ? AND estado != 'cancelada'`).get(codigo_reserva)
    : { habitacion: '-', fecha_entrada: '-', correo: null };

  // ── Evitar check-in duplicado (solo si hay código de reserva) ────────────
  if (codigo_reserva) {
    const existente = db.prepare('SELECT id FROM checkins WHERE codigo_reserva = ?').get(codigoFinal);
    if (existente) {
      return res.status(409).json({ error: 'Ya existe un check-in registrado para esta reserva' });
    }
  }

  const fotoCedula = req.file ? req.file.filename : null;
  const numPersonas = parseInt(personas, 10);

  // ── Verificación OCR de cédula ───────────────────────────────────────────
  const rutaFotoTemp = req.file ? path.join(__dirname, '../uploads/cedulas', req.file.filename) : null;
  if (rutaFotoTemp) {
    const verificacion = await ocr.verificarCedula(rutaFotoTemp);
    if (!verificacion.ok && !verificacion.ilegible) {
      fs.unlinkSync(rutaFotoTemp);
      return res.status(400).json({
        error: `No se puede completar el check-in. La fecha de nacimiento detectada indica que no cumples con la edad mínima requerida (18 años).`,
      });
    }
    if (verificacion.ilegible) {
      whatsapp.enviarWhatsApp(
        `⚠️ *Check-in requiere revisión manual*\n\nNo se pudo leer la fecha de nacimiento de la cédula de *${nombre} ${apellido}*.\n\nPor favor revisa la foto manualmente para verificar la edad.`
      ).catch(e => console.error('[WA OCR alerta]', e.message));
    }
  }

  // ── Guardar check-in ─────────────────────────────────────────────────────
  try {
    db.prepare(`
      INSERT INTO checkins (codigo_reserva, nombre, apellido, cedula, direccion, telefono, contacto_emergencia, hora_llegada, personas, solicitudes, foto_cedula, acepto_terminos)
      VALUES (@codigo_reserva, @nombre, @apellido, @cedula, @direccion, @telefono, @contacto_emergencia, @hora_llegada, @personas, @solicitudes, @foto_cedula, @acepto_terminos)
    `).run({
      codigo_reserva: codigoFinal,
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

  const checkin = db.prepare('SELECT * FROM checkins WHERE codigo_reserva = ?').get(codigoFinal);
  const rutaFotoCedula = fotoCedula ? path.join(__dirname, '../uploads/cedulas', fotoCedula) : null;

  // ── Notificaciones ───────────────────────────────────────────────────────
  if (reserva.correo) {
    email.enviarConfirmacionCheckin(checkin, reserva).catch(e => console.error('[Email checkin]', e.message));
  }
  email.enviarNotificacionCheckinHotel(checkin, reserva, rutaFotoCedula).catch(e => console.error('[Email checkin hotel]', e.message));
  whatsapp.enviarWhatsApp(whatsapp.mensajeCheckin(checkin, reserva)).catch(e => console.error('[WA checkin]', e.message));

  return res.status(201).json({
    mensaje: '¡Check-in registrado! El anfitrión ya tiene tu información.',
    codigo_reserva: codigoFinal,
    hora_llegada,
  });
});

module.exports = router;
