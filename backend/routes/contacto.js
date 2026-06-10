/**
 * Ruta de contacto
 *   POST /api/contacto — envía mensaje al hotel y confirma recepción al remitente
 */

const express = require('express');
const router  = express.Router();
const email   = require('../services/email');

router.post('/', async (req, res) => {
  const { nombre, correo, mensaje } = req.body;

  if (!nombre || !correo || !mensaje) {
    return res.status(400).json({ error: 'Los campos nombre, correo y mensaje son obligatorios' });
  }

  // Validación básica de correo
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return res.status(400).json({ error: 'El correo no tiene un formato válido' });
  }

  try {
    await email.enviarMensajeContacto({ nombre, correo, mensaje });
    return res.json({ mensaje: '¡Mensaje recibido! Te respondemos pronto.' });
  } catch (err) {
    console.error('[Contacto] Error enviando correo:', err.message);
    return res.status(500).json({ error: 'No se pudo enviar el mensaje. Intenta por WhatsApp.' });
  }
});

module.exports = router;
