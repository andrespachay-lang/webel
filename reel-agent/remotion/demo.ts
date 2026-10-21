// Guion de ejemplo (recreación del reel de referencia) para previsualizar en Remotion Studio
// y probar el render sin claves de API.
import type { ReelProps, ReelScript, SceneTiming } from "./types";

export const demoScript: ReelScript = {
  title: "¿Qué significan realmente las clases A, B, C, D, E, F y G?",
  caption:
    "✈️ ¿Qué significan realmente las clases A, B, C, D, E, F y G? No todo el espacio aéreo se controla igual: cada clase cambia quién te separa, qué reglas aplican y si necesitas autorización.",
  hashtags: ["aviacion", "espacioaereo", "piloto", "avgeek", "atc", "aviation", "pilotlife", "aprendeaviacion"],
  visualStyle:
    "photorealistic, cinematic aerial cinematography, crisp daylight, futuristic holographic HUD infographic overlay in translucent blue and cyan, thin glowing leader lines, clean uppercase sans-serif data labels, green markers for VFR, orange for alerts",
  scenes: [
    {
      id: "gancho",
      narration: "¿Qué significan realmente las clases A, B, C, D, E, F y G? No todo el espacio aéreo se controla igual.",
      videoPrompt:
        "Wide aerial shot above scattered clouds and farmland, a white-and-navy A320 flies left to right, slow tracking camera. Stacked translucent holographic airspace boxes surround it, labeled 'CONTROLLED CLASS A (FL180-FL600)', 'CONTROLLED CLASS C', 'UNCONTROLLED CLASS G'. Other airliners in the distance with tiny flight tags 'FL300'.",
      camera: "push",
      stockQuery: "airplane flying above clouds",
      stockId: 7776980,
      hud: { title: "ICAO AIRSPACE CLASSES", labels: ["A · B · C · D", "E · F · G"], shape: "stack" },
    },
    {
      id: "oaci",
      narration: "La OACI divide el cielo en siete clases según el control y los servicios que recibe cada vuelo.",
      videoPrompt:
        "Same A320 seen from a closer three-quarter angle, holographic wireframe corridors and arrows showing flight paths, labels 'CORRIDOR 4A', 'FL300', 'ICAO AIRSPACE CLASSES', dotted lines connecting aircraft.",
      camera: "pan-left",
      stockQuery: "airplane flying at sunset above clouds",
      stockId: 8147981,
      hud: { title: "CONTROLLED VS UNCONTROLLED", labels: ["ATC SERVICE", "SEPARATION"], shape: "box" },
    },
    {
      id: "clase-a",
      narration: "Clase A: alta altitud, solo vuelos IFR. Control total y separación entre todas las aeronaves.",
      videoPrompt:
        "High altitude view from above the clouds, a giant translucent blue holographic cube labeled 'CLASS A AIRSPACE', three airliners inside with green separation rings, a vertical beam down to an 'ATC FACILITY' on the ground.",
      camera: "rise",
      stockQuery: "airplane contrail high altitude sky",
      stockId: 8351582,
      hud: { title: "CLASS A AIRSPACE", labels: ["FL180 – FL600", "IFR ONLY", "ATC CLEARANCE"], shape: "box" },
    },
    {
      id: "clase-b",
      narration: "Clase B: alrededor de los aeropuertos más transitados. IFR y VFR necesitan autorización.",
      videoPrompt:
        "Aerial view over a dense downtown skyline next to a major airport control tower, a huge holographic dome with concentric cyan rings, airliner tagged 'IFR FLIGHT 404' and small plane tagged 'VFR N567', green radar beam from the tower to both aircraft.",
      camera: "push",
      stockQuery: "airplane approaching city skyline",
      stockId: 9751756,
      hud: { title: "CLASS B AIRSPACE", labels: ["SFC – 10,000 FT", "CLEARANCE REQUIRED"], shape: "dome" },
    },
    {
      id: "clase-c",
      narration: "Clase C: aeropuertos medianos con radar. Separación IFR y servicio de tráfico para VFR.",
      videoPrompt:
        "Top-down 3D diagram view of an airport, two stacked holographic cylinders labeled 'CLASS C AIRSPACE', a blue business jet and two green VFR planes with rings, orange line labeled 'SEPARATION', small data panels 'DATA-to-VFR'.",
      camera: "pull",
      stockQuery: "busy airport terminal control tower aerial",
      stockId: 7691474,
      hud: { title: "CLASS C AIRSPACE", labels: ["SFC – 4,000 FT", "RADIO CONTACT"], shape: "cylinder" },
    },
    {
      id: "clase-d",
      narration: "Clase D: aeropuertos con torre. La torre coordina llegadas y salidas, pero no separa a los VFR.",
      videoPrompt:
        "Low aerial view of a regional airport runway, an A320 on final approach with green guidance path, translucent blue zone outlines on the ground, tags 'ARR A320 2500FT 150KTS' and 'DEP E190', orange traffic rings around a small plane.",
      camera: "pan-right",
      stockQuery: "airplane landing at airport",
      stockId: 3684308,
      hud: { title: "CLASS D AIRSPACE", labels: ["SFC – 2,500 FT", "CONTROL TOWER"], shape: "cylinder" },
    },
    {
      id: "clase-e",
      narration: "Clase E: espacio controlado para IFR. Los VFR pueden volar sin autorización.",
      videoPrompt:
        "Bird's-eye map-like view over countryside with a runway, a tall translucent blue cylinder labeled 'CLASS E AIRSPACE', a twin-engine plane tagged 'IFR' linked by dashed line to a control tower, a yellow light aircraft with a green 'TRAFFIC ALERT' ring.",
      camera: "rise",
      stockQuery: "small propeller plane flying blue sky",
      stockId: 9638036,
      hud: { title: "CLASS E AIRSPACE", labels: ["CONTROLLED · IFR", "VFR NO CLEARANCE"], shape: "box" },
    },
    {
      id: "clase-f",
      narration: "Clase F: espacio de asesoramiento. No hay control, solo información y avisos.",
      videoPrompt:
        "High aerial view over a rugged coastline, translucent orange-edged holographic box labeled 'CLASS F ADVISORY AREA', orange 'IFR' pin over a business jet, green 'VFR' pin over a small plane, cyan signal waves from an antenna labeled 'ADVISORY FACILITY'.",
      camera: "pan-left",
      stockQuery: "aerial coastline cliffs ocean",
      stockId: 9739880,
      hud: { title: "CLASS F ADVISORY", labels: ["ADVISORY ONLY", "NO ATC CONTROL"], shape: "rings" },
    },
    {
      id: "clase-g",
      narration: "Clase G: espacio no controlado. Se permiten IFR y VFR, y los pilotos se separan por sí mismos.",
      videoPrompt:
        "Low aerial view over green farmland and country roads, several small propeller planes including a yellow Piper Cub flying freely, faint translucent paths, no control tower in sight, warm afternoon light.",
      camera: "push",
      stockQuery: "small plane runway farm field",
      stockId: 8969833,
      hud: { title: "CLASS G AIRSPACE", labels: ["UNCONTROLLED", "SEE AND AVOID"], shape: "none" },
    },
    {
      id: "resumen",
      narration: "La diferencia está en cuánto control hay: de la A, con todo controlado, a la G, sin control.",
      videoPrompt:
        "Dark navy background, an exploded 3D holographic infographic tower of stacked airspace volumes from 'CLASS A' at the top to 'CLASS G UNCONTROLLED' at the bottom, tiny aircraft inside each level, glowing connection beams, small side labels 'MANDATORY IFR', 'ADVISORY', 'UNCONTROLLED'.",
      camera: "rise",
      stockQuery: "aviation radar screen airplane icons",
      stockId: 8167707,
      hud: { title: "AIRSPACE STRUCTURE", labels: ["MORE TRAFFIC", "MORE CONTROL"], shape: "stack" },
    },
    {
      id: "cierre",
      narration: "Esto mantiene el cielo seguro y ordenado. Síguenos para más aviación explicada.",
      videoPrompt:
        "Hero shot: the white-and-navy A320 flying straight toward camera above a sea of clouds, deep blue sky, sun glinting on the fuselage, pilots visible in the cockpit, slow push-in.",
      camera: "push",
      stockQuery: "airplane wing above clouds sunset",
      stockId: 9226047,
      hud: { title: "", labels: [], shape: "none" },
    },
  ],
};

const timings: SceneTiming[] = demoScript.scenes.map((s) => {
  const words = s.narration.split(/\s+/).map((text, j) => ({ text, start: j / 2.6, end: (j + 1) / 2.6 - 0.04 }));
  const seconds = Math.max(2.5, words.length / 2.6 + 0.3);
  return { durationInFrames: Math.round(seconds * 30), audio: "", words, media: "", mediaType: "", mediaSeconds: 0, hud: true };
});

export const demoProps: ReelProps = {
  script: demoScript,
  timings,
  music: "",
  brand: { name: "AVIACIÓN EXPLICADA", tagline: "CIENCIA DEL VUELO" },
};
