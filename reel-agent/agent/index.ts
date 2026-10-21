import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { getVideoMetadata } from "@remotion/renderer";
import { writeScript } from "./script";
import { estimateWords, speak } from "./voice";
import { generateMedia, pool } from "./visuals";
import { renderReel } from "./render";
import type { ReelProps, ReelScript, SceneTiming } from "../remotion/types";

const FPS = 30;
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const VIDEO_EXT = new Set([".mp4", ".mov", ".webm"]);

const HELP = `Uso:
  npm run reel -- "tema del video" [opciones]

Opciones:
  --lang <idioma>        Idioma de narración y textos (por defecto: español)
  --seconds <n>          Duración objetivo en segundos (por defecto: 60)
  --visuals <modo>       video | image | none  (por defecto: video si hay FAL_KEY, si no none)
  --media <carpeta>      Usa tus propios clips/imágenes (01.mp4, 02.jpg…) en lugar de generarlos
  --brand <nombre>       Marca del outro y marca de agua (por defecto: "AERO VEIL")
  --tagline <texto>      Línea bajo la marca (por defecto: "AVIATION EXPLAINED")
  --music <archivo>      Música de fondo (mp3/wav), se mezcla bajo la voz
  --notes <texto>        Indicaciones extra para el guion (tono, datos, público…)
  --script <json>        Reutiliza un script.json ya generado (no llama a Claude)
  --plan                 Solo escribe guion y prompts (sin generar clips, voz ni render)
  --no-voice             No genera voz aunque haya ELEVENLABS_API_KEY
  --out <carpeta>        Carpeta de salida (por defecto: output/<tema>)
`;

async function main() {
  await loadEnv();
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      lang: { type: "string", default: "español" },
      seconds: { type: "string", default: "60" },
      visuals: { type: "string" },
      media: { type: "string" },
      brand: { type: "string", default: "AERO VEIL" },
      tagline: { type: "string", default: "AVIATION EXPLAINED" },
      music: { type: "string" },
      notes: { type: "string" },
      script: { type: "string" },
      plan: { type: "boolean", default: false },
      "no-voice": { type: "boolean", default: false },
      out: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });
  const topic = positionals.join(" ").trim();
  if (values.help || (!topic && !values.script)) {
    console.log(HELP);
    process.exit(values.help ? 0 : 1);
  }

  // Un script.json generado antes se re-renderiza en su misma carpeta; cualquier otro .json va a output/<nombre>.
  const reuseDir = values.script && path.basename(values.script) === "script.json" ? path.dirname(path.resolve(values.script)) : null;
  const slug = slugify(topic || (reuseDir ? path.basename(reuseDir) : path.basename(values.script!, ".json")));
  const outDir = path.resolve(values.out ?? reuseDir ?? path.join("output", slug));
  const publicDir = path.join(outDir, "public");
  await mkdir(path.join(publicDir, "audio"), { recursive: true });
  await mkdir(path.join(publicDir, "media"), { recursive: true });

  // 1. Guion + prompts
  let script: ReelScript;
  if (values.script) {
    script = JSON.parse(await readFile(values.script, "utf8"));
    console.log(`📄 Guion cargado de ${values.script}`);
  } else {
    console.log(`✍️  Escribiendo guion con Claude: "${topic}"…`);
    script = await writeScript({ topic, lang: values.lang!, seconds: Number(values.seconds), notes: values.notes });
  }
  await writeFile(path.join(outDir, "script.json"), JSON.stringify(script, null, 2));
  await writeFile(path.join(outDir, "caption.txt"), `${script.caption}\n\n${script.hashtags.map((h) => `#${h}`).join(" ")}\n`);
  await writeFile(path.join(outDir, "prompts.md"), promptsText(script));
  console.log(`   ${script.scenes.length} escenas → ${path.join(outDir, "script.json")}`);
  if (values.plan) {
    console.log(`\n📝 Plan listo. Revisa/edita script.json y prompts.md, luego:\n   npm run reel -- --script ${path.join(outDir, "script.json")}`);
    return;
  }

  // 2. Visuales
  const media: ({ rel: string; type: "image" | "video" } | null)[] = script.scenes.map(() => null);
  if (values.media) {
    const own = await collectMedia(values.media, publicDir);
    own.forEach((m, i) => i < media.length && (media[i] = m));
  } else {
    const mode = values.visuals ?? (process.env.FAL_KEY ? "video" : "none");
    if (mode === "video" || mode === "image") {
      const ext = mode === "video" ? ".mp4" : ".jpg";
      console.log(`🎥 Generando ${script.scenes.length} ${mode === "video" ? "clips" : "imágenes"} con fal.ai (puede tardar)…`);
      await pool(script.scenes, 3, async (scene, i) => {
        const rel = `media/${String(i + 1).padStart(2, "0")}-${slugify(scene.id)}${ext}`;
        await generateMedia({
          kind: mode,
          prompt: `${scene.videoPrompt}\n\nStyle: ${script.visualStyle}. Vertical 9:16. No subtitles, no logos, no watermark.`,
          outFile: path.join(publicDir, rel),
        });
        media[i] = { rel, type: mode };
        console.log(`   ✔ escena ${i + 1}`);
      });
    } else {
      console.log("🎨 Sin visuales generados: fondo procedural (añade FAL_KEY o usa --media).");
    }
  }

  // 3. Voz y tiempos
  const useVoice = !!process.env.ELEVENLABS_API_KEY && !values["no-voice"];
  console.log(useVoice ? "🎙️  Generando voz con ElevenLabs…" : "🔇 Sin voz (falta ELEVENLABS_API_KEY o --no-voice).");
  const timings: SceneTiming[] = [];
  for (const [i, scene] of script.scenes.entries()) {
    const rel = `audio/${String(i + 1).padStart(2, "0")}-${slugify(scene.id)}.mp3`;
    const speech = useVoice ? await speak(scene.narration, path.join(publicDir, rel)) : estimateWords(scene.narration);
    const seconds = Math.max(2.5, speech.seconds + 0.3);
    const m = media[i];
    const mediaSeconds =
      m?.type === "video" ? (await getVideoMetadata(path.join(publicDir, m.rel))).durationInSeconds ?? 0 : 0;
    timings.push({
      durationInFrames: Math.round(seconds * FPS),
      audio: useVoice ? rel : "",
      words: speech.words,
      media: m?.rel ?? "",
      mediaType: m?.type ?? "",
      mediaSeconds,
    });
  }

  let music = "";
  if (values.music) {
    music = `audio/music${path.extname(values.music)}`;
    await copyFile(values.music, path.join(publicDir, music));
  }

  // 4. Render
  const props: ReelProps = { script, timings, music, brand: { name: values.brand!, tagline: values.tagline! } };
  await writeFile(path.join(outDir, "props.json"), JSON.stringify(props, null, 2));
  const outFile = path.join(outDir, `${slug}.mp4`);
  console.log("🎬 Renderizando con Remotion…");
  await renderReel({ props, publicDir, outFile });
  const total = timings.reduce((a, t) => a + t.durationInFrames, 0) / FPS;
  console.log(`\n✅ Listo (${total.toFixed(1)} s): ${outFile}\n   Caption: ${path.join(outDir, "caption.txt")}`);
}

