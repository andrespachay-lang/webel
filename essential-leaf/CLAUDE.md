# Essential Leaf · Contenido diario de Instagram

Essential Leaf ("Botanical Beauty") es una marca ecuatoriana de cosmética botánica de Piñas, El Oro,
fundada en 2019 por Diana y José Miguel, químicos farmacéuticos. Instagram: @essentialleaf.ec.
Web: essentialeaf.com.ec. Voz: humana, cercana, cálida, frases cortas; se habla de aroma, ritual,
sensación y cuidado diario.

## Reglas de contenido (obligatorias, nunca se rompen)
- **Sin promesas médicas ni terapéuticas.** Nada de "alivia", "cura", "analgésico",
  "antiinflamatorio", "antiséptico", "regenera", "reduce el estrés/cortisol", "mejora la memoria",
  "elimina hongos", "despigmenta", etc. El catálogo 2026 trae frases así: **no se copian**.
- **Aceites esenciales siempre diluidos** (en crema, roll-on o aceite base). Nunca "directo en la
  piel", nunca uso oral/ingesta, aunque el catálogo lo diga.
- Solo ingredientes que estén en la etiqueta (ver tabla de productos abajo).
- **Precios permitidos, únicamente:** aceite esencial $8,20 · roll-ons $8,20 · cremas $12,31 ·
  Mist para pies $7 · Foot Care $8. Ningún otro precio.
- Las cremas "Amor Después del Amor" y "Lugar Perfecto" ya no se venden: no aparecen.
- Nada que compare o enfrente la venta en tienda con la venta en línea.
- CTA: "Escríbenos". **Nunca** poner número de teléfono.
- No usar fotos de un lugar real distinto presentándolas como Piñas/Ecuador.
- Tendencias: se adaptan al tono de la marca. Nada de memes ajenos, música, marcas de terceros,
  personas reales, polémica, política ni tragedias. Si una tendencia no encaja, se descarta.

## Productos (solo estos tienen foto recortada en `assets/productos/`)
| Archivo | Nombre en el post | Ingredientes/detalle permitido |
|---|---|---|
| aceite_esencial_lavanda | Aceite esencial de Lavanda | 100% puro · 5 ml · se usa diluido |
| crema_serenidad | Crema Serenidad | Lavanda · Menta · base de aceite de oliva |
| crema_dinamia | Crema Dinamia | Mandarina · Lavanda · Lemongrass |
| crema_hierba_luisa | Crema Hierba Luisa | Lemongrass · Eucalipto · Mandarina |
| roll_on_conexion | Roll-on Conexión | Lavanda · Menta · 10 ml |
| roll_on_espiritu_citrico | Roll-on Espíritu Cítrico | Bergamota · Lavanda · 10 ml |
| roll_on_turu_fresculia | Roll-on Tuta Fresculla | Menta · Eucalipto · Romero · Lavanda · 10 ml |
| mist_para_pies | Mist para pies | Salvia · Menta · Árbol de té · Té verde |
| foot_care | Foot Care | Árnica · Menta · Árbol de té · Té verde |
| desodorante_aclarante | Desodorante Aclarante | con té verde |
| desodorante_antimanchas_geranio_cedron | Desodorante Geranio & Cedrón | — |
| desodorante_antimanchas_sandalo_vainilla | Desodorante Sándalo & Vainilla | — |
| caja_de_regalo | Caja de regalo | "Escríbenos" |

Base de los desodorantes (etiqueta): alumbre de potasio, árbol de té, aloe vera, glicerina.
Aceites esenciales del catálogo (se pueden nombrar como aromas): lavanda, menta, eucalipto,
árbol de té, romero, lemongrass, orégano, bergamota, limón, naranja, mandarina.
Otros productos del catálogo (brumas, jabón líquido, aceites faciales, línea capilar, tónicos,
desodorantes spray, repelente) **no** tienen foto ni precio aprobado: no se muestran.

**Nunca generar un producto con IA.** Siempre la foto recortada real.

## Estilo visual (serie 61-100, el que se usa ahora)
- Foto a sangre con velo oscuro, verdes profundos y marrones cálidos, grano.
- Encabezado de 3 columnas: sección · logo pequeño · @essentialleaf.ec.
- Montserrat fina en mayúsculas espaciadas + Alegreya/Alegreya SC en cursiva como acento.
- Esquemas de línea fina: lista con flechas, Venn, infinito, anillo, camino, línea vertical,
  pregunta, texto, portada, producto.
