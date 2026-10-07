# Feriado en helicóptero — claquetas animadas (HyperFrames)

Video vertical 1080×1920 (reel), 55 s, 30 fps, con música y efectos de sonido. Composición en `index.html`.

| # | Tiempo | Claqueta | Archivo |
|---|--------|----------|---------|
| 01 | 0–4 s | "Este feriado: cero planes aburridos" (se tacha "aburridos") | `renders/claquetas/01-cero-planes-aburridos.mp4` |
| 02 | 4–8 s | "¡Nos vamos a volar!" + helicóptero entrando | `02-nos-vamos-a-volar.mp4` |
| 03 | 8–12.5 s | Calendarios 9 y 10 de octubre, bandera de Guayaquil | `03-9-y-10-de-octubre.mp4` |
| 04 | 12.5–18 s | Mapa aéreo: helicóptero sobrevuela el río Guayas (Las Peñas, Malecón 2000, Isla Santay) | `04-mapa-rio-guayas.mp4` |
| 05 | 18–22.5 s | Skyline: faro de Las Peñas, edificios, rueda | `05-iconicos-edificios.mp4` |
| 06 | 22.5–26.5 s | "¡Busca tu casa!" mira/radar + pin | `06-busca-tu-casa.mp4` |
| 07 | 26.5–30.5 s | "Una vista que solo puedes vivir desde el aire" entre nubes | `07-vista-desde-el-aire.mp4` |
| 08 | 30.5–34 s | "Y obvio… no termina aquí…" (máquina de escribir) | `08-no-termina-aqui.mp4` |
| 09 | 34–41 s | Domingo 11: mapa Guayaquil → Olón, ruta + contador de km | `09-mapa-guayaquil-olon.mp4` |
| 10 | 41–45 s | "Cambia la ~~arena~~ por el cielo" | `10-arena-por-cielo.mp4` |
| 11 | 45–49 s | "Escápate y disfruta de la naturaleza" (atardecer, palmeras) | `11-escapate-naturaleza.mp4` |
| 12 | 49–55 s | CTA "No te quedes con las ganas · @Etiqueta con quién vienes a volar" | `12-cta-etiqueta.mp4` |

Video completo: `renders/feriado-vuelo-completo.mp4`.

## Sonido

Banda sonora 100 % sintetizada (sin samples externos, libre de derechos) con `tools/make_audio.py`,
en tres pistas separadas en `assets/audio/` para mezclarlas a gusto en tu editor:

- `music.mp3` — base tropical-pop a 120 BPM (Am–F–C–G). Se corta en "no termina aquí…" con un riser y vuelve con un golpe en el mapa de Olón.
- `heli.mp3` — rotor del helicóptero en cada escena donde aparece, con paneo izquierda/derecha según su movimiento y aceleración en el despegue final.
- `sfx.mp3` — efectos sincronizados con las animaciones: whooshes, pops de letras, tachón, bips de la mira, caída del pin, máquina de escribir, ticks del contador de km, ding en Olón, olas, clic del CTA.

El video final está normalizado a −14 LUFS (estándar para Reels/TikTok). Si le pones voz en off, baja `music.mp3`
(atributo `data-volume` del `<audio id="music">` en `index.html`) o usa las pistas por separado.
Para regenerar el audio: `python3 tools/make_audio.py` (requiere numpy y ffmpeg).

## Editar / volver a renderizar

```bash
npx hyperframes preview   # Studio: editar textos y tiempos
npx hyperframes check     # validar
npx hyperframes render -o renders/feriado-vuelo-completo.mp4
# normalizar volumen para redes:
ffmpeg -i renders/feriado-vuelo-completo.mp4 -c:v copy -af "acompressor=threshold=0.12:ratio=3:attack=5:release=120,loudnorm=I=-14:TP=-1:LRA=9" -c:a aac -b:a 256k final.mp4
```

GSAP y las fuentes (Anton, Montserrat, Pacifico — OFL) están incluidas en `assets/`, no necesita internet para renderizar.
Los tiempos de cada escena están en los `data-start` / `data-duration` de cada `<section>` y en las constantes `S2…S12` del script.