async function collectMedia(dir: string, publicDir: string) {
  const out: { rel: string; type: "image" | "video" }[] = [];
  for (const f of (await readdir(dir)).sort()) {
    const ext = path.extname(f).toLowerCase();
    const type = IMAGE_EXT.has(ext) ? "image" : VIDEO_EXT.has(ext) ? "video" : null;
    if (!type) continue;
    const rel = `media/own-${slugify(path.basename(f, ext))}${ext}`;
    if (!existsSync(path.join(publicDir, rel))) await copyFile(path.join(dir, f), path.join(publicDir, rel));
    out.push({ rel, type });
  }
  console.log(`🖼️  ${out.length} clips/imágenes propios de ${dir}`);
  return out;
}

function promptsText(s: ReelScript) {
  const scenes = s.scenes.map(
    (sc, i) => `## ${String(i + 1).padStart(2, "0")} · ${sc.id}\n\n**Voz:** ${sc.narration}\n\n**Prompt:** ${sc.videoPrompt}\n`,
  );
  return `# ${s.title}\n\n**Estilo común:** ${s.visualStyle}\n\nSi prefieres generar los clips tú mismo (Veo, Kling, Sora, Runway…), guárdalos como 01.mp4, 02.mp4…
en una carpeta y renderiza con:\n\n    npm run reel -- --script <esta carpeta>/script.json --media <carpeta de clips>\n\n${scenes.join("\n")}`;
}

function slugify(s: string) {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "reel"
  );
}

/** Carga reel-agent/.env si existe (sin dependencias extra). */
async function loadEnv() {
  const file = path.resolve(".env");
  if (!existsSync(file)) return;
  for (const line of (await readFile(file, "utf8")).split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

main().catch((err) => {
  console.error(`\n❌ ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
