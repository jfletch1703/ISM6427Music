import { suno, json } from "../lib/suno.mjs";

export default async () => {
  const r = await suno("/api/v1/generate/credit");
  return r.ok ? json({ credits: r.data }) : json({ error: r.error }, r.status);
};
export const config = { path: "/api/credits" };
