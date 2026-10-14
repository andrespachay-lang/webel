/**
 * Servicio OCR para verificar cédulas ecuatorianas
 * Extrae fecha de nacimiento y verifica mayoría de edad
 */

const Tesseract = require('tesseract.js');

const EDAD_MINIMA = 18;

/**
 * Extrae texto de una imagen con OCR
 */
async function extraerTexto(rutaImagen) {
  const { data: { text } } = await Tesseract.recognize(rutaImagen, 'spa', {
    logger: () => {},
  });
  return text;
}

/**
 * Busca fecha de nacimiento en el texto de una cédula ecuatoriana.
 * Formatos comunes: 12/05/1990, 12 MAY 1990, 12-05-1990
 */
function extraerFechaNacimiento(texto) {
  const t = texto.toUpperCase();

  // Formato DD/MM/AAAA o DD-MM-AAAA
  const regexNumerico = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](19\d{2}|20\d{2})\b/g;
  // Formato DD MES AAAA (meses en español/abreviados)
  const meses = { ENE:1,FEB:2,MAR:3,ABR:4,MAY:5,JUN:6,JUL:7,AGO:8,SEP:9,OCT:10,NOV:11,DIC:12 };
  const regexTexto = /\b(\d{1,2})\s+(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|OCT|NOV|DIC)\s+(19\d{2}|20\d{2})\b/g;

  // Intentar formato numérico
  let match;
  const candidatos = [];

  while ((match = regexNumerico.exec(t)) !== null) {
    const dia = parseInt(match[1]);
    const mes = parseInt(match[2]);
    const anio = parseInt(match[3]);
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
      candidatos.push(new Date(anio, mes - 1, dia));
    }
  }

  // Intentar formato con mes en texto
  while ((match = regexTexto.exec(t)) !== null) {
    const dia = parseInt(match[1]);
    const mes = meses[match[2]];
    const anio = parseInt(match[3]);
    candidatos.push(new Date(anio, mes - 1, dia));
  }

  if (candidatos.length === 0) return null;

  // La fecha más antigua entre los candidatos es probablemente la de nacimiento
  candidatos.sort((a, b) => a - b);
  return candidatos[0];
}

/**
 * Calcula edad a partir de fecha de nacimiento
 */
function calcularEdad(fechaNac) {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const m = hoy.getMonth() - fechaNac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
  return edad;
}

/**
 * Verifica si la imagen es de una cédula de mayor de edad.
 * Retorna: { ok, edad, fechaNac, ilegible }
 */
async function verificarCedula(rutaImagen) {
  try {
    const texto = await extraerTexto(rutaImagen);
    const fechaNac = extraerFechaNacimiento(texto);

    if (!fechaNac) {
      return { ok: true, ilegible: true, edad: null, fechaNac: null };
    }

    const edad = calcularEdad(fechaNac);
    return {
      ok: edad >= EDAD_MINIMA,
      ilegible: false,
      edad,
      fechaNac,
    };
  } catch (err) {
    console.error('[OCR] Error:', err.message);
    return { ok: true, ilegible: true, edad: null, fechaNac: null };
  }
}

module.exports = { verificarCedula };