- Paleta: #2D3220, #4A5530, #B8A05A / #D9C27A, #F4F0E1, lavanda #7E62B0.
- **No** usar "pastillas"/badges redondeados tipo interfaz (se ven artificiales). **No** contadores
  tipo "3 de 10". Slides limpios.
- Los textos deben poder leerse: si la foto es clara, subir `op` (velo) a .5–.65.
- Cielos y aguas azules se llevan a oliva con `"tintar": {"archivo": 0.6}` en el plan.

## Fotos
- Solo stock **gratuito y sin IA** de Magnific/Freepik (`stock_search` con `license: "free"`,
  `ai_generated: "excluded"`). Las descargas gratuitas cuestan 0 créditos (verificado con
  `account_balance`). **No usar generación de imágenes pagada.**
- Descargar a una carpeta temporal fuera del repo, luego `python gradear.py CARPETA` (aplica el
  tratamiento y escribe en `assets/stock/NOMBRE.jpg`). Nombrar las fotos nuevas `d_AAAAMMDD_tema`.
- Las fotos ya existentes en `assets/stock/` se pueden reutilizar si no se usaron en los últimos 30
  días (ver `registro.md`).

## Herramientas del repo
- `motor.py dias/AAAA-MM-DD` → lee `plan.json` y genera los HTML. Ver `plan_ejemplo.json` para el
  formato y los argumentos de cada tipo (portada, lista, venn, infinito, anillo, camino, vertical,
  pregunta, texto, producto). Las firmas exactas están en `motor.py`.
- `render_dia.py dias/AAAA-MM-DD [NN ...]` → `posts/NN_nombre.jpg` (1080×1350) + `revision.jpg`.
- Playwright usa el Chromium de `/opt/pw-browsers/chromium`. Si falta: `pip install playwright pillow numpy`.

## Procedimiento diario (rutina automática)
1. Fecha de hoy en Ecuador (America/Guayaquil) = AAAA-MM-DD. Crear `dias/AAAA-MM-DD/`.
2. **Investigar tendencias** (WebSearch): tendencias actuales en Instagram de bienestar, cuidado
   personal, cosmética natural/botánica, aromaterapia, slow living, y fechas o temas de la semana en
   Ecuador/Latinoamérica (feriados, estación, días internacionales relevantes). Elegir 3–5 que
   encajen con las reglas. Anotar fuentes.
3. Leer `registro.md` y no repetir temas/fotos de los últimos 30 días.
4. Planificar **12 piezas**: variar tipos (máx. 2 del mismo tipo), al menos 2 de producto, 2 de
   pregunta/interacción y 1 de origen/historia; alternar fotos claras y oscuras.
5. Buscar y descargar fotos gratuitas sin IA, gradearlas.
6. Escribir `dias/AAAA-MM-DD/plan.json` (cada pieza con `tipo`, `nombre`, `args`, `caption`,
   `hashtags`). Captions humanos, 1–3 frases + CTA cuando aplique.
7. `python motor.py dias/AAAA-MM-DD && python render_dia.py dias/AAAA-MM-DD`.
8. **Revisar `revision.jpg` y cada post** (Read): texto legible, nada se monta ni se corta, producto
   bien colocado, sin azules fuera de paleta, reglas de contenido cumplidas. Corregir y volver a
   renderizar las piezas afectadas.
9. Escribir `dias/AAAA-MM-DD/textos.md`: tendencias (con fuentes), y por cada post: número, idea,
   caption, hashtags. Agregar la sección del día a `registro.md`.
10. Commit (sin `html/`) y push a la rama `claude/practical-ritchie-ybu20n`.
11. **Google Drive**: en la carpeta "Essential Leaf · Contenido diario"
    (id `1W8EQNOKNcmwO4zWlAc6hQB44iTxHNt2X`) crear un Google Doc "Essential Leaf · AAAA-MM-DD" con
    `textos.md` y, por cada post, su enlace en GitHub:
    `https://github.com/andrespachay-lang/webel/blob/claude/practical-ritchie-ybu20n/essential-leaf/dias/AAAA-MM-DD/posts/NN_nombre.jpg`
    más el enlace a la carpeta del día y a `revision.jpg`. (Las imágenes no se suben a Drive: el
    conector no admite archivos de ese peso.)
12. Terminar con un resumen corto: tendencias elegidas, los 12 posts y el enlace del Doc.
