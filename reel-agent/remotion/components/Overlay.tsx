import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Brand, Word } from "../types";
import { theme } from "../theme";

/** Subtítulo de una sola palabra, amarillo con borde negro, como en el reel de referencia. */
export const WordCaption = ({ words }: { words: Word[] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const i = words.findIndex((w, k) => t >= w.start && t < (words[k + 1]?.start ?? w.end + 0.4));
  if (i < 0) return null;
  const word = words[i];
  const pop = spring({ frame: frame - Math.round(word.start * fps), fps, config: { damping: 14, stiffness: 260 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", top: "75.5%" }}>
      <div
        style={{
          fontFamily: theme.sans,
          fontWeight: 900,
          fontSize: 76,
          color: theme.caption,
          WebkitTextStroke: "12px #000",
          paintOrder: "stroke fill",
          textShadow: "0 4px 14px rgba(0,0,0,0.45)",
          transform: `scale(${interpolate(pop, [0, 1], [0.82, 1])})`,
          letterSpacing: -0.5,
        }}
      >
        {word.text.replace(/[.,;:!?¡¿"“”]/g, "")}
      </div>
    </AbsoluteFill>
  );
};

/** Marca grande del cierre (bajo el subtítulo). */
export const BrandOutro = ({ brand }: { brand: Brand }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [6, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ top: "80.5%", alignItems: "center", justifyContent: "flex-start", opacity: o }}>
      <div style={{ fontFamily: theme.sans, fontWeight: 600, fontSize: 82, color: theme.white, letterSpacing: 3, textShadow: "0 2px 18px rgba(0,0,0,0.35)" }}>
        {brand.name}
      </div>
      <div style={{ fontFamily: theme.sans, fontWeight: 500, fontSize: 30, color: theme.white, letterSpacing: 2, opacity: 0.9, marginTop: -4 }}>
        {brand.tagline}
      </div>
    </AbsoluteFill>
  );
};

/** Marca de agua discreta abajo a la derecha. */
export const Watermark = ({ name }: { name: string }) => (
  <div
    style={{
      position: "absolute",
      right: 48,
      bottom: 300,
      fontFamily: theme.sans,
      fontWeight: 500,
      fontSize: 30,
      color: "rgba(255,255,255,0.55)",
      letterSpacing: 1,
    }}
  >
    {name}
  </div>
);
