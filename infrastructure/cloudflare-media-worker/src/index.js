const mediaPath = "/media/";
const textEncoder = new TextEncoder();

function objectKey(url) {
  const encoded = url.pathname.startsWith(mediaPath)
    ? url.pathname.slice(mediaPath.length)
    : "";
  const key = decodeURIComponent(encoded);
  return !key || key.includes("..") || key.startsWith("/") || key.includes("\\")
    ? null
    : key;
}

function base64UrlBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function base64UrlJson(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlBytes(value)));
}

async function validMediaGrant(request, key, secret) {
  const header = request.headers.get("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : new URL(request.url).searchParams.get("token");
  if (!token || !secret) return false;
  const [encodedHeader, encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature || extra) return false;
  try {
    const jwtHeader = base64UrlJson(encodedHeader);
    const claims = base64UrlJson(encodedPayload);
    if (jwtHeader.alg !== "HS256" || claims.aud !== "ezprawko-media" || claims.key !== key || !claims.sub || claims.exp * 1000 <= Date.now()) return false;
    const cryptoKey = await crypto.subtle.importKey("raw", textEncoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    return crypto.subtle.verify("HMAC", cryptoKey, base64UrlBytes(encodedSignature), textEncoder.encode(`${encodedHeader}.${encodedPayload}`));
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }
    const key = objectKey(new URL(request.url));
    if (!key) return new Response("Not found", { status: 404 });
    if (!(await validMediaGrant(request, key, env.MEDIA_TOKEN_SECRET))) {
      return new Response("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
    }
    const object = await env.MEDIA_BUCKET.get(key);
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers({
      "Cache-Control": "private, max-age=86400",
      ETag: object.httpEtag,
      "X-Content-Type-Options": "nosniff",
    });
    object.writeHttpMetadata(headers);
    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  },
};
