import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { Background } from "./components/Background";
import { BrandOutro, Watermark, WordCaption } from "./components/Overlay";
import { HudOverlay } from "./components/HudOverlay";
import type { ReelProps } from "./types";

export const HudReel = ({ script, timings, music, musicVolume = 0.15, voiceover, brand }: ReelProps) => {
  const { durationInFrames } = useVideoConfig();
  const starts = timings.reduce<number[]>((acc, t, i) => [...acc, i ? acc[i - 1] + timings[i - 1].durationInFrames : 0], []);
  const last = script.scenes.length - 1;
  const watermark = brand.name
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
    .replace(/\s+/g, "");

  return (
    <AbsoluteFill style={{ backgroundColor: "#061325" }}>
      {script.scenes.map((scene, i) => {
        const t = timings[i];
        return (
          <Sequence key={scene.id + i} from={starts[i]} durationInFrames={t.durationInFrames} name={scene.id}>
            <Background media={t.media} mediaType={t.mediaType} mediaSeconds={t.mediaSeconds} camera={scene.camera} seed={i} />
            {t.hud && scene.hud && <HudOverlay hud={scene.hud} />}
            {i !== last && brand.name && <Watermark name={watermark} />}
            {i === last && brand.name && <BrandOutro brand={brand} />}
            <WordCaption words={t.words} />
            {t.audio && <Audio src={staticFile(t.audio)} />}
          </Sequence>
        );
      })}
      {voiceover && <Audio src={staticFile(voiceover)} />}
      {music && (
        <Audio
          src={staticFile(music)}
          loop
          // Entra en 0.5 s y se desvanece en los últimos 2 s.
          volume={(f) =>
            musicVolume *
            interpolate(f, [0, 15, durationInFrames - 60, durationInFrames], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
    </AbsoluteFill>
  );
};
