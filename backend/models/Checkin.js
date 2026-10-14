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
      direccion            TEXT    NOT NULL DEFAULT '',
      telefono             TEXT    NOT NULL DEFAULT '',
      contacto_emergencia  TEXT    NOT NULL DEFAULT '',
      hora_llegada         TEXT    NOT NULL,
      personas             INTEGER NOT NULL,
      solicitudes          TEXT,
      foto_cedula          TEXT,
      acepto_terminos      INTEGER NOT NULL DEFAULT 0,
      creado_en            TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Migración: recrear tabla sin FOREIGN KEY si aún la tiene ─────────────
  try {
    const fks = db.prepare(`PRAGMA foreign_key_list(checkins)`).all();
    if (fks.length > 0) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        BEGIN;
        ALTER TABLE checkins RENAME TO checkins_old;
        CREATE TABLE checkins (
          id                   INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo_reserva       TEXT    NOT NULL UNIQUE,
          nombre               TEXT    NOT NULL,
          apellido             TEXT    NOT NULL DEFAULT '',
          cedula               TEXT    NOT NULL,
          direccion            TEXT    NOT NULL DEFAULT '',
          telefono             TEXT    NOT NULL DEFAULT '',
          contacto_emergencia  TEXT    NOT NULL DEFAULT '',
          hora_llegada         TEXT    NOT NULL,
          personas             INTEGER NOT NULL,
          solicitudes          TEXT,
          foto_cedula          TEXT,
          acepto_terminos      INTEGER NOT NULL DEFAULT 0,
          creado_en            TEXT    NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO checkins SELECT * FROM checkins_old;
        DROP TABLE checkins_old;
        COMMIT;
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (e) {
    console.error('[Checkin] Migración FK:', e.message);
  }

  // ── Migración: agregar columnas nuevas si la tabla ya existía ────────────
  const columnas = db.prepare(`PRAGMA table_info(checkins)`).all().map(c => c.name);
  const nuevas = {
    apellido:            `ALTER TABLE checkins ADD COLUMN apellido TEXT NOT NULL DEFAULT ''`,
    acepto_terminos:     `ALTER TABLE checkins ADD COLUMN acepto_terminos INTEGER NOT NULL DEFAULT 0`,
    direccion:           `ALTER TABLE checkins ADD COLUMN direccion TEXT NOT NULL DEFAULT ''`,
    telefono:            `ALTER TABLE checkins ADD COLUMN telefono TEXT NOT NULL DEFAULT ''`,
    contacto_emergencia: `ALTER TABLE checkins ADD COLUMN contacto_emergencia TEXT NOT NULL DEFAULT ''`,
    correo:              `ALTER TABLE checkins ADD COLUMN correo TEXT`,
    fecha_salida:        `ALTER TABLE checkins ADD COLUMN fecha_salida TEXT`,
    recordatorio_enviado:`ALTER TABLE checkins ADD COLUMN recordatorio_enviado INTEGER NOT NULL DEFAULT 0`,
  };
  for (const [columna, sql] of Object.entries(nuevas)) {
    if (!columnas.includes(columna)) db.exec(sql);
  }
}

module.exports = { crearTablaCheckins };
