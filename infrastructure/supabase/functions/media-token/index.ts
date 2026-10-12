const encoder = new TextEncoder();

const base64Url = (value: Uint8Array) =>
  btoa(String.fromCharCode(...value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function sign(input: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(input))));
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401 });
  const user = await fetch(`${Deno.env.get("SUPABASE_URL")}/auth/v1/user`, {
    headers: { Authorization: authorization, apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "" },
  });
  if (!user.ok) return Response.json({ code: "SESSION_INVALID" }, { status: 401 });
  const { id } = await user.json();
  if (typeof id !== "string" || !id) return Response.json({ code: "SESSION_INVALID" }, { status: 401 });
  const { filename } = await request.json().catch(() => ({}));
  if (typeof filename !== "string" || !filename || filename.includes("..") || filename.includes("\\") || filename.startsWith("/")) return new Response("Invalid filename", { status: 400 });
  const secret = Deno.env.get("MEDIA_TOKEN_SECRET");
  if (!secret) return Response.json({ code: "MEDIA_SECRET_MISSING" }, { status: 503 });
  const expiresAt = Math.floor(Date.now() / 1000) + 120;
  const header = base64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = base64Url(encoder.encode(JSON.stringify({ sub: id, key: filename, aud: "ezprawko-media", exp: expiresAt })));
  const token = `${header}.${payload}.${await sign(`${header}.${payload}`, secret)}`;
  return Response.json({ token, expiresAt }, { headers: { "Cache-Control": "no-store" } });
});
