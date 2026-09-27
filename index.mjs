import { getRoute } from "./lib/routes.mjs";
import { buildHeaders, copyResponseHeaders } from "./lib/proxy-headers.mjs";
import { buildRobotsTxt } from "./lib/robots.mjs";
import { getClientIP, banIPCloudflare } from "./lib/cloudflare.mjs";
import {
  isEntryPath,
  isTriggerPath,
  buildWarningPage,
  buildBannedPage,
} from "./lib/honeypot.mjs";
import { handleApiRequest } from "./lib/api.mjs";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname;
    const pathname = url.pathname;
    const ip = getClientIP(request);

    if (host === "api.caelondev.net") {
      const apiRes = await handleApiRequest(request, pathname, env);
      apiRes.headers.set("Access-Control-Allow-Origin", "*");
      return apiRes;
    }

    if (isEntryPath(pathname)) {
      return new Response(buildWarningPage(), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (isTriggerPath(pathname)) {
      ctx.waitUntil(banIPCloudflare(ip, env));
      return new Response(buildBannedPage(ip), {
        status: 403,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.searchParams.has("__debug")) {
      const route = getRoute(host);
      const rewritten = route ? route.rewritePath(pathname, request) : "N/A";
      const targetUrl = route
        ? route.upstream + rewritten + (url.search || "")
        : "N/A";

      return new Response(
        [
          `=== DEBUG ===`,
          `host: ${host}`,
          `route found: ${route ? "yes" : "no"}`,
          route ? `route name: ${route.name}` : "",
          `pathname: ${pathname}`,
          `query: ${url.search.slice(1) || "(empty)"}`,
          `rewritten path: ${rewritten}`,
          `target url: ${targetUrl}`,
          `upstream: ${route ? route.upstream : "N/A"}`,
        ]
          .filter(Boolean)
          .join("\n"),
        {
          status: 200,
          headers: { "content-type": "text/plain; charset=utf-8" },
        },
      );
    }

    const route = getRoute(host);

    if (!route) {
      return new Response("Not found", { status: 404 });
    }

    if (pathname === "/robots.txt" && !route.allowRobots) {
      return new Response(buildRobotsTxt(), {
        status: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    const rewritten = route.rewritePath(pathname, request);
    const query = url.search || "";

    if (!route.proxy) {
      return Response.redirect(route.upstream + rewritten + query, 308);
    }

    const targetUrl = route.upstream + rewritten + query;
    const hasBody = !["GET", "HEAD"].includes(request.method);
    const headers = buildHeaders(request, route);

    let upstream;
    try {
      upstream = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        redirect: "manual",
      });
    } catch (err) {
      return new Response(`Upstream fetch failed: ${err.message}`, {
        status: 502,
      });
    }

    const responseHeaders = copyResponseHeaders(upstream);
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  },
};
