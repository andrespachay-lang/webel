import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";

/**
 * Genera clips (o imágenes) con fal.ai, que da acceso con una sola clave a Veo, Kling, Seedance, Flux…
 * El modelo se cambia con FAL_VIDEO_MODEL / FAL_IMAGE_MODEL y los parámetros extra con FAL_VIDEO_ARGS (JSON).
 */
export const DEFAULT_VIDEO_MODEL = "fal-ai/veo3/fast";
export const DEFAULT_IMAGE_MODEL = "fal-ai/flux-pro/v1.1-ultra";

const KNOWN_ARGS: Record<string, Record<string, unknown>> = {
  "fal-ai/veo3": { aspect_ratio: "9:16", duration: "8s", generate_audio: false },
  "fal-ai/kling-video": { aspect_ratio: "9:16", duration: "10" },
  "fal-ai/flux": { aspect_ratio: "9:16" },
};

export async function generateMedia(opts: {
  kind: "video" | "image";
  prompt: string;
  outFile: string;
}): Promise<void> {
  if (existsSync(opts.outFile)) return; // ya generado en una ejecución anterior: no se vuelve a pagar
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("Falta FAL_KEY para generar visuales.");
  const model =
    opts.kind === "video"
      ? process.env.FAL_VIDEO_MODEL || DEFAULT_VIDEO_MODEL
      : process.env.FAL_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  const known = Object.entries(KNOWN_ARGS).find(([prefix]) => model.startsWith(prefix))?.[1] ?? { aspect_ratio: "9:16" };
  const extra = opts.kind === "video" && process.env.FAL_VIDEO_ARGS ? JSON.parse(process.env.FAL_VIDEO_ARGS) : {};
  const headers = { Authorization: `Key ${key}`, "Content-Type": "application/json" };

  const submit = await fetch(`https://queue.fal.run/${model}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt: opts.prompt, ...known, ...extra }),
  });
  if (!submit.ok) throw new Error(`fal.ai ${submit.status}: ${await submit.text()}`);
  const job = (await submit.json()) as { status_url: string; response_url: string };

  for (;;) {
    await new Promise((r) => setTimeout(r, 5000));
    const st = await fetch(job.status_url, { headers });
    const status = ((await st.json()) as { status: string }).status;
    if (status === "COMPLETED") break;
    if (status !== "IN_QUEUE" && status !== "IN_PROGRESS") throw new Error(`fal.ai: estado ${status}`);
  }

  const result = (await (await fetch(job.response_url, { headers })).json()) as {
    video?: { url: string };
    images?: { url: string }[];
    detail?: unknown;
  };
  const url = result.video?.url ?? result.images?.[0]?.url;
  if (!url) throw new Error(`fal.ai no devolvió archivo: ${JSON.stringify(result.detail ?? result).slice(0, 300)}`);
  const file = await fetch(url);
  await writeFile(opts.outFile, Buffer.from(await file.arrayBuffer()));
}

/** Ejecuta tareas con un máximo de `limit` en paralelo. */
export async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}
