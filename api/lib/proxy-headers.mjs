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
