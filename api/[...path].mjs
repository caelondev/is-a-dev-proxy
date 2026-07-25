import { Readable } from "node:stream";

const bySubdomain = new Map();

function register(route) {
  bySubdomain.set(route.subdomain, route);
}

register({
  name: "portfolio",
  subdomain: null,
  upstream: "https://caelondev.codeberg.page/",
  proxy: true,
  rewritePath: (pathname) =>
    pathname === "/" ? "/" : pathname.replace(/^\/caelondev/, ""),
});

register({
  name: "git",
  subdomain: "git",
  upstream: "https://codeberg.org",
  upstreamHost: "codeberg.org",
  proxy: true,
  rewritePath: (pathname) => (pathname === "/" ? "/caelondev" : pathname),
});

register(
  codebergPage({
    name: "blog",
    subdomain: "blog",
    repoPath: "blog",
  }),
);

const IS_A_DEV_SUFFIX = "is-a.dev";

function isDeadHost(host) {
  return host === IS_A_DEV_SUFFIX || host.endsWith("." + IS_A_DEV_SUFFIX);
}

function codebergPage({ name, subdomain, repoPath = null }) {
  const upstreamHost = "caelondev.codeberg.page";
  const base = repoPath ? `/${repoPath}` : "";

  return {
    name,
    subdomain,
    upstream: `https://${upstreamHost}`,
    upstreamHost,
    proxy: true,
    rewritePath: (pathname) => {
      if (pathname === "/") return `${base}/`;
      if (pathname.startsWith(base + "/")) return pathname; 
      return `${base}${pathname}`;
    },
  };
}

function extractSubdomain(host) {
  const parts = host.split(".");
  if (parts.length <= 2) return null;
  return parts[0];
}

function listActiveSubdomains() {
  const names = [];
  for (const sub of bySubdomain.keys()) {
    names.push(sub === null ? "caelondev.net" : `${sub}.caelondev.net`);
  }
  return names;
}

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

export default async function handler(req, res) {
  const host = req.headers.host;
  const [pathname, query = ""] = req.url.split("?");

  if (isDeadHost(host)) {
    const fullUrl = `https://${host}${pathname}${query ? `?${query}` : ""}`;
    res.status(410);
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.send(
      `${fullUrl} is currently unsupported\n\nActive subdomains:\n${listActiveSubdomains()
        .map((s) => `- ${s}`)
        .join("\n")}`,
    );
    return;
  }

  const subdomain = extractSubdomain(host);
  const route = bySubdomain.get(subdomain);

  if (!route) {
    res.status(404).send("Not found");
    return;
  }

  const rewritten = route.rewritePath(pathname);
  const query_ = query ? `?${query}` : "";

  if (!route.proxy) {
    res.writeHead(308, { Location: route.upstream + rewritten + query_ });
    res.end();
    return;
  }

  const targetUrl = route.upstream + rewritten + query_;
  const hasBody = !["GET", "HEAD"].includes(req.method);
  const headers = buildHeaders(req, route);

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? "half" : undefined,
      redirect: "manual",
    });
  } catch (err) {
    res.status(502).send(`Upstream fetch failed: ${err.message}`);
    return;
  }

  copyResponseHeaders(res, upstream);
  res.status(upstream.status);

  if (!upstream.body) {
    res.end();
    return;
  }

  Readable.fromWeb(upstream.body).pipe(res);
}
