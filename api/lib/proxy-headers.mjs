import { getClientIP } from "./cloudflare.mjs";

function buildHeaders(req, route) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  headers.delete("accept-encoding");
  headers.delete("content-length");
  headers.delete("host");
  if (route.upstreamHost) headers.set("host", route.upstreamHost);

  // Overwrite (not trust-through) x-user-real-ip with the IP we resolve
  // ourselves right here, at the hop where cf-connecting-ip is still
  // trustworthy. Downstream (Render, which sits behind its own separate
  // Cloudflare zone) will stamp its own cf-connecting-ip reflecting THIS
  // proxy's outbound IP, not the visitor's - so we can't rely on anything
  // set past this point. This also prevents a client from spoofing
  // x-user-real-ip directly, since we never trust the incoming value.
  headers.set("x-user-real-ip", getClientIP(req));

  return headers;
}

function copyResponseHeaders(res, upstream) {
  upstream.headers.forEach((value, key) => {
    if (
      ["content-encoding", "content-length", "transfer-encoding"].includes(key)
    )
      return;

    if (key === "location") {
      try {
        const loc = new URL(value);
        res.setHeader("location", loc.pathname + loc.search);
      } catch {
        res.setHeader("location", value);
      }
      return;
    }

    res.setHeader(key, value);
  });
}

export { buildHeaders, copyResponseHeaders };
