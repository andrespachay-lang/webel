import { writeFile } from "node:fs/promises";
import type { Word } from "../remotion/types";

type Alignment = {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
};

export type Speech = { file: string; words: Word[]; seconds: number };

/** Narra un texto con ElevenLabs y devuelve el mp3 + tiempos por palabra. */
export async function speak(text: string, outFile: string): Promise<Speech> {
  const key = process.env.ELEVENLABS_API_KEY!;
  const voice = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, speed: 1.08 },
      }),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { audio_base64: string; alignment: Alignment };
  await writeFile(outFile, Buffer.from(data.audio_base64, "base64"));
  const words = alignmentToWords(data.alignment);
  const a = data.alignment;
  return { file: outFile, words, seconds: a.character_end_times_seconds.at(-1) ?? 0 };
}

function alignmentToWords(a: Alignment): Word[] {
  const words: Word[] = [];
  let cur: Word | null = null;
  a.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = { text: "", start: a.character_start_times_seconds[i], end: 0 };
    cur.text += ch;
    cur.end = a.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  return words;
}

/** Sin voz: reparte las palabras a ~2.6 palabras/segundo para que los subtítulos sigan el ritmo. */
export function estimateWords(text: string): { words: Word[]; seconds: number } {
  const perWord = 1 / 2.6;
  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .map((t, i) => ({ text: t, start: i * perWord, end: (i + 1) * perWord - 0.04 }));
  return { words, seconds: words.length * perWord };
}
