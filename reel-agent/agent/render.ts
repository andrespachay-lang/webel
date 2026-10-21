import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { ReelProps } from "../remotion/types";

const here = path.dirname(fileURLToPath(import.meta.url));
const FALLBACK_BROWSER = "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell";

export async function renderReel(opts: { props: ReelProps; publicDir: string; outFile: string }) {
  const serveUrl = await bundle({
    entryPoint: path.join(here, "..", "remotion", "index.ts"),
    publicDir: opts.publicDir,
  });
  const browserExecutable =
    process.env.REMOTION_BROWSER || (existsSync(FALLBACK_BROWSER) ? FALLBACK_BROWSER : null);
  const inputProps = opts.props as unknown as Record<string, unknown>;
  const composition = await selectComposition({
    serveUrl,
    id: "HudReel",
    inputProps,
    browserExecutable,
  });
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 18,
    outputLocation: opts.outFile,
    inputProps,
    browserExecutable,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct >= last + 10) {
        last = pct;
        process.stdout.write(`   ${pct}%\n`);
      }
    },
  });
}
