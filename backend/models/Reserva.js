/**
 * Modelo Reserva — inicializa la tabla y expone métodos de acceso a datos
 */

// Habitaciones del hotel con capacidad máxima
const HABITACIONES = {
  A1: { capacidad: 5, vista: 'mar',      piso: 'Segundo piso' },
  B1: { capacidad: 3, vista: 'piscina',  piso: 'Primer piso alto' },
  B2: { capacidad: 5, vista: 'piscina',  piso: 'Primer piso alto' },
  B3: { capacidad: 3, vista: 'montaña',  piso: 'Distintos niveles' },
  B4: { capacidad: 3, vista: 'montaña',  piso: 'Distintos niveles' },
  B5: { capacidad: 4, vista: 'montaña',  piso: 'Distintos niveles' },
  B6: { capacidad: 4, vista: 'mar',      piso: 'Segundo piso' },
};

const PRECIO_POR_PERSONA_NOCHE = 20;  // USD
const IVA = 0.15;

function crearTablaReservas(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservas (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo           TEXT    NOT NULL UNIQUE,
      habitacion       TEXT    NOT NULL,
      fecha_entrada    TEXT    NOT NULL,
      fecha_salida     TEXT    NOT NULL,
      noches           INTEGER NOT NULL,
      huespedes        INTEGER NOT NULL,
      nombre           TEXT    NOT NULL,
      apellido         TEXT    NOT NULL,
      cedula           TEXT    NOT NULL,
      telefono         TEXT    NOT NULL,
      pais             TEXT    NOT NULL,
      correo           TEXT    NOT NULL,
      metodo_pago      TEXT    NOT NULL,
      subtotal         REAL    NOT NULL,
      iva              REAL    NOT NULL,
      total            REAL    NOT NULL,
      estado           TEXT    NOT NULL DEFAULT 'pendiente',
      mensaje_anfitrion TEXT,
      creado_en        TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

function generarCodigo(db) {
  const año = new Date().getFullYear();
  // Busca el último número usado este año
  const fila = db.prepare(
    `SELECT codigo FROM reservas WHERE codigo LIKE 'EDS-${año}-%' ORDER BY id DESC LIMIT 1`
  ).get();

  let siguiente = 1;
  if (fila) {
    const partes = fila.codigo.split('-');
    siguiente = parseInt(partes[2], 10) + 1;
  }
  return `EDS-${año}-${String(siguiente).padStart(4, '0')}`;
}

function calcularTotal(huespedes, fechaEntrada, fechaSalida) {
  const entrada = new Date(fechaEntrada);
  const salida  = new Date(fechaSalida);
  const noches  = Math.round((salida - entrada) / (1000 * 60 * 60 * 24));
  const subtotal = huespedes * noches * PRECIO_POR_PERSONA_NOCHE;
  const iva      = parseFloat((subtotal * IVA).toFixed(2));
  const total    = parseFloat((subtotal + iva).toFixed(2));
  return { noches, subtotal, iva, total };
}

module.exports = {
  HABITACIONES,
  PRECIO_POR_PERSONA_NOCHE,
  IVA,
  crearTablaReservas,
  generarCodigo,
  calcularTotal,
};
