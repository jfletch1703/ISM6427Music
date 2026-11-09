// Shared helpers for talking to SunoAPI.org from Netlify Functions.
// The API key is read from the SUNO_API_KEY environment variable so it is never exposed to the browser.
export const SUNO_BASE = "https://api.sunoapi.org";

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

const ERROR_HINTS = {
  400: "Invalid parameters.",
  401: "Unauthorized — check the SUNO_API_KEY environment variable in Netlify.",
  405: "Rate limit exceeded. Please wait a moment.",
  413: "Prompt or lyrics too long.",
  429: "Insufficient credits on the SunoAPI.org account.",
  430: "Too many requests. Please try again shortly.",
  455: "SunoAPI.org is under maintenance. Try again later.",
  500: "SunoAPI.org server error.",
};

export async function suno(path, { method = "GET", body } = {}) {
  const key = process.env.SUNO_API_KEY;
  if (!key) {
    return { ok: false, status: 500, error: "Server is missing SUNO_API_KEY. Add it in Netlify → Site configuration → Environment variables." };
  }
  let res;
  try {
    res = await fetch(SUNO_BASE + path, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return { ok: false, status: 502, error: "Could not reach SunoAPI.org: " + e.message };
  }
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!data) return { ok: false, status: 502, error: `Unexpected response from SunoAPI.org (HTTP ${res.status}).` };
  if (data.code !== 200) {
    return { ok: false, status: 400, error: data.msg && data.msg !== "success" ? data.msg : (ERROR_HINTS[data.code] || "Request failed."), code: data.code };
  }
  return { ok: true, data: data.data };
}

// Callback URL is required by the API; we poll for results instead, so it just points at a no-op endpoint.
export function callbackUrl(req) {
  const origin = process.env.URL || new URL(req.url).origin;
  return `${origin}/api/callback`;
}
