// Tipos compartidos entre el agente (Node) y la composición (Remotion).

export type Camera = "push" | "pull" | "pan-left" | "pan-right" | "rise";

export type HudShape = "box" | "cylinder" | "dome" | "rings" | "stack" | "none";

/** HUD holográfico dibujado por código encima de clips de stock (los clips de IA ya lo traen integrado). */
export type SceneHud = {
  /** Título grande del HUD, p. ej. "CLASS C AIRSPACE". */
  title: string;
  /** Hasta 3 etiquetas cortas de datos, p. ej. "SFC – 4,000 FT". */
  labels: string[];
  shape: HudShape;
};

export type Scene = {
  id: string;
  /** Voz en off de la escena (≤ ~7 s para que la cubra un clip de 8 s). */
  narration: string;
  /** Prompt (en inglés) del clip de IA: sujeto fotorrealista + HUD holográfico integrado. */
  videoPrompt: string;
  /** Movimiento de cámara si la escena se resuelve con imagen fija o fondo procedural. */
  camera: Camera;
  /** Búsqueda en inglés para stock (Magnific/Freepik): 3–6 palabras de algo filmable. */
  stockQuery: string;
  /** Clip de stock elegido (id de Magnific/Freepik), si ya se curó. */
  stockId?: number;
  hud: SceneHud;
};

export type ReelScript = {
  /** Gancho del reel (también primera línea del caption). */
  title: string;
  caption: string;
  hashtags: string[];
  /** Estilo visual común que se añade a todos los prompts para mantener la continuidad. */
  visualStyle: string;
  scenes: Scene[];
};

export type Word = { text: string; start: number; end: number };

export type SceneTiming = {
  durationInFrames: number;
  /** Ruta relativa a la carpeta pública del trabajo, o "" si no hay voz. */
  audio: string;
  /** Palabras con tiempos en segundos, relativos al inicio de la escena. */
  words: Word[];
  /** Fondo de la escena (clip o imagen), relativo a la carpeta pública, o "". */
  media: string;
  mediaType: "image" | "video" | "";
  /** Duración del clip en segundos (para ralentizarlo si la narración es más larga). */
  mediaSeconds: number;
  /** Dibujar el HUD por código en esta escena. */
  hud: boolean;
};

export type Brand = { name: string; tagline: string };

export type ReelProps = {
  script: ReelScript;
  timings: SceneTiming[];
  music: string;
  /** Volumen de la música de fondo (0–1). */
  musicVolume?: number;
  /** Pista de voz continua para todo el reel (alternativa a un audio por escena), o "". */
  voiceover?: string;
  brand: Brand;
};
