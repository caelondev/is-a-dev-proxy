import { Readable } from "node:stream";
import { getRoute } from "./lib/routes.mjs";
import { buildHeaders, copyResponseHeaders, isCaelondevOrigin } from "./lib/proxy-headers.mjs";
import { buildRobotsTxt } from "./lib/robots.mjs";
import { getClientIP, banIPCloudflare } from "./lib/cloudflare.mjs";
import {
  isEntryPath,
  isTriggerPath,
  buildWarningPage,
  buildBannedPage,
} from "./lib/honeypot.mjs";

export default async function handler(req, res) {
  const host = req.headers.host;
  const [pathname, query = ""] = req.url.split("?");
  const ip = getClientIP(req);

  if (isEntryPath(pathname)) {
    res.status(200);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(buildWarningPage());
    return;
  }

  if (isTriggerPath(pathname)) {
    res.status(403);
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.send(buildBannedPage(ip));
    await banIPCloudflare(ip);
    return;
  }

  const searchParams = new URLSearchParams(query);
  if (searchParams.has("__debug")) {
    const route = getRoute(host);
    const rewritten = route ? route.rewritePath(pathname) : "N/A";
    const targetUrl = route
      ? route.upstream + rewritten + (query ? `?${query}` : "")
      : "N/A";

    res.status(200);
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.send(
      [
        `=== DEBUG ===`,
        `host: ${host}`,
        `route found: ${route ? "yes" : "no"}`,
        route ? `route name: ${route.name}` : "",
        `pathname: ${pathname}`,
        `query: ${query || "(empty)"}`,
        `rewritten path: ${rewritten}`,
        `target url: ${targetUrl}`,
        `upstream: ${route ? route.upstream : "N/A"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return;
  }

  const route = getRoute(host);

  if (!route) {
    res.status(404).send("Not found");
    return;
  }

  if (pathname === "/robots.txt" && !route.allowRobots) {
    res.status(200);
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.send(buildRobotsTxt());
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

  const origin = req.headers.origin;
  if (isCaelondevOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.status(upstream.status);

  if (!upstream.body) {
    res.end();
    return;
  }

  Readable.fromWeb(upstream.body).pipe(res);
}
