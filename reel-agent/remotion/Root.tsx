import { Composition } from "remotion";
import { HudReel } from "./HudReel";
import { demoProps } from "./demo";
import type { ReelProps } from "./types";

export const RemotionRoot = () => (
  <Composition
    id="HudReel"
    component={HudReel}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={300}
    defaultProps={demoProps}
    calculateMetadata={({ props }: { props: ReelProps }) => ({
      durationInFrames: Math.max(1, props.timings.reduce((a, t) => a + t.durationInFrames, 0)),
    })}
  />
);
