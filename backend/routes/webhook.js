/**
 * Webhook de PayPhone
 *   POST /api/webhook/payphone?id=X&clientTransactionId=Y
 *
 * PayPhone llama a esta URL cuando el cliente aprueba o rechaza el pago.
 * Verificamos el estado con GET a la API de PayPhone y actualizamos la reserva.
 */

const express  = require('express');
const router   = express.Router();
const payphone = require('../services/payphone');
const email    = require('../services/email');
const whatsapp = require('../services/whatsapp');

router.post('/payphone', async (req, res) => {
  const db = req.app.get('db');

  // PayPhone envía id y clientTransactionId como query params
  const { id, clientTransactionId } = req.query;

  if (!id || !clientTransactionId) {
    console.warn('[Webhook] Faltan parámetros id o clientTransactionId');
    return res.status(400).send('Parámetros faltantes');
  }

  console.log(`[Webhook] Verificando pago — id: ${id} | clientTransactionId: ${clientTransactionId}`);

  let resultado;
  try {
    resultado = await payphone.verificarCobro(id);
  } catch (err) {
    console.error('[Webhook] Error verificando con PayPhone:', err.message);
    return res.status(500).send('Error verificando pago');
  }

  console.log('[Webhook] Respuesta PayPhone:', JSON.stringify(resultado));

  // El clientTransactionId que enviamos es el código de reserva, o el código
  // de grupo cuando el pago cubre varias habitaciones del carrito.
  const codigo = clientTransactionId;
  const reservasGrupo = db.prepare('SELECT * FROM reservas WHERE codigo = ? OR grupo_id = ?').all(codigo, codigo);

  if (!reservasGrupo.length) {
    console.warn(`[Webhook] Reserva no encontrada: ${codigo}`);
    return res.status(404).send('Reserva no encontrada');
  }

  // statusCode: 1=pendiente, 2=cancelado/rechazado, 3=aprobado
  const aprobado = resultado.transactionStatus === 'Approved' || resultado.statusCode === 3;
  const estadoPago = resultado.transactionStatus || String(resultado.statusCode || '');

  const nuevoEstado = aprobado ? 'confirmada' : 'cancelada';
  const payphoneId  = resultado.transactionId || id;

  db.prepare(`
    UPDATE reservas
    SET estado = ?, payphone_transaction_id = ?, payphone_status = ?
    WHERE codigo = ? OR grupo_id = ?
  `).run(nuevoEstado, payphoneId, estadoPago, codigo, codigo);

  if (aprobado) {
    console.log(`[Webhook] Reserva ${codigo} — PAGO APROBADO (${reservasGrupo.length} habitación${reservasGrupo.length > 1 ? 'es' : ''})`);
    reservasGrupo.forEach(reserva => {
      email.enviarConfirmacionHuesped(reserva).catch(e => console.error('[Email]', e.message));
      email.enviarNotificacionHotel(reserva, null).catch(e => console.error('[Email hotel]', e.message));
      whatsapp.enviarWhatsApp(whatsapp.mensajeNuevaReserva({ ...reserva, estado: 'confirmada' }))
        .catch(e => console.error('[WA]', e.message));
    });
  } else {
    console.log(`[Webhook] Reserva ${codigo} — pago ${estadoPago}`);
  }

  // PayPhone espera un 200 para saber que recibimos el callback
  return res.status(200).send('OK');
});

module.exports = router;
