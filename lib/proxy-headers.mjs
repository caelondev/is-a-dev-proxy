import { getClientIP } from "./cloudflare.mjs";

function buildHeaders(request, route) {
  const headers = new Headers(request.headers);
  headers.delete("accept-encoding");
  headers.delete("content-length");
  headers.delete("host");
  if (route.upstreamHost) headers.set("host", route.upstreamHost);

  headers.set("x-user-real-ip", getClientIP(request));

  return headers;
}

function copyResponseHeaders(upstream) {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (
      ["content-encoding", "content-length", "transfer-encoding"].includes(key)
    )
      return;

    if (key === "location") {
      try {
        const loc = new URL(value);
        headers.set("location", loc.pathname + loc.search);
      } catch {
        headers.set("location", value);
      }
      return;
    }

    headers.set(key, value);
  });
  return headers;
}

export { buildHeaders, copyResponseHeaders };
