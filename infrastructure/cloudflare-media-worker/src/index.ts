export interface Env {
  MEDIA_BUCKET: R2Bucket;
}

const mediaPath = "/media/";

function objectKey(url: URL) {
  const encoded = url.pathname.startsWith(mediaPath)
    ? url.pathname.slice(mediaPath.length)
    : "";
  const key = decodeURIComponent(encoded);
  if (!key || key.includes("..") || key.startsWith("/") || key.includes("\\")) {
    return null;
  }
  return key;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const url = new URL(request.url);
    const key = objectKey(url);
    if (!key) return new Response("Not found", { status: 404 });

    const object = await env.MEDIA_BUCKET.get(key);
    if (!object) return new Response("Not found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "private, max-age=86400");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  },
};
