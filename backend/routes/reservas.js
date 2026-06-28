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
const email    = require('../services/email');

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
    metodo_pago, mensaje_anfitrion, acepta_marketing,
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

  // ── Pago con PayPhone o transferencia (5% dto. en transferencia) ─────────
  const esPayPhone = metodo_pago.toLowerCase().includes('payphone');
  const esTransfer = metodo_pago.toLowerCase().includes('transferencia');

  // ── Calcular totales ─────────────────────────────────────────────────────
  const { noches, subtotal, iva, total } = calcularTotal(numHuespedes, fecha_entrada, fecha_salida, esTransfer);
  const codigo             = generarCodigo(db);
  const archivoComprobante = req.file ? req.file.filename : null;

  // ── Guardar reserva como pendiente_pago ──────────────────────────────────
  try {
    db.prepare(`
      INSERT INTO reservas
        (codigo, habitacion, fecha_entrada, fecha_salida, noches, huespedes,
         nombre, apellido, cedula, telefono, pais, correo, metodo_pago,
         subtotal, iva, total, mensaje_anfitrion, comprobante_pago, estado, acepta_marketing)
      VALUES
        (@codigo, @habitacion, @fecha_entrada, @fecha_salida, @noches, @huespedes,
         @nombre, @apellido, @cedula, @telefono, @pais, @correo, @metodo_pago,
         @subtotal, @iva, @total, @mensaje_anfitrion, @comprobante_pago, @estado, @acepta_marketing)
    `).run({
      codigo, habitacion, fecha_entrada, fecha_salida, noches, huespedes: numHuespedes,
      nombre, apellido, cedula, telefono, pais, correo, metodo_pago,
      subtotal, iva, total,
      mensaje_anfitrion:  mensaje_anfitrion  || null,
      comprobante_pago:   archivoComprobante || null,
      estado:             'pendiente_pago',
      acepta_marketing:   (acepta_marketing === 'true' || acepta_marketing === '1' || acepta_marketing === true) ? 1 : 0,
    });
  } catch (err) {
    console.error('[Reserva] Error guardando:', err);
    return res.status(500).json({ error: 'Error interno al guardar la reserva' });
  }

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
    const reservaGuardada = db.prepare('SELECT * FROM reservas WHERE codigo = ?').get(codigo);

    const rutaComprobante = archivoComprobante
      ? path.join(__dirname, '../uploads/comprobantes', archivoComprobante)
      : null;

    email.enviarConfirmacionHuesped(reservaGuardada).catch(e => console.error('[Email]', e.message));
    email.enviarNotificacionHotel(reservaGuardada, rutaComprobante).catch(e => console.error('[Email hotel]', e.message));
    whatsapp.enviarWhatsApp(
      whatsapp.mensajeNuevaReserva({ ...reservaGuardada })
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

// ── POST /api/reservas/grupo — carrito: varias habitaciones, un solo cobro ────
router.post('/grupo', subirComprobante.single('comprobante_pago'), async (req, res) => {
  const db = req.app.get('db');

  const {
    items, nombre, apellido, cedula, telefono, pais, correo,
    metodo_pago, mensaje_anfitrion, acepta_marketing,
  } = req.body;

  const requeridos = { items, nombre, apellido, cedula, telefono, pais, correo, metodo_pago };
  for (const [campo, valor] of Object.entries(requeridos)) {
    if (!valor) return res.status(400).json({ error: `El campo "${campo}" es obligatorio` });
  }

  let listaItems;
  try {
    listaItems = JSON.parse(items);
  } catch {
    return res.status(400).json({ error: 'El campo "items" debe ser un JSON válido' });
  }
  if (!Array.isArray(listaItems) || listaItems.length === 0) {
    return res.status(400).json({ error: 'El carrito debe tener al menos una habitación' });
  }

  // ── Validar cada habitación del carrito ──────────────────────────────────
  const esPayPhone = metodo_pago.toLowerCase().includes('payphone');
  const esTransfer  = metodo_pago.toLowerCase().includes('transferencia');
  const itemsCalculados = [];

  for (const item of listaItems) {
    const { habitacion, fecha_entrada, fecha_salida, huespedes } = item;

    if (!habitacion || !fecha_entrada || !fecha_salida || !huespedes) {
      return res.status(400).json({ error: 'Cada habitación del carrito requiere habitacion, fecha_entrada, fecha_salida y huespedes' });
    }
    if (!HABITACIONES[habitacion]) {
      return res.status(400).json({ error: `Habitación "${habitacion}" no existe` });
    }

    const entrada = new Date(fecha_entrada);
    const salida  = new Date(fecha_salida);
    if (isNaN(entrada) || isNaN(salida) || salida <= entrada) {
      return res.status(400).json({ error: `Fechas no válidas para la habitación ${habitacion}` });
    }

    const numHuespedes = parseInt(huespedes, 10);
    if (numHuespedes < 1 || numHuespedes > HABITACIONES[habitacion].capacidad) {
      return res.status(400).json({
        error: `La habitación ${habitacion} acepta máximo ${HABITACIONES[habitacion].capacidad} huéspedes`,
      });
    }

    const conflicto = db.prepare(`
      SELECT id FROM reservas
      WHERE habitacion = ?
        AND estado NOT IN ('cancelada', 'pendiente_pago')
        AND fecha_entrada < ?
        AND fecha_salida  > ?
    `).get(habitacion, fecha_salida, fecha_entrada);

    if (conflicto) {
      return res.status(409).json({ error: `La habitación ${habitacion} no está disponible para las fechas seleccionadas` });
    }

    const { noches, subtotal, iva, total } = calcularTotal(numHuespedes, fecha_entrada, fecha_salida, esTransfer);
    itemsCalculados.push({ habitacion, fecha_entrada, fecha_salida, huespedes: numHuespedes, noches, subtotal, iva, total });
  }

  const subtotalGrupo = itemsCalculados.reduce((s, i) => s + i.subtotal, 0);
  const ivaGrupo       = parseFloat(itemsCalculados.reduce((s, i) => s + i.iva, 0).toFixed(2));
  const totalGrupo     = parseFloat(itemsCalculados.reduce((s, i) => s + i.total, 0).toFixed(2));
  const noches         = Math.max(...itemsCalculados.map(i => i.noches));

  const grupoCodigo        = generarCodigo(db);
  const archivoComprobante = req.file ? req.file.filename : null;
  const aceptaMkt = (acepta_marketing === 'true' || acepta_marketing === '1' || acepta_marketing === true) ? 1 : 0;

  // ── Guardar todas las reservas del grupo como pendiente_pago ─────────────
  try {
    const insertarGrupo = db.transaction((filas) => {
      filas.forEach((item, i) => {
        const codigo = filas.length === 1 ? grupoCodigo : `${grupoCodigo}-${i + 1}`;
        db.prepare(`
          INSERT INTO reservas
            (codigo, habitacion, fecha_entrada, fecha_salida, noches, huespedes,
             nombre, apellido, cedula, telefono, pais, correo, metodo_pago,
             subtotal, iva, total, mensaje_anfitrion, comprobante_pago, estado,
             acepta_marketing, grupo_id)
          VALUES
            (@codigo, @habitacion, @fecha_entrada, @fecha_salida, @noches, @huespedes,
             @nombre, @apellido, @cedula, @telefono, @pais, @correo, @metodo_pago,
             @subtotal, @iva, @total, @mensaje_anfitrion, @comprobante_pago, @estado,
             @acepta_marketing, @grupo_id)
        `).run({
          codigo, habitacion: item.habitacion, fecha_entrada: item.fecha_entrada,
          fecha_salida: item.fecha_salida, noches: item.noches, huespedes: item.huespedes,
          nombre, apellido, cedula, telefono, pais, correo, metodo_pago,
          subtotal: item.subtotal, iva: item.iva, total: item.total,
          mensaje_anfitrion: mensaje_anfitrion || null,
          comprobante_pago:  archivoComprobante || null,
          estado:            'pendiente_pago',
          acepta_marketing:  aceptaMkt,
          grupo_id:          grupoCodigo,
        });
      });
    });
    insertarGrupo(itemsCalculados);
  } catch (err) {
    console.error('[Reserva grupo] Error guardando:', err);
    return res.status(500).json({ error: 'Error interno al guardar el carrito de reservas' });
  }

  if (esPayPhone) {
    try {
      const respuesta = await payphone.iniciarCobro({
        phoneNumber:         telefono,
        totalCentavos:       payphone.aCentavos(totalGrupo),
        subtotalCentavos:    payphone.aCentavos(subtotalGrupo),
        ivaCentavos:         payphone.aCentavos(ivaGrupo),
        clientTransactionId: grupoCodigo,
        reference:           `Reserva ${grupoCodigo} — Estación del Sol (${itemsCalculados.length} habitaciones)`,
        correoCliente:       correo,
        nombreCliente:       nombre,
        apellidoCliente:     apellido,
      });

      console.log(`[PayPhone] Cobro de grupo iniciado para ${grupoCodigo}:`, JSON.stringify(respuesta));

      return res.status(201).json({
        codigo: grupoCodigo, estado: 'pendiente_pago',
        mensaje: 'Revisa tu app PayPhone para aprobar el pago.',
        total: totalGrupo, noches,
      });
    } catch (err) {
      console.error('[PayPhone] Error iniciando cobro de grupo:', err.message);
      db.prepare('UPDATE reservas SET estado = ? WHERE grupo_id = ?').run('error_pago', grupoCodigo);
      return res.status(502).json({
        error: 'No se pudo iniciar el cobro con PayPhone. Intenta de nuevo o contacta al hotel.',
        codigo: grupoCodigo,
      });
    }
  }

  if (esTransfer) {
    db.prepare('UPDATE reservas SET estado = ? WHERE grupo_id = ?').run('pendiente_confirmacion', grupoCodigo);
    const reservasGrupo = db.prepare('SELECT * FROM reservas WHERE grupo_id = ?').all(grupoCodigo);

    const rutaComprobante = archivoComprobante
      ? path.join(__dirname, '../uploads/comprobantes', archivoComprobante)
      : null;

    reservasGrupo.forEach(r => {
      email.enviarConfirmacionHuesped(r).catch(e => console.error('[Email]', e.message));
      email.enviarNotificacionHotel(r, rutaComprobante).catch(e => console.error('[Email hotel]', e.message));
      whatsapp.enviarWhatsApp(whatsapp.mensajeNuevaReserva({ ...r })).catch(e => console.error('[WA]', e.message));
    });

    return res.status(201).json({
      codigo: grupoCodigo, estado: 'pendiente_confirmacion',
      mensaje: 'Reserva recibida. El hotel verificará tu comprobante y confirmará.',
      total: totalGrupo, noches,
    });
  }

  return res.status(201).json({
    codigo: grupoCodigo, estado: 'pendiente_pago',
    mensaje: '¡Reserva registrada! El hotel te contactará para coordinar el pago.',
    total: totalGrupo, noches,
  });
});

// ── GET /api/reservas/:codigo/estado — polling del frontend ───────────────────
// Acepta tanto el código de una reserva individual como el de un grupo (carrito).
router.get('/:codigo/estado', (req, res) => {
  const db     = req.app.get('db');
  const codigo = req.params.codigo.toUpperCase();

  const filas = db.prepare(`
    SELECT codigo, estado, habitacion, fecha_entrada, fecha_salida, noches, huespedes, total, nombre, grupo_id
    FROM reservas WHERE codigo = ? OR grupo_id = ?
    ORDER BY id
  `).all(codigo, codigo);

  if (!filas.length) return res.status(404).json({ error: 'Reserva no encontrada' });

  if (filas.length === 1) return res.json(filas[0]);

  // Grupo de varias habitaciones: agrega el estado y el total combinado.
  const estados      = filas.map(f => f.estado);
  const estadoGrupo  = estados.some(e => e === 'cancelada')  ? 'cancelada'
                      : estados.every(e => e === 'confirmada') ? 'confirmada'
                      : filas[0].estado;

  return res.json({
    codigo,
    estado:      estadoGrupo,
    nombre:      filas[0].nombre,
    habitaciones: filas.map(f => f.habitacion),
    total:       filas.reduce((suma, f) => suma + f.total, 0),
    reservas:    filas,
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

// ── GET /api/disponibilidad/ocupadas — rangos ya reservados de una habitación ─
router.get('/disponibilidad/ocupadas', (req, res) => {
  const db = req.app.get('db');
  const { habitacion } = req.query;

  if (!habitacion) {
    return res.status(400).json({ error: 'Parámetro requerido: habitacion' });
  }
  if (!HABITACIONES[habitacion]) {
    return res.status(400).json({ error: `Habitación "${habitacion}" no existe` });
  }

  const filas = db.prepare(`
    SELECT fecha_entrada, fecha_salida FROM reservas
    WHERE habitacion = ?
      AND estado NOT IN ('cancelada', 'pendiente_pago', 'error_pago')
      AND fecha_salida >= date('now')
    ORDER BY fecha_entrada
  `).all(habitacion);

  return res.json({ habitacion, rangos: filas });
});

module.exports = router;
