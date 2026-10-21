import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { HudShape, SceneHud } from "../types";

const CYAN = "#8fe9ff";
const LINE = "rgba(143, 233, 255, 0.85)";
const FILL = "rgba(60, 160, 255, 0.12)";
const MONO = "'JetBrains Mono', 'SFMono-Regular', 'DejaVu Sans Mono', Menlo, monospace";
const SANS = "Inter, 'Helvetica Neue', Arial, sans-serif";

// Centro del volumen holográfico: tercio central, lejos de los subtítulos (76 %) y de la UI de Instagram.
const CX = 540;
const CY = 980;

/**
 * HUD holográfico que convierte un clip de stock en el look "Aviation Explained":
 * leve etalonaje azul, volumen 3D que se dibuja solo, título y etiquetas con líneas guía.
 */
export const HudOverlay = ({ hud }: { hud: SceneHud }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const draw = interpolate(frame, [4, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const spin = frame / 200;

  return (
    <AbsoluteFill>
      {/* etalonaje frío para unificar clips de distintas fuentes */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,30,70,0.28), rgba(0,20,50,0.05) 45%, rgba(0,15,40,0.35))" }} />
      <svg viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="hud-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g filter="url(#hud-glow)">
          <Shape shape={hud.shape} draw={draw} spin={spin} frame={frame} />
        </g>
        {hud.labels.slice(0, 3).map((label, i) => (
          <Tag key={i} text={label} index={i} progress={spring({ frame: frame - 20 - i * 8, fps, config: { damping: 200 } })} />
        ))}
        <Brackets progress={draw} />
      </svg>
      <Title text={hud.title} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

/** Traza que se dibuja de 0 a 1 (pathLength normalizado). */
const strokeIn = (p: number) => ({ pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - p });

const Shape = ({ shape, draw, spin, frame }: { shape: HudShape; draw: number; spin: number; frame: number }) => {
  const s = { stroke: LINE, strokeWidth: 2.2, fill: FILL };
  if (shape === "none") return null;

  if (shape === "box" || shape === "stack") {
    const levels = shape === "stack" ? 5 : 1;
    const H = shape === "stack" ? 92 : 420;
    const gap = 22;
    const total = levels * H + (levels - 1) * gap;
    return (
      <>
        {Array.from({ length: levels }, (_, i) => {
          const w = shape === "stack" ? [1, 0.82, 0.62, 0.74, 0.95][i] : 1;
          const yBottom = CY + total / 2 - i * (H + gap);
          return <IsoBox key={i} a={300 * w} b={190 * w} y0={yBottom} y1={yBottom - H} theta={0.5 + Math.sin(spin) * 0.15} draw={draw} s={s} />;
        })}
      </>
    );
  }

  if (shape === "cylinder") {
    const rx = 330;
    const ry = 90;
    const levels = [CY + 230, CY - 30, CY - 250];
    return (
      <>
        {levels.map((y, i) => (
          <ellipse key={i} cx={CX} cy={y} rx={rx * (i === 0 ? 1 : i === 1 ? 1 : 0.62)} ry={ry * (i === 2 ? 0.62 : 1)} {...s} {...strokeIn(draw)} />
        ))}
        {[-1, 1].map((d) => (
          <line key={d} x1={CX + d * rx} y1={levels[0]} x2={CX + d * rx} y2={levels[1]} stroke={LINE} strokeWidth={2} {...strokeIn(draw)} />
        ))}
        {[-1, 1].map((d) => (
          <line key={`u${d}`} x1={CX + d * rx * 0.62} y1={levels[1]} x2={CX + d * rx * 0.62} y2={levels[2]} stroke={LINE} strokeWidth={2} {...strokeIn(draw)} />
        ))}
        <Pulse cy={levels[0]} rx={rx} ry={ry} frame={frame} />
      </>
    );
  }

  if (shape === "dome") {
    const rx = 400;
    return (
      <>
        <path d={`M ${CX - rx} ${CY + 200} A ${rx} ${rx * 1.05} 0 0 1 ${CX + rx} ${CY + 200}`} {...s} {...strokeIn(draw)} />
        {[0.35, 0.7].map((f) => (
          <ellipse key={f} cx={CX} cy={CY + 200 - rx * f} rx={rx * Math.sqrt(1 - f * f)} ry={50 * Math.sqrt(1 - f * f)} fill="none" stroke={LINE} strokeWidth={1.4} {...strokeIn(draw)} />
        ))}
        <ellipse cx={CX} cy={CY + 200} rx={rx} ry={110} {...s} {...strokeIn(draw)} />
        <Pulse cy={CY + 200} rx={rx} ry={110} frame={frame} />
      </>
    );
  }

  // rings: radar
  const sweep = (frame * 4) % 360;
  return (
    <>
      {[120, 230, 340].map((r) => (
        <ellipse key={r} cx={CX} cy={CY + 120} rx={r} ry={r * 0.42} fill="none" stroke={LINE} strokeWidth={2} {...strokeIn(draw)} />
      ))}
      <line
        x1={CX}
        y1={CY + 120}
        x2={CX + Math.cos((sweep * Math.PI) / 180) * 340}
        y2={CY + 120 + Math.sin((sweep * Math.PI) / 180) * 340 * 0.42}
        stroke={CYAN}
        strokeWidth={3}
        opacity={draw}
      />
      <Pulse cy={CY + 120} rx={340} ry={143} frame={frame} />
    </>
  );
};

const IsoBox = ({
  a,
  b,
  y0,
  y1,
  theta,
  draw,
  s,
}: {
  a: number;
  b: number;
  y0: number;
  y1: number;
  theta: number;
  draw: number;
  s: { stroke: string; strokeWidth: number; fill: string };
}) => {
  const p = (x: number, y: number, z: number) => {
    const rx = x * Math.cos(theta) - z * Math.sin(theta);
    const rz = x * Math.sin(theta) + z * Math.cos(theta);
    return `${CX + rx * 0.95},${y + rz * 0.36}`;
  };
  const corners = [
    [-a, -b],
    [a, -b],
    [a, b],
    [-a, b],
  ];
  const ring = (y: number) => corners.map(([x, z]) => p(x, y, z)).join(" ");
  return (
    <>
      <polygon points={ring(y0)} {...s} {...strokeIn(draw)} />
      <polygon points={ring(y1)} {...s} {...strokeIn(draw)} />
      {corners.map(([x, z], i) => (
        <polyline key={i} points={`${p(x, y0, z)} ${p(x, y1, z)}`} fill="none" stroke={LINE} strokeWidth={1.6} {...strokeIn(draw)} />
      ))}
    </>
  );
};

/** Onda que se expande desde la base del volumen. */
const Pulse = ({ cy, rx, ry, frame }: { cy: number; rx: number; ry: number; frame: number }) => {
  const t = (frame % 45) / 45;
  return <ellipse cx={CX} cy={cy} rx={rx * (0.3 + t * 0.9)} ry={ry * (0.3 + t * 0.9)} fill="none" stroke={CYAN} strokeWidth={2} opacity={(1 - t) * 0.7} />;
};

const TAG_SLOTS = [
  { x: 70, y: 700, ax: 330, ay: 820 },
  { x: 650, y: 1180, ax: 760, ay: 1060 },
  { x: 70, y: 1260, ax: 300, ay: 1150 },
];

const Tag = ({ text, index, progress }: { text: string; index: number; progress: number }) => {
  const slot = TAG_SLOTS[index];
  const w = Math.max(220, text.length * 17 + 40);
  const x = index === 1 ? Math.min(slot.x, 1080 - 60 - w) : slot.x;
  const tx = x + (index === 1 ? 0 : w);
  return (
    <g opacity={progress}>
      <line x1={slot.ax} y1={slot.ay} x2={tx} y2={slot.y + 26} stroke={LINE} strokeWidth={1.5} {...strokeIn(progress)} />
      <circle cx={slot.ax} cy={slot.ay} r={6} fill={CYAN} />
      <rect x={x} y={slot.y} width={w} height={52} rx={6} fill="rgba(2,20,40,0.6)" stroke={LINE} strokeWidth={1.5} />
      <text x={x + 20} y={slot.y + 34} fill="#ffffff" fontFamily={MONO} fontSize={26} fontWeight={700} letterSpacing={1}>
        {text}
      </text>
    </g>
  );
};

const Brackets = ({ progress }: { progress: number }) => {
  const L = 60;
  const m = 46;
  const ys = [250, 1640];
  return (
    <g stroke={LINE} strokeWidth={3} fill="none" opacity={0.8 * progress}>
      {[m, 1080 - m].map((x, i) =>
        ys.map((y, j) => {
          const dx = i ? -L : L;
          const dy = j ? -L : L;
          return <polyline key={`${i}${j}`} points={`${x},${y + dy} ${x},${y} ${x + dx},${y}`} />;
        }),
      )}
    </g>
  );
};

const Title = ({ text, frame, fps }: { text: string; frame: number; fps: number }) => {
  if (!text) return null;
  const chars = Math.floor(interpolate(frame, [6, 6 + text.length * 1.2], [0, text.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const bar = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ top: 310, alignItems: "center", justifyContent: "flex-start" }}>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 64,
          letterSpacing: 4,
          color: "#ffffff",
          textShadow: `0 0 18px ${CYAN}, 0 0 4px ${CYAN}`,
          textAlign: "center",
          maxWidth: 940,
          lineHeight: 1.1,
        }}
      >
        {text.slice(0, chars)}
      </div>
      <div style={{ marginTop: 14, height: 4, width: 420 * bar, background: CYAN, boxShadow: `0 0 12px ${CYAN}` }} />
    </AbsoluteFill>
  );
};
