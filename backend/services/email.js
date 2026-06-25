/**
 * Servicio de correo — Nodemailer vía SMTP de Hostinger
 */

const nodemailer = require('nodemailer');

function crearTransporte() {
  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port:   Number(process.env.EMAIL_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

// ── Plantilla base HTML ────────────────────────────────────────────────────────
function plantillaBase(contenido) {
  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Georgia, serif; background: #FAF6F0; margin: 0; padding: 0; color: #2C3E50; }
      .sobre { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
      .cabecera { background: #1B4965; padding: 36px 40px; text-align: center; }
      .cabecera h1 { color: #FAF6F0; font-size: 1.6rem; font-weight: 300; margin: 0 0 4px; }
      .cabecera p  { color: #D4A574; font-size: 0.85rem; letter-spacing: 0.2em; text-transform: uppercase; margin: 0; }
      .cuerpo { padding: 36px 40px; }
      .cuerpo p { line-height: 1.7; margin-bottom: 1rem; }
      .caja-codigo { background: #F4ECDE; border-radius: 6px; padding: 20px; text-align: center; margin: 24px 0; }
      .caja-codigo .codigo { font-size: 1.6rem; color: #1B4965; letter-spacing: 0.2em; font-weight: 600; }
      .tabla { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .tabla td { padding: 10px 0; border-bottom: 1px solid #E8D5B7; font-size: 0.95rem; }
      .tabla td:last-child { text-align: right; font-weight: 600; color: #1B4965; }
      .total-fila td { border-bottom: none; font-size: 1.1rem; color: #1B4965; font-weight: 700; }
      .pie { background: #2C3E50; padding: 24px 40px; text-align: center; color: rgba(250,246,240,0.6); font-size: 0.8rem; }
      .pie a { color: #D4A574; text-decoration: none; }
      .btn { display: inline-block; background: #1B4965; color: #FAF6F0 !important; padding: 14px 28px; border-radius: 100px; text-decoration: none; font-size: 0.85rem; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 16px; }
    </style>
  </head>
  <body>
    <div class="sobre">
      <div class="cabecera">
        <h1>Estación del Sol</h1>
        <p>· Las Núñez · Santa Elena, Ecuador ·</p>
      </div>
      <div class="cuerpo">${contenido}</div>
      <div class="pie">
        <a href="https://wa.me/593963750763">WhatsApp +593 96 375 0763</a> ·
        <a href="mailto:Andres.pachay@gmail.com">Andres.pachay@gmail.com</a><br>
        Las Núñez · Santa Elena · Ruta del Spondylus, Ecuador
      </div>
    </div>
  </body>
  </html>`;
}

// ── Correo de confirmación al huésped ─────────────────────────────────────────
async function enviarConfirmacionHuesped(reserva) {
  const transporte = crearTransporte();

  const contenido = `
    <p>Hola <strong>${reserva.nombre}</strong>,</p>
    <p>¡Tu reserva en Estación del Sol está confirmada! Te esperamos con las puertas abiertas.</p>

    <div class="caja-codigo">
      <div style="font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;color:#5A6C7D;margin-bottom:8px;">Código de reserva</div>
      <div class="codigo">${reserva.codigo}</div>
      <div style="font-size:0.8rem;color:#5A6C7D;margin-top:8px;">Guarda este código para tu check-in</div>
    </div>

    <table class="tabla">
      <tr><td>Habitación</td><td>${reserva.habitacion}</td></tr>
      <tr><td>Llegada</td><td>${formatearFecha(reserva.fecha_entrada)}</td></tr>
      <tr><td>Salida</td><td>${formatearFecha(reserva.fecha_salida)}</td></tr>
      <tr><td>Noches</td><td>${reserva.noches}</td></tr>
      <tr><td>Huéspedes</td><td>${reserva.huespedes}</td></tr>
      <tr><td>Subtotal</td><td>$${reserva.subtotal.toFixed(2)}</td></tr>
      <tr><td>IVA (15%)</td><td>$${reserva.iva.toFixed(2)}</td></tr>
      <tr class="total-fila"><td>Total</td><td>$${reserva.total.toFixed(2)}</td></tr>
    </table>

    <p>Para hacer tu check-in en línea y agilizar tu llegada, puedes hacerlo desde:</p>
    <a href="${process.env.FRONTEND_URL}/checkin.html?codigo=${reserva.codigo}" class="btn">
      Hacer check-in en línea
    </a>

    <p style="margin-top:24px;font-size:0.9rem;color:#5A6C7D;">
      ¿Tienes preguntas? Escríbenos al
      <a href="https://wa.me/593963750763" style="color:#D4A574;">+593 96 375 0763</a>
      o a este correo. Con gusto te ayudamos.
    </p>`;

  await transporte.sendMail({
    from: `"Estación del Sol" <${process.env.EMAIL_USER}>`,
    to: reserva.correo,
    subject: `✔ Reserva confirmada ${reserva.codigo} — Estación del Sol`,
    html: plantillaBase(contenido),
  });
}

// ── Notificación interna al hotel ─────────────────────────────────────────────
async function enviarNotificacionHotel(reserva, rutaComprobante = null) {
  const transporte = crearTransporte();

  const filaComprobante = reserva.comprobante_pago
    ? `<tr><td>Comprobante</td><td style="color:#27ae60;font-weight:600;">✔ Adjunto en este correo</td></tr>`
    : `<tr><td>Comprobante</td><td style="color:#e67e22;">Pendiente de envío</td></tr>`;

  const contenido = `
    <p><strong>Nueva reserva recibida.</strong></p>
    <table class="tabla">
      <tr><td>Código</td><td>${reserva.codigo}</td></tr>
      <tr><td>Huésped</td><td>${reserva.nombre} ${reserva.apellido}</td></tr>
      <tr><td>Cédula / Pasaporte</td><td>${reserva.cedula}</td></tr>
      <tr><td>Correo</td><td>${reserva.correo}</td></tr>
      <tr><td>Teléfono</td><td>${reserva.telefono}</td></tr>
      <tr><td>País</td><td>${reserva.pais}</td></tr>
      <tr><td>Habitación</td><td>${reserva.habitacion}</td></tr>
      <tr><td>Llegada</td><td>${formatearFecha(reserva.fecha_entrada)}</td></tr>
      <tr><td>Salida</td><td>${formatearFecha(reserva.fecha_salida)}</td></tr>
      <tr><td>Noches</td><td>${reserva.noches}</td></tr>
      <tr><td>Huéspedes</td><td>${reserva.huespedes}</td></tr>
      <tr><td>Método de pago</td><td>${reserva.metodo_pago}</td></tr>
      ${filaComprobante}
      <tr class="total-fila"><td>Total</td><td>$${reserva.total.toFixed(2)}</td></tr>
    </table>
    ${reserva.mensaje_anfitrion ? `<p><strong>Mensaje del huésped:</strong> ${reserva.mensaje_anfitrion}</p>` : ''}`;

  const adjuntos = [];
  if (rutaComprobante) {
    adjuntos.push({
      path: rutaComprobante,
      filename: `comprobante-${reserva.codigo}${require('path').extname(rutaComprobante)}`,
    });
  }

  await transporte.sendMail({
    from: `"Estación del Sol Sistema" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `🏨 Nueva reserva ${reserva.codigo} — ${reserva.nombre} ${reserva.apellido}`,
    html: plantillaBase(contenido),
    attachments: adjuntos,
  });
}

// ── Confirmación de check-in al huésped ───────────────────────────────────────
async function enviarConfirmacionCheckin(checkin, reserva) {
  const transporte = crearTransporte();

  const contenido = `
    <p>Hola <strong>${checkin.nombre}</strong>,</p>
    <p>Tu check-in para la reserva <strong>${checkin.codigo_reserva}</strong> ha sido recibido. ¡Ya tienes todo listo para llegar!</p>

    <table class="tabla">
      <tr><td>Habitación</td><td>${reserva.habitacion}</td></tr>
      <tr><td>Llegada</td><td>${formatearFecha(reserva.fecha_entrada)}</td></tr>
      <tr><td>Hora estimada</td><td>${checkin.hora_llegada}</td></tr>
      <tr><td>Personas</td><td>${checkin.personas}</td></tr>
    </table>

    ${checkin.solicitudes ? `<p><strong>Solicitudes registradas:</strong> ${checkin.solicitudes}</p>` : ''}

    <p>El anfitrión ya tiene tu información. Si necesitas algo antes de llegar, escríbenos.</p>
    <a href="https://wa.me/593963750763" class="btn">Contactar por WhatsApp</a>`;

  await transporte.sendMail({
    from: `"Estación del Sol" <${process.env.EMAIL_USER}>`,
    to: reserva.correo,
    subject: `☀ Check-in recibido ${checkin.codigo_reserva} — Estación del Sol`,
    html: plantillaBase(contenido),
  });
}

// ── Correo de contacto al hotel ───────────────────────────────────────────────
async function enviarMensajeContacto({ nombre, correo, mensaje }) {
  const transporte = crearTransporte();

  await transporte.sendMail({
    from: `"Estación del Sol Sistema" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    replyTo: correo,
    subject: `📩 Mensaje de contacto de ${nombre}`,
    html: plantillaBase(`
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Correo:</strong> ${correo}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${mensaje}</p>
    `),
  });
}

// ── Utilidad de fecha ─────────────────────────────────────────────────────────
function formatearFecha(fecha) {
  const [año, mes, dia] = fecha.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${dia} ${meses[parseInt(mes, 10) - 1]} ${año}`;
}

module.exports = {
  enviarConfirmacionHuesped,
  enviarNotificacionHotel,
  enviarConfirmacionCheckin,
  enviarMensajeContacto,
};
