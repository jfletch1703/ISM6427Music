// SunoAPI.org requires a callBackUrl. The app polls for status, so this endpoint only acknowledges.
export default async () => new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
export const config = { path: "/api/callback" };
