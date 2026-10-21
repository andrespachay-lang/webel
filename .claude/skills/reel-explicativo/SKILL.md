---
name: reel-explicativo
description: Produce un reel vertical educativo estilo "Aero Veil · Aviation Explained" (clips de IA o videos de stock de Magnific con HUD holográfico, voz en off y subtítulos de una palabra) a partir de un tema. Úsalo cuando pidan "hazme un reel/video explicativo sobre X", un video "como el del avión" o un reel con stock de Magnific.
---

# Reel explicativo con HUD holográfico

El agente vive en `reel-agent/` (ver `reel-agent/README.md`).

1. Si falta, instala las dependencias con `cd reel-agent && npm install`. Comprueba que `reel-agent/.env` tenga
   `ANTHROPIC_API_KEY` y, de preferencia, `ELEVENLABS_API_KEY` (y `FAL_KEY` si se usarán clips de IA).
2. Planifica sin gastar: `npm run reel -- "<tema>" --plan [--lang <idioma>] [--seconds <n>] [--notes "<indicaciones>"]`.
3. Muestra al usuario el gancho, la narración de cada escena, los HUD y los visuales previstos
   (`output/<tema>/script.json`). Aplica los cambios que pida editando ese JSON.
4. Elige la fuente de visuales:
   - **Stock de Magnific** (conector `magnific`): para cada escena busca con `stock_search`
     (`content_type: "video"`, `orientation: "portrait"`, `video_type: "footage"`, `query` = `stockQuery` de la escena),
     elige por título el clip que mejor encaje y guarda su id en `stockId` del script.json. Cada descarga premium cuesta
     créditos (`creditCost`, normalmente 600): consulta `account_balance`, di el total al usuario y espera su confirmación.
     Luego `stock_download` (`type: "video"`) por escena y descarga cada URL firmada con curl a una carpeta, como
     `01.mp4`, `02.mp4`… en el orden de las escenas. Renderiza con `--media <carpeta>`; el HUD se dibuja por código.
   - **Clips de IA** (fal.ai): confirma el costo y ejecuta sin `--media`; esos clips ya traen el HUD integrado.
5. Produce el video: `npm run reel -- --script output/<tema>/script.json [--media <carpeta>] [--brand ... --tagline ... --music ...]`.
6. Entrega la ruta del `.mp4` y el contenido de `caption.txt`.
