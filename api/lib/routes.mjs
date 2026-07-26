const bySubdomain = new Map();

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
  allowRobots: true,
  rewritePath: (pathname) => (pathname === "/" ? "/caelondev" : pathname),
});

register(
  codebergPage({
    name: "blog",
    subdomain: "blog",
    repoPath: "blog",
  }),
);

function register(route) {
  bySubdomain.set(route.subdomain, route);
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
