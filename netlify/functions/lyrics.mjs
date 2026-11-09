import { suno, json, callbackUrl } from "../lib/suno.mjs";

// POST { prompt } → start lyrics task.  GET ?taskId= → lyrics results.
export default async (req) => {
  if (req.method === "POST") {
    let body = {};
    try { body = await req.json(); } catch {}
    const idea = String(body.prompt || "").trim();
    if (!idea) return json({ error: "Describe what the song is about." }, 400);
    const prompt = `Soulful romantic R&B love song, heartfelt and poetic: ${idea}`.slice(0, 200);
    const r = await suno("/api/v1/lyrics", { method: "POST", body: { prompt, callBackUrl: callbackUrl(req) } });
    return r.ok ? json({ taskId: r.data?.taskId }) : json({ error: r.error }, r.status);
  }

  const taskId = new URL(req.url).searchParams.get("taskId");
  if (!taskId) return json({ error: "taskId is required" }, 400);
  const r = await suno(`/api/v1/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`);
  if (!r.ok) return json({ error: r.error }, r.status);
  const d = r.data || {};
  const items = (d.response?.data || []).filter((x) => x.text).map((x) => ({ title: x.title || "", text: x.text }));
  const status = d.status || "PENDING";
  return json({
    status,
    done: status === "SUCCESS" || items.length > 0,
    failed: /FAILED|ERROR|EXCEPTION/.test(status),
    error: d.errorMessage || null,
    lyrics: items,
  });
};
export const config = { path: "/api/lyrics" };
