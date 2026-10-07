# Video feriado · Guayaquil → Olón

Claquetas tipográficas y animaciones (HyperFrames + GSAP) para el reel del feriado.
Formato vertical 1080×1920 (Reels / TikTok / Stories), 47 s, 30 fps.

Render final: `renders/feriado-guayaquil-olon.mp4`

## Escenas y tiempos

| #  | Tiempo        | Texto del guion                                         | Animación                                                          |
| -- | ------------- | ------------------------------------------------------- | ------------------------------------------------------------------ |
| 1  | 0:00 – 0:03.2 | Este feriado: cero planes aburridos                     | Tipografía en máscara, "aburridos" tachado                         |
| 2  | 0:03.2 – 0:06 | ¡Nos vamos a volar!                                     | Avión con estela punteada entre nubes                              |
| 3  | 0:06 – 0:10   | Este 9 y 10 de octubre, celebra a la ciudad como nunca antes | Bandera de Guayaquil se arma + calendarios que caen          |
| 4  | 0:10 – 0:15   | Sobrevuela el río Guayas                                | Río que se dibuja, Isla Santay, pin Guayaquil, avión sobre el río  |
| 5  | 0:15 – 0:19   | Contempla sus icónicos edificios                        | Skyline: Las Peñas, The Point, Torre Morisca, La Perla (gira)      |
| 6  | 0:19 – 0:22.5 | ¡Busca tu casa!                                         | Barrio visto desde arriba, lupa que busca y pin que cae            |
| 7  | 0:22.5 – 0:26 | Una vista que solo puedes vivir desde el aire           | Horizonte artificial de cabina + nubes pasando                     |
| 8  | 0:26 – 0:28.5 | Y obvio no termina aquí…                                | Tipografía + puntos suspensivos rebotando                          |
| 9  | 0:28.5 – 0:34 | El domingo 11, nos vamos a Olón 🌊                      | Mapa costa Guayas/Santa Elena, ruta de vuelo GYE → Olón            |
| 10 | 0:34 – 0:38.5 | Cambia la arena por el cielo, descubre la playa…        | "Arena" tachada → "Cielo", la playa baja y pasa el avión           |
| 11 | 0:38.5 – 0:41.5 | Escápate y disfruta de la naturaleza                  | Atardecer, palmeras meciéndose, aves                               |
| 12 | 0:41.5 – 0:47 | Este feriado no te quedes con las ganas, etiqueta con quien vienes a volar! | Etiqueta + comentario "@tu_copiloto" tipeándose + avión en loop |

Entre escenas hay barridos de color (amarillo / celeste) al entrar a las escenas 3, 4, 6, 8, 9, 11 y 12.

## Editar y volver a renderizar

```bash
cd video-feriado
npx hyperframes preview --background   # Studio: editar textos y tiempos en el navegador
npm run check                          # validación
npm run render                         # MP4 en renders/
```

Para mover un corte, cambia el `data-start` / `data-duration` de la `<section>` de la escena
y los tiempos de sus tweens en el `<script>` (están agrupados por escena con comentarios).
