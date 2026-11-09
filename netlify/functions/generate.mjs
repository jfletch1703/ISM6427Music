import { suno, json, callbackUrl } from "../lib/suno.mjs";

// Core sound: warm, piano-led, gospel-rooted contemporary R&B in the spirit of John Legend.
// Suno rejects real artist names, so the style is described by its musical traits instead.
const BASE_STYLE =
  "soulful contemporary R&B, piano-driven, rich jazzy chord voicings, neo-soul, heartfelt romantic, live drums, warm bass, intimate, polished modern production";

const VIBES = {
  ballad: "slow piano ballad, grand piano front and center, lush strings swell, emotional crescendo, 68 bpm",
  gospel: "gospel soul, Hammond organ, church choir backing vocals, hand claps, uplifting, call and response",
  slowjam: "late-night slow jam, sultry, Rhodes electric piano, finger snaps, smooth groove, 72 bpm",
  neosoul: "neo-soul groove, laid-back swing, Rhodes, muted guitar licks, head-nodding pocket, 88 bpm",
  wedding: "first dance wedding song, tender, timeless, acoustic piano and soft strings, devoted love lyrics",
  heartbreak: "heartbreak ballad, melancholy, minor chords, aching vocals, sparse piano, vulnerable",
  uptempo: "uptempo feel-good R&B, retro Motown-inspired, horns, tambourine, bright and joyful, 104 bpm",
};

const NEGATIVE = "heavy metal, EDM, dubstep, trap hi-hats, screaming, harsh distortion, heavy autotune, country twang";

const clamp = (s, n) => String(s || "").trim().slice(0, n);

export default async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  let b = {};
  try { b = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const vibe = VIBES[b.vibe] || VIBES.ballad;
  const extra = clamp(b.extraStyle, 200);
  const female = b.vocalGender === "f";
  const voice = b.instrumental ? "instrumental, no vocals"
    : female ? "warm soulful female vocals with gospel runs" : "warm smooth male tenor vocals with gospel runs and falsetto";
  const style = clamp([BASE_STYLE, voice, vibe, extra].filter(Boolean).join(", "), 1000);
  const description = clamp(b.description, 2500);
  const lyrics = clamp(b.lyrics, 5000);
  const title = clamp(b.title, 80);
  const instrumental = !!b.instrumental;
  const model = ["V6", "V6_WILD", "V6_MINI"].includes(b.model) ? b.model : "V6";

  if (!description && !lyrics) return json({ error: "Describe your song or paste some lyrics." }, 400);

  let payload;
  if (lyrics || instrumental) {
    // Custom mode: your own lyrics (or an instrumental) with full control of title, style and vocals.
    payload = {
      customMode: true,
      instrumental,
      model,
      style,
      negativeTags: NEGATIVE,
      styleWeight: 0.75,
      callBackUrl: callbackUrl(req),
    };
    if (title) payload.title = title;
    if (!instrumental) {
      payload.lyrics = lyrics;
      payload.vocalGender = female ? "f" : "m";
    }
  } else {
    // Simple mode: Suno writes the lyrics from your idea.
    payload = {
      customMode: false,
      instrumental: false,
      model,
      prompt: clamp(`${description}. Soulful piano-led R&B love song with ${female ? "warm female" : "warm male"} vocals.`, 3000),
      style,
      callBackUrl: callbackUrl(req),
    };
  }

  const r = await suno("/api/v1/generate", { method: "POST", body: payload });
  return r.ok ? json({ taskId: r.data?.taskId, mode: payload.customMode ? "custom" : "simple" }) : json({ error: r.error }, r.status);
};
export const config = { path: "/api/generate" };
