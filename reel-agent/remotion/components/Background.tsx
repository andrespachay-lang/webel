import { AbsoluteFill, Img, Loop, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Camera } from "../types";

/** Fondo de una escena: clip de IA, imagen con Ken Burns o cielo procedural. */
export const Background = ({
  media,
  mediaType,
  mediaSeconds,
  camera,
  seed,
}: {
  media: string;
  mediaType: "image" | "video" | "";
  mediaSeconds: number;
  camera: Camera;
  seed: number;
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateRight: "clamp" });

  const moves: Record<Camera, { scale: [number, number]; x: [number, number]; y: [number, number] }> = {
    push: { scale: [1.04, 1.18], x: [0, 0], y: [0, 0] },
    pull: { scale: [1.2, 1.05], x: [0, 0], y: [0, 0] },
    "pan-left": { scale: [1.16, 1.16], x: [3, -3], y: [0, 0] },
    "pan-right": { scale: [1.16, 1.16], x: [-3, 3], y: [0, 0] },
    rise: { scale: [1.15, 1.15], x: [0, 0], y: [3, -3] },
  };
  const m = moves[camera];
  const lerp = ([a, b]: [number, number]) => a + (b - a) * t;
  const transform = `translate(${lerp(m.x)}%, ${lerp(m.y)}%) scale(${lerp(m.scale)})`;
  const style = { width: "100%", height: "100%", objectFit: "cover" as const };

  if (mediaType === "video") {
    // Los clips de IA ya traen su propio movimiento: solo se ralentizan (hasta 0.65x) si la voz es más larga,
    // y si aun así no alcanza, se repiten.
    const sceneSeconds = durationInFrames / fps;
    const rate = mediaSeconds > 0 ? Math.min(1, Math.max(0.65, mediaSeconds / sceneSeconds)) : 1;
    const loopFrames = mediaSeconds > 0 ? Math.floor((mediaSeconds / rate) * fps) : durationInFrames;
    return (
      <AbsoluteFill>
        <Loop durationInFrames={Math.max(1, loopFrames)}>
          <OffthreadVideo src={staticFile(media)} muted playbackRate={rate} style={style} />
        </Loop>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill>
      {mediaType === "image" ? (
        <Img src={staticFile(media)} style={{ ...style, transform }} />
      ) : (
        <ProceduralSky transform={transform} seed={seed} />
      )}
    </AbsoluteFill>
  );
};

/** Cielo cinematográfico generado por código, para cuando no hay imágenes propias. */
const ProceduralSky = ({ transform, seed }: { transform: string; seed: number }) => {
  const frame = useCurrentFrame();
  const clouds = Array.from({ length: 9 }, (_, i) => {
    const r = Math.sin((i + 1) * 91.7 + seed * 13.1) * 0.5 + 0.5;
    const r2 = Math.sin((i + 1) * 47.3 + seed * 7.7) * 0.5 + 0.5;
    return {
      left: ((r * 140 - 20 + frame * (0.04 + r2 * 0.05)) % 140) - 20,
      top: 48 + r2 * 34,
      w: 420 + r * 520,
      h: 120 + r2 * 140,
      o: 0.35 + r * 0.4,
    };
  });
  return (
    <AbsoluteFill style={{ transform }}>
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #071a3a 0%, #12407a 30%, #4f8fc9 52%, #a9cbe6 60%, #5f6f7c 64%, #2a3540 78%, #141b22 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse 80% 18% at 50% 60%, rgba(255,240,215,0.55), rgba(255,240,215,0) 70%)",
        }}
      />
      {/* relieve montañoso */}
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }} preserveAspectRatio="none">
        <path
          d="M0 1240 L120 1190 L210 1225 L330 1150 L450 1215 L560 1170 L690 1230 L800 1160 L930 1210 L1080 1175 L1080 1920 L0 1920 Z"
          fill="#2b3946"
          opacity={0.9}
        />
        <path
          d="M0 1330 L160 1270 L280 1320 L420 1260 L600 1335 L760 1280 L900 1330 L1080 1290 L1080 1920 L0 1920 Z"
          fill="#1b252e"
        />
      </svg>
      {clouds.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${c.left}%`,
            top: `${c.top}%`,
            width: c.w,
            height: c.h,
            borderRadius: "50%",
            background: "radial-gradient(closest-side, rgba(255,255,255,0.95), rgba(255,255,255,0))",
            filter: "blur(18px)",
            opacity: c.o,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
