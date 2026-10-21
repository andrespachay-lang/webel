import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { ReelScript } from "../remotion/types";

const ScriptSchema = z.object({
  title: z.string().describe("Gancho del reel: una pregunta que rompe una creencia, máx. 14 palabras."),
  caption: z.string().describe("Caption para Instagram/TikTok: emoji + gancho + 1–2 frases de valor."),
  hashtags: z.array(z.string()).describe("8–12 hashtags sin '#'."),
  visualStyle: z
    .string()
    .describe("Estilo visual común en inglés que se añadirá a TODOS los prompts de video (look, paleta, HUD)."),
  scenes: z
    .array(
      z.object({
        id: z.string(),
        narration: z.string().describe("Voz en off de la escena: 1–2 frases, máx. 18 palabras (≈7 s)."),
        videoPrompt: z
          .string()
          .describe("Prompt en inglés del clip vertical de 8 s: sujeto, acción, cámara y HUD holográfico concreto."),
        camera: z.enum(["push", "pull", "pan-left", "pan-right", "rise"]),
        stockQuery: z
          .string()
          .describe("Búsqueda en inglés para video de stock vertical: 3–6 palabras de algo real y filmable."),
        hud: z.object({
          title: z.string().describe("Título del HUD en el idioma pedido y en MAYÚSCULAS, p. ej. 'ESPACIO AÉREO CLASE C'."),
          labels: z.array(z.string()).describe("0–3 etiquetas de datos de máx. 3 palabras, en el idioma pedido, p. ej. 'SUPERFICIE – 4.000 PIES'."),
          shape: z
            .enum(["box", "cylinder", "dome", "rings", "stack", "none"])
            .describe("Volumen holográfico: box (bloque), cylinder (zona alrededor de aeropuerto), dome, rings (radar), stack (resumen de capas)."),
        }),
      }),
    )
    .describe("Escenas en orden. La primera es el gancho; la penúltima resume; la última cierra con CTA."),
});

const SYSTEM = `Eres el guionista y director de arte de reels educativos verticales al estilo "Aero Veil · Aviation Explained".

ASÍ ES EL FORMATO (analizado de un reel real de 109 s):
- Voz en off continua, tono documental, frases cortas y claras. Subtítulos de una palabra a la vez (los pone el editor, no tú).
- Gancho (≈10 s): la pregunta del título + una frase que rompe la creencia ("No todo el espacio aéreo se controla igual")
  y presenta el sistema ("La OACI lo divide en siete clases…").
- Cuerpo: una escena (o dos) por cada elemento del sistema, en orden lógico, explicando QUÉ es, QUIÉN lo usa y QUÉ regla cambia
  (p. ej. IFR/VFR, separación, autorización, servicio de tráfico). Datos y números exactos.
- Resumen: una escena con TODOS los elementos juntos (una "torre"/diagrama de capas apiladas) y la diferencia clave.
- Cierre: plano hero del sujeto principal + frase final de valor + CTA corto (seguir / guardar).

DIRECCIÓN VISUAL (lo más importante):
- Cada escena es un clip de IA de 8 s, vertical 9:16, fotorrealista y cinematográfico, con el HUD INTEGRADO en la imagen:
  volúmenes holográficos translúcidos azul/cian (cajas, cilindros, cúpulas, anillos de radar), líneas guía finas,
  pequeñas etiquetas de datos en mayúsculas (máx. 2–4 palabras cada una, p. ej. "CLASS C AIRSPACE", "FL180", "IFR"),
  marcadores verdes para lo permitido/VFR y naranjas para alertas.
- Varía el encuadre entre escenas: aéreo amplio, plano medio del sujeto, vista cenital tipo mapa, diagrama 3D sobre fondo
  oscuro azul marino para el resumen. Mantén el mismo sujeto principal (mismo avión/objeto) para dar continuidad.
- Cada videoPrompt describe: plano y movimiento de cámara, sujeto y acción, elementos del HUD con sus etiquetas exactas,
  luz/hora del día. Siempre en inglés. Nunca pidas subtítulos ni logos. Las etiquetas del HUD van en inglés técnico.
- visualStyle resume el look común (p. ej. "photorealistic, cinematic aerial cinematography, crisp daylight,
  futuristic holographic HUD infographic overlay in translucent blue and cyan, clean sans-serif labels, 9:16 vertical").

VERSIÓN CON STOCK: además de videoPrompt, cada escena trae
- stockQuery: lo que se buscaría en un banco de videos (sujeto real, sin HUD ni efectos), p. ej. "airplane landing runway sunset".
- hud: el HUD que se dibuja por código encima del clip de stock (título, etiquetas y forma del volumen),
  con todos sus textos en el idioma pedido (siglas como FL o ILS se mantienen).

Escribe narración, título, caption y hashtags en el idioma pedido.`;

export async function writeScript(opts: {
  topic: string;
  lang: string;
  seconds: number;
  notes?: string;
}): Promise<ReelScript> {
  const client = new Anthropic();
  const scenes = Math.max(5, Math.round(opts.seconds / 7));
  const userPrompt = [
    `Tema: ${opts.topic}`,
    `Idioma: ${opts.lang}`,
    `Duración objetivo: ~${opts.seconds} s → unas ${scenes} escenas (≈${Math.round(opts.seconds * 2.5)} palabras de narración).`,
    opts.notes ? `Notas del creador: ${opts.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(ScriptSchema) },
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`Claude rechazó el tema: ${response.stop_details?.explanation ?? "sin detalle"}`);
  }
  if (!response.parsed_output) {
    throw new Error(`No se pudo leer el guion (stop_reason=${response.stop_reason}).`);
  }
  const s = response.parsed_output;
  return { ...s, hashtags: s.hashtags.map((h) => h.replace(/^#/, "")) };
}
