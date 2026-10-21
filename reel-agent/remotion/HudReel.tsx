import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Background } from "./components/Background";
import { BrandOutro, Watermark, WordCaption } from "./components/Overlay";
import type { ReelProps } from "./types";

export const HudReel = ({ script, timings, music, brand }: ReelProps) => {
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
            {i !== last && brand.name && <Watermark name={watermark} />}
            {i === last && brand.name && <BrandOutro brand={brand} />}
            <WordCaption words={t.words} />
            {t.audio && <Audio src={staticFile(t.audio)} />}
          </Sequence>
        );
      })}
      {music && <Audio src={staticFile(music)} volume={0.12} loop />}
    </AbsoluteFill>
  );
};
