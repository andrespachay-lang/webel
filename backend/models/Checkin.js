/**
 * Modelo Checkin — tabla para check-in en línea
 */

function crearTablaCheckins(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_reserva       TEXT    NOT NULL UNIQUE,
      nombre               TEXT    NOT NULL,
      cedula               TEXT    NOT NULL,
      hora_llegada         TEXT    NOT NULL,
      personas             INTEGER NOT NULL,
      solicitudes          TEXT,
      foto_cedula          TEXT,
      creado_en            TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (codigo_reserva) REFERENCES reservas(codigo)
    )
  `);
}

module.exports = { crearTablaCheckins };
