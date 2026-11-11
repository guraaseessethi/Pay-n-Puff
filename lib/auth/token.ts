/**
 * Tiny signed-token format: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
 * Used for the verified-customer cookie, the demo staff cookie, settings, and demo magic links.
 * Web Crypto only, so it runs anywhere Next runs.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const keyCache = new Map<string, Promise<CryptoKey>>();

function key(secret: string): Promise<CryptoKey> {
  let k = keyCache.get(secret);
  if (!k) {
    k = crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    keyCache.set(secret, k);
  }
  return k;
}

export interface TokenBody {
  /** Purpose. A token for one purpose is never accepted for another. */
  typ: string;
  /** Expiry, seconds since epoch. */
  exp: number;
}

export async function sign<T extends TokenBody>(payload: T, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(body)));
  return `${body}.${b64url(sig)}`;
}

/** Returns the payload if the signature is valid, the purpose matches and it hasn't expired. Otherwise null. */
export async function verify<T extends TokenBody>(token: string | undefined | null, typ: string, secret: string, now = Date.now()): Promise<T | null> {
  if (!token || token.length > 4096) return null;
  const dot = token.indexOf(".");
  if (dot < 1 || dot !== token.lastIndexOf(".")) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let ok = false;
  try {
    ok = await crypto.subtle.verify("HMAC", await key(secret), fromB64url(sig) as BufferSource, enc.encode(body));
  } catch {
    return null;
  }
  if (!ok) return null;
  let payload: T;
  try {
    payload = JSON.parse(dec.decode(fromB64url(body))) as T;
  } catch {
    return null;
  }
  if (payload.typ !== typ) return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
  return payload;
}

/**
 * The signing secret. Required in production; a fixed dev-only value is used for local dev and tests
 * so `pnpm dev` works out of the box. The dev value is useless in production because we refuse it there.
 */
export function cookieSecret(): string {
  const s = process.env.VERIFY_COOKIE_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("VERIFY_COOKIE_SECRET must be set (32+ characters). See .env.example.");
  }
  return "dev-only-secret-do-not-use-in-production-0000";
}
