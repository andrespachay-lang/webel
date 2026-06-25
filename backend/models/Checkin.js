/**
 * Modelo Checkin — tabla para check-in en línea
 */

function crearTablaCheckins(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo_reserva       TEXT    NOT NULL UNIQUE,
      nombre               TEXT    NOT NULL,
      apellido             TEXT    NOT NULL DEFAULT '',
      cedula               TEXT    NOT NULL,
      hora_llegada         TEXT    NOT NULL,
      personas             INTEGER NOT NULL,
      solicitudes          TEXT,
      foto_cedula          TEXT,
      acepto_terminos      INTEGER NOT NULL DEFAULT 0,
      creado_en            TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (codigo_reserva) REFERENCES reservas(codigo)
    )
  `);

  // ── Migración: agregar columnas nuevas si la tabla ya existía ────────────
  const columnas = db.prepare(`PRAGMA table_info(checkins)`).all().map(c => c.name);
  if (!columnas.includes('apellido')) {
    db.exec(`ALTER TABLE checkins ADD COLUMN apellido TEXT NOT NULL DEFAULT ''`);
  }
  if (!columnas.includes('acepto_terminos')) {
    db.exec(`ALTER TABLE checkins ADD COLUMN acepto_terminos INTEGER NOT NULL DEFAULT 0`);
  }
}

module.exports = { crearTablaCheckins };
