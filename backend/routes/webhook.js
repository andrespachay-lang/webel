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

  // El clientTransactionId que enviamos es el código de reserva
  const codigo  = clientTransactionId;
  const reserva = db.prepare('SELECT * FROM reservas WHERE codigo = ?').get(codigo);

  if (!reserva) {
    console.warn(`[Webhook] Reserva no encontrada: ${codigo}`);
    return res.status(404).send('Reserva no encontrada');
  }

  // Estados de PayPhone: Approved, Cancelled, Rejected, etc.
  const estadoPago = resultado.transactionStatus || resultado.statusCode || '';
  const aprobado   = estadoPago === 'Approved' || estadoPago === '1';

  const nuevoEstado = aprobado ? 'confirmada' : 'cancelada';
  const payphoneId  = resultado.transactionId || id;

  db.prepare(`
    UPDATE reservas
    SET estado = ?, payphone_transaction_id = ?, payphone_status = ?
    WHERE codigo = ?
  `).run(nuevoEstado, payphoneId, estadoPago, codigo);

  if (aprobado) {
    console.log(`[Webhook] Reserva ${codigo} — PAGO APROBADO`);
    email.enviarConfirmacionHuesped(reserva).catch(e => console.error('[Email]', e.message));
    email.enviarNotificacionHotel(reserva, null).catch(e => console.error('[Email hotel]', e.message));
    whatsapp.enviarWhatsApp(whatsapp.mensajeNuevaReserva({ ...reserva, estado: 'confirmada' }))
      .catch(e => console.error('[WA]', e.message));
  } else {
    console.log(`[Webhook] Reserva ${codigo} — pago ${estadoPago}`);
  }

  // PayPhone espera un 200 para saber que recibimos el callback
  return res.status(200).send('OK');
});

module.exports = router;
