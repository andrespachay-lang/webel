/**
 * POST /api/enviar-datos-bancarios
 * Envía los datos bancarios por correo al huésped y registra el envío en la DB.
 */

const express = require('express');
const router  = express.Router();
const email   = require('../services/email');

router.post('/', async (req, res) => {
  const db = req.app.get('db');
  const { correo, nombre, total, codigo } = req.body;

  if (!correo) return res.status(400).json({ error: 'El campo "correo" es obligatorio' });
  if (!codigo) return res.status(400).json({ error: 'El campo "codigo" es obligatorio' });

  // Validación estricta: este endpoint envía un correo desde nuestro dominio,
  // así que no debe aceptar texto libre ni direcciones mal formadas.
  const correoLimpio = String(correo).trim();
  if (correoLimpio.length > 120 || !/^[^\s@<>",;]+@[^\s@<>",;]+\.[a-zA-Z]{2,}$/.test(correoLimpio)) {
    return res.status(400).json({ error: 'El correo no es válido' });
  }
  const nombreLimpio = String(nombre || 'huésped').replace(/[<>&"'`\r\n]/g, '').replace(/https?:\S+|www\.\S+/gi, '').trim().slice(0, 60) || 'huésped';
  const codigoLimpio = String(codigo).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  if (!codigoLimpio) return res.status(400).json({ error: 'El código no es válido' });
  const totalLimpio = Number(total);
  if (!Number.isFinite(totalLimpio) || totalLimpio < 0 || totalLimpio > 20000) {
    return res.status(400).json({ error: 'El total no es válido' });
  }

  // Máximo 3 envíos al mismo correo por día
  const enviosHoy = db.prepare(`
    SELECT COUNT(*) AS n FROM datos_bancarios_log
    WHERE correo = ? AND enviado_en >= datetime('now', '-1 day')
  `).get(correoLimpio).n;
  if (enviosHoy >= 3) {
    return res.status(429).json({ error: 'Ya enviamos los datos a ese correo. Revisa tu bandeja o escríbenos por WhatsApp.' });
  }

  // Verificar que los datos bancarios estén configurados
  if (!process.env.BANCO_1_CUENTA || !process.env.BANCO_2_CUENTA) {
    console.error('[DatosBancarios] Variables de entorno BANCO_* no configuradas');
    return res.status(503).json({ error: 'Los datos bancarios no están configurados aún. Contacta al hotel.' });
  }

  try {
    await email.enviarDatosBancarios({ correo: correoLimpio, nombre: nombreLimpio, total: totalLimpio, codigo: codigoLimpio });

    // Registrar el envío
    db.prepare(`
      INSERT INTO datos_bancarios_log (correo, codigo_reserva, enviado_en)
      VALUES (?, ?, datetime('now'))
    `).run(correoLimpio, codigoLimpio);

    return res.json({ ok: true, mensaje: 'Datos bancarios enviados a ' + correoLimpio });
  } catch (err) {
    console.error('[DatosBancarios] Error enviando correo:', err.message);
    return res.status(500).json({ error: 'No se pudo enviar el correo. Intenta de nuevo.' });
  }
});

module.exports = router;
