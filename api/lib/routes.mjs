const bySubdomain = new Map();

register({
  name: "portfolio",
  subdomain: null,
  upstream: "https://pages.caelondev.workers.dev",
  upstreamHost: "pages.caelondev.workers.dev",
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
  allowRobots: true,
  rewritePath: (pathname) => (pathname === "/" ? "/caelondev" : pathname),
});

register({
  name: "blog",
  subdomain: "blog",
  upstream: "https://blog.caelondev.workers.dev",
  upstreamHost: "blog.caelondev.workers.dev",
  proxy: true,
  rewritePath: (pathname) => pathname,
});

function register(route) {
  bySubdomain.set(route.subdomain, route);
}

function extractSubdomain(host) {
  const parts = host.split(".");
  if (parts.length <= 2) return null;
  return parts[0];
}

function getRoute(host) {
  return bySubdomain.get(extractSubdomain(host));
}

function listActiveSubdomains() {
  const names = [];
  for (const sub of bySubdomain.keys()) {
    names.push(sub === null ? "caelondev.net" : `${sub}.caelondev.net`);
  }
  return names;
}

export { bySubdomain, extractSubdomain, getRoute, listActiveSubdomains };
