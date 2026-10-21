---
name: reel-explicativo
description: Produce un reel vertical educativo estilo "Aero Veil · Aviation Explained" (clips de IA con HUD holográfico, voz en off y subtítulos de una palabra) a partir de un tema. Úsalo cuando pidan "hazme un reel/video explicativo sobre X" o un video "como el del avión".
---

# Reel explicativo con HUD holográfico

El agente vive en `reel-agent/` (ver `reel-agent/README.md`).

1. Si falta, instala las dependencias con `cd reel-agent && npm install`. Comprueba que `reel-agent/.env` tenga
   `ANTHROPIC_API_KEY` y, de preferencia, `FAL_KEY` y `ELEVENLABS_API_KEY`.
2. Primero planifica sin gastar en video:
   `npm run reel -- "<tema>" --plan [--lang <idioma>] [--seconds <n>] [--notes "<indicaciones>"]`
3. Muestra al usuario el gancho, la narración de cada escena y los prompts (`output/<tema>/script.json`).
   Aplica los cambios que pida editando ese JSON.
4. Antes de generar clips, confirma con el usuario: cada escena es un clip de IA de pago en fal.ai.
5. Produce el video: `npm run reel -- --script output/<tema>/script.json [--brand ... --tagline ... --music ...]`.
   Si el usuario ya tiene sus clips, añade `--media <carpeta>`.
6. Entrega la ruta del `.mp4` y el contenido de `caption.txt`.
