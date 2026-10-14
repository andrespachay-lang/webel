/**
 * Scheduler de recordatorios de checkout
 * Corre cada 5 minutos; a las 10:00 envía correo a huéspedes que salen hoy
 */

const email = require('./email');

const HORA_RECORDATORIO = 10; // 10:00 am = 1 hora antes del checkout (11:00)
const MINUTO_RECORDATORIO = 0;

function iniciarRecordatorios(db) {
  setInterval(() => verificarYEnviar(db), 5 * 60 * 1000);
  console.log('[Recordatorio] Scheduler de checkout iniciado');
}

async function verificarYEnviar(db) {
  const ahora = new Date();
  if (ahora.getHours() !== HORA_RECORDATORIO || ahora.getMinutes() > 10) return;

  const hoy = ahora.toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const pendientes = db.prepare(`
      SELECT * FROM checkins
      WHERE fecha_salida = ?
        AND correo IS NOT NULL
        AND correo != ''
        AND recordatorio_enviado = 0
    `).all(hoy);

    for (const checkin of pendientes) {
      try {
        await email.enviarRecordatorioCheckout(checkin);
        db.prepare(`UPDATE checkins SET recordatorio_enviado = 1 WHERE id = ?`).run(checkin.id);
        console.log(`[Recordatorio] Enviado a ${checkin.correo} (${checkin.nombre} ${checkin.apellido})`);
      } catch (err) {
        console.error(`[Recordatorio] Error enviando a ${checkin.correo}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Recordatorio] Error consultando checkins:', err.message);
  }
}

module.exports = { iniciarRecordatorios };
