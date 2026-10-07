# Feriado en helicóptero — claquetas animadas (HyperFrames)

Video vertical 1080×1920 (reel), 55 s, 30 fps. Composición en `index.html`.

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

## Editar / volver a renderizar

```bash
npx hyperframes preview   # Studio: editar textos y tiempos
npx hyperframes check     # validar
npx hyperframes render -o renders/feriado-vuelo-completo.mp4
```

GSAP y las fuentes (Anton, Montserrat, Pacifico — OFL) están incluidas en `assets/`, no necesita internet para renderizar.
Los tiempos de cada escena están en los `data-start` / `data-duration` de cada `<section>` y en las constantes `S2…S12` del script.
