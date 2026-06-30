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

  // Verificar que los datos bancarios estén configurados
  if (!process.env.BANCO_1_CUENTA || !process.env.BANCO_2_CUENTA) {
    console.error('[DatosBancarios] Variables de entorno BANCO_* no configuradas');
    return res.status(503).json({ error: 'Los datos bancarios no están configurados aún. Contacta al hotel.' });
  }

  try {
    await email.enviarDatosBancarios({ correo, nombre: nombre || 'huésped', total: total || 0, codigo });

    // Registrar el envío
    db.prepare(`
      INSERT INTO datos_bancarios_log (correo, codigo_reserva, enviado_en)
      VALUES (?, ?, datetime('now'))
    `).run(correo, codigo);

    return res.json({ ok: true, mensaje: 'Datos bancarios enviados a ' + correo });
  } catch (err) {
    console.error('[DatosBancarios] Error enviando correo:', err.message);
    return res.status(500).json({ error: 'No se pudo enviar el correo. Intenta de nuevo.' });
  }
});

module.exports = router;
