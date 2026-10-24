// Shared-password access for the whole app. Runs in the edge middleware and in route handlers,
// so it only uses Web Crypto. The session cookie holds an HMAC derived from APP_PASSWORD:
// changing the password logs everyone out.

export const SESSION_COOKIE = "ti_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function appPassword(): string | null {
  const p = process.env.APP_PASSWORD?.trim();
  return p ? p : null;
}

function b64url(buf: ArrayBuffer) {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(key: string, msg: string) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}

export function sessionToken(password: string) {
  return hmac(password, "topline-intake-session-v1");
}

/** Constant-time comparison of two strings of possibly different length. */
export function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function isValidSession(cookie: string | undefined) {
  const pw = appPassword();
  if (!pw || !cookie) return false;
  return safeEqual(cookie, await sessionToken(pw));
}
