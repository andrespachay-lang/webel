/**
 * Servicio PayPhone — API Sale
 * Docs: https://docs.payphone.app/api-sale
 *
 * Flujo:
 *   1. POST /api/Sale  → PayPhone notifica al cliente en su app
 *   2. Cliente aprueba en la app PayPhone
 *   3. PayPhone llama a nuestro responseUrl con ?id=X&clientTransactionId=Y
 *   4. Verificamos el estado con GET /api/Sale?id=X&clientTransactionId=Y
 */

const https = require('https');

const PAYPHONE_URL   = 'https://pay.payphonetodoesposible.com/api/Sale';
const PAYPHONE_CHECK = 'https://pay.payphonetodoesposible.com/api/Sale';

// ── Solicitar cobro al cliente ────────────────────────────────────────────────
async function iniciarCobro({
  phoneNumber,         // teléfono del cliente registrado en PayPhone (ej: 0984111222)
  totalCentavos,       // amount total en centavos (ya con IVA)
  subtotalCentavos,    // amountWithTax en centavos (base imponible)
  ivaCentavos,         // tax en centavos (15% de subtotal)
  clientTransactionId, // ID único nuestra → código de reserva
  reference,           // descripción legible
  correoCliente,
  nombreCliente,
  apellidoCliente,
}) {
  const token   = process.env.PAYPHONE_TOKEN;
  const storeId = process.env.PAYPHONE_STORE_ID;
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!token || !storeId) {
    throw new Error('PAYPHONE_TOKEN y PAYPHONE_STORE_ID son obligatorios en .env');
  }

  // El teléfono debe tener solo dígitos, sin + ni espacios
  const telefonoLimpio = phoneNumber.replace(/\D/g, '').replace(/^593/, '0');

  const cuerpo = {
    phoneNumber:         telefonoLimpio,
    countryCode:         '593',
    amount:              totalCentavos,       // amountWithTax + tax
    amountWithoutTax:    0,                   // todo tiene IVA en el hotel
    amountWithTax:       subtotalCentavos,    // base imponible
    tax:                 ivaCentavos,         // 15% IVA
    service:             0,
    tip:                 0,
    currency:            'USD',
    clientTransactionId: clientTransactionId,
    storeId:             storeId,
    reference:           reference,
    responseUrl:         `${baseUrl}/api/webhook/payphone`,
    timeZone:            -5,
    optionalParameter1:  correoCliente || '',
    order: {
      billTo: {
        firstName:   nombreCliente   || '',
        lastName:    apellidoCliente || '',
        email:       correoCliente   || '',
        phoneNumber: `+593${telefonoLimpio.replace(/^0/, '')}`,
        country:     'EC',
        state:       'Santa Elena',
        locality:    'Las Núñez',
      },
      lineItems: [
        {
          productName:        reference,
          unitPrice:          subtotalCentavos,
          quantity:           1,
          totalAmount:        subtotalCentavos,
          taxAmount:          ivaCentavos,
          productSKU:         clientTransactionId,
          productDescription: 'Alojamiento Estación del Sol',
        },
      ],
    },
  };

  return llamarPayphone('POST', PAYPHONE_URL, token, cuerpo);
}

// ── Verificar estado de un cobro ──────────────────────────────────────────────
async function verificarCobro(id, clientTransactionId) {
  const token = process.env.PAYPHONE_TOKEN;
  const url   = `${PAYPHONE_CHECK}?id=${encodeURIComponent(id)}&clientTransactionId=${encodeURIComponent(clientTransactionId)}`;
  return llamarPayphone('GET', url, token, null);
}

// ── Cliente HTTP genérico ─────────────────────────────────────────────────────
function llamarPayphone(metodo, url, token, cuerpo) {
  return new Promise((resolve, reject) => {
    const bodyStr = cuerpo ? JSON.stringify(cuerpo) : null;
    const urlObj  = new URL(url);

    const opciones = {
      hostname: urlObj.hostname,
      path:     urlObj.pathname + urlObj.search,
      method:   metodo,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };

    const req = https.request(opciones, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`PayPhone HTTP ${res.statusCode}: ${JSON.stringify(json)}`));
          }
        } catch {
          reject(new Error(`PayPhone respuesta no-JSON (${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Convierte dólares a centavos (entero) ─────────────────────────────────────
function aCentavos(dolares) {
  return Math.round(parseFloat(dolares) * 100);
}

module.exports = { iniciarCobro, verificarCobro, aCentavos };
