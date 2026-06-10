/**
 * Servicio WhatsApp — CallMeBot (gratis, sin cuenta Twilio)
 *
 * Configuración:
 *   1. Agrega el número +34 644 47 93 97 a tus contactos de WhatsApp
 *   2. Envía el mensaje: "I allow callmebot to send me messages"
 *   3. Recibirás tu API key en respuesta
 *   4. Guárdala en CALLMEBOT_API_KEY en el .env
 */

const https = require('https');

function enviarWhatsApp(mensaje) {
  const apiKey  = process.env.CALLMEBOT_API_KEY;
  const telefono = process.env.HOTEL_WHATSAPP;

  if (!apiKey || !telefono) {
    console.warn('[WhatsApp] CALLMEBOT_API_KEY o HOTEL_WHATSAPP no configurados — omitiendo envío');
    return Promise.resolve();
  }

  const texto = encodeURIComponent(mensaje);
  const url   = `https://api.callmebot.com/whatsapp.php?phone=${telefono}&text=${texto}&apikey=${apiKey}`;

  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('[WhatsApp] Mensaje enviado');
          resolve(data);
        } else {
          console.error('[WhatsApp] Error HTTP', res.statusCode, data);
          reject(new Error(`WhatsApp HTTP ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

// ── Mensajes predefinidos ──────────────────────────────────────────────────────

function mensajeNuevaReserva(reserva) {
  return (
    `🏨 NUEVA RESERVA — Estación del Sol\n` +
    `Código: ${reserva.codigo}\n` +
    `Huésped: ${reserva.nombre} ${reserva.apellido}\n` +
    `Habitación: ${reserva.habitacion}\n` +
    `Llegada: ${reserva.fecha_entrada}\n` +
    `Salida: ${reserva.fecha_salida}\n` +
    `Huéspedes: ${reserva.huespedes}\n` +
    `Total: $${reserva.total}\n` +
    `Pago: ${reserva.metodo_pago}`
  );
}

function mensajeCheckin(checkin, reserva) {
  return (
    `☀ CHECK-IN EN LÍNEA\n` +
    `Código: ${checkin.codigo_reserva}\n` +
    `Huésped: ${checkin.nombre}\n` +
    `Habitación: ${reserva.habitacion}\n` +
    `Llegada estimada: ${checkin.hora_llegada}\n` +
    `Personas: ${checkin.personas}` +
    (checkin.solicitudes ? `\nSolicitudes: ${checkin.solicitudes}` : '')
  );
}

module.exports = {
  enviarWhatsApp,
  mensajeNuevaReserva,
  mensajeCheckin,
};
