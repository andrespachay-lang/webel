# Reel Agent — reels "explicados" con HUD holográfico

Este agente genera reels verticales (1080×1920) con el estilo de *Aero Veil · Aviation Explained*:
clips fotorrealistas creados con IA y un HUD holográfico integrado (volúmenes translúcidos, etiquetas
de datos, anillos de radar), voz en off documental, subtítulos de **una palabra a la vez** en amarillo
y un cierre con la marca.

```
tema ──► Claude (guion + prompts de video) ──► fal.ai (clips Veo/Kling) ──► ElevenLabs (voz + tiempos)
                                                                               │
                         reel.mp4 + caption.txt ◄── Remotion (montaje, subtítulos, marca, música)
```

## Análisis del reel de referencia

| Elemento | Cómo es | Cómo lo hace el agente |
|---|---|---|
| Visuales | Clips de IA de ~8 s, fotorrealistas, con el HUD ya dentro de la imagen | Claude escribe un `videoPrompt` por escena con un `visualStyle` común; fal.ai genera el clip |
| Estructura | Gancho (pregunta + creencia rota) → un elemento por escena → resumen en "torre" → plano hero + CTA | Está en el prompt de sistema de `agent/script.ts` |
| Voz | Narración continua, frases cortas, tono documental | ElevenLabs `with-timestamps` (una pista por escena) |
| Subtítulos | Una palabra, amarillo `#f2ff3d`, borde negro grueso, a ~76 % de la altura | `WordCaption` en `remotion/components/Overlay.tsx` |
| Marca | Marca de agua discreta + "AERO VEIL / AVIATION EXPLAINED" en el cierre | `--brand` / `--tagline` |
| Ritmo | Cortes secos cada 5–12 s, ~110 s en total | Cada escena dura lo que su narración; el clip se ralentiza hasta 0.65× o se repite |

## Instalación

```bash
cd reel-agent
npm install
cp .env.example .env   # completa las claves
```

| Variable | ¿Obligatoria? | Para qué |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sí (salvo con `--script`) | Guion y prompts |
| `FAL_KEY` | Recomendada | Clips de video con IA (por defecto `fal-ai/veo3/fast`) |
| `ELEVENLABS_API_KEY` | Recomendada | Voz en off y subtítulos sincronizados |

Si falta alguna de las dos recomendadas, el agente sigue funcionando: sin `FAL_KEY` usa un fondo
procedural (o tus clips con `--media`) y sin ElevenLabs estima los tiempos de los subtítulos.

## Uso

```bash
# Todo el proceso
npm run reel -- "Clases de espacio aéreo A–G" --seconds 90

# 1) Solo planificar (no se gasta en video): revisa y edita script.json / prompts.md
npm run reel -- "Cómo aterriza un avión con niebla" --plan
# 2) Producir a partir del plan editado
npm run reel -- --script output/como-aterriza-un-avion-con-niebla/script.json

# Con tus propios clips (01.mp4, 02.mp4… en orden de escena), por ejemplo hechos en Sora, Runway o Kling
npm run reel -- --script output/<tema>/script.json --media ~/Desktop/clips

# Otra marca, otro idioma, con música
npm run reel -- "Why planes don't fly in a straight line" --lang English \
  --brand "MI MARCA" --tagline "AVIACIÓN EXPLICADA" --music ~/Music/ambient.mp3

# Demo sin claves (guion de ejemplo + fondo procedural)
npm run demo

# Previsualizar o ajustar el diseño en Remotion Studio
npm run studio
```

Salida en `output/<tema>/`: `<tema>.mp4`, `caption.txt` (caption + hashtags), `script.json`,
`prompts.md` y `public/` (clips y audios). Los clips ya generados no se vuelven a pedir al re-renderizar.

## Costos y modelos

- Cada escena es un clip de 8 s; un reel de 60 s tiene unas 9 escenas. Revisa los precios del modelo en fal.ai
  antes de lanzar reels largos y usa `--plan` para validar el guion primero.
- Para cambiar de modelo: `FAL_VIDEO_MODEL=fal-ai/kling-video/v2.1/master/text-to-video` (y `FAL_VIDEO_ARGS`
  si el modelo necesita otros parámetros).
- El guion usa `claude-opus-5-5` con *fallback* automático del lado del servidor.

## Archivos

- `agent/index.ts`: CLI y orquestación
- `agent/script.ts`: guion y prompts (Claude, salida estructurada)
- `agent/visuals.ts`: clips e imágenes (fal.ai, API de cola)
- `agent/voice.ts`: voz y tiempos por palabra (ElevenLabs)
- `agent/render.ts`: render con Remotion
- `remotion/`: composición (`HudReel`), fondo, subtítulos y marca
- `examples/espacio-aereo.json`: recreación en español del reel de referencia
