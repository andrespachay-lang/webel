/**
 * Middleware de autenticación para el panel de administración.
 * Usa una API key simple enviada en el header X-Admin-Key.
 */

function soloAdmin(req, res, next) {
  const clave = req.headers['x-admin-key'];

  if (!clave || clave !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  next();
}

module.exports = { soloAdmin };
