import { suno, json } from "../lib/suno.mjs";

const FAILED = ["CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "CALLBACK_EXCEPTION", "SENSITIVE_WORD_ERROR"];

// Normalise a track; the API has used both snake_case and camelCase keys.
const pick = (t, ...keys) => keys.map((k) => t[k]).find((v) => v);
function normaliseTrack(t) {
  return {
    id: t.id,
    title: t.title || "Untitled",
    tags: t.tags || "",
    duration: t.duration || null,
    lyrics: t.prompt || "",
    audioUrl: pick(t, "audioUrl", "audio_url", "sourceAudioUrl", "source_audio_url") || "",
    streamUrl: pick(t, "streamAudioUrl", "stream_audio_url", "sourceStreamAudioUrl", "source_stream_audio_url") || "",
    imageUrl: pick(t, "imageUrl", "image_url", "sourceImageUrl", "source_image_url") || "",
  };
}

export default async (req) => {
  const taskId = new URL(req.url).searchParams.get("taskId");
  if (!taskId) return json({ error: "taskId is required" }, 400);

  const r = await suno(`/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`);
  if (!r.ok) return json({ error: r.error }, r.status);

  const d = r.data || {};
  const status = d.status || "PENDING";
  const tracks = (d.response?.sunoData || []).map(normaliseTrack);
  return json({
    taskId,
    status,
    done: status === "SUCCESS",
    failed: FAILED.includes(status),
    error: d.errorMessage || (status === "SENSITIVE_WORD_ERROR" ? "Your prompt contained words the model won't accept. Try rephrasing (artist names are not allowed)." : null),
    tracks,
  });
};
export const config = { path: "/api/status" };
