import { getClientIP } from "./cloudflare.mjs";

const LASTFM_USERNAME = "caelondev";
const BLOG_BACKEND_URL = "https://blog-backend-theta-eight.vercel.app/";
const CODEBERG_COMMITS_URL =
  "https://codeberg-commits.pages.dev/api/latest-commit";
const DEFAULT_CODEBERG_USERNAME = "caelondev";

async function handleLastfm(env) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USERNAME}&api_key=${env.LASTFM_API_KEY}&format=json&limit=1`;

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Upstream fetch failed: ${err.message}` }),
      { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
}

async function handleCodebergCommits(request) {
  const reqUrl = new URL(request.url);
  const username = reqUrl.searchParams.get("user") || DEFAULT_CODEBERG_USERNAME;
  const url = `${CODEBERG_COMMITS_URL}?user=${username}`;

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    return new Response(JSON.stringify(data), {
      status: upstream.status,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Upstream fetch failed: ${err.message}` }),
      { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
}

async function handleBlog(request, pathname) {
  const reqUrl = new URL(request.url);
  const targetUrl = `${BLOG_BACKEND_URL}${pathname}${reqUrl.search}`;

  try {
    const body = ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.text(); // pass through raw; avoids re-JSON.stringifying an already-parsed body

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: {
        "content-type": request.headers.get("content-type") || "application/json",
        "x-user-real-ip": getClientIP(request),
        "user-agent": request.headers.get("user-agent") || "",
        "x-trace-id": request.headers.get("x-trace-id") || "",
        "x-turnstile-token": request.headers.get("x-turnstile-token") || "",
      },
      body,
    });

    const buf = await upstream.arrayBuffer();
    return new Response(buf, {
      status: upstream.status,
      headers: {
        "content-type": upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Blog backend fetch failed: ${err.message}` }),
      { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
    );
  }
}

async function handleApiRequest(request, pathname, env) {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-turnstile-token, x-trace-id",
      },
    });
  }

  if (pathname === "/lastfm") return handleLastfm(env);
  if (pathname === "/codeberg-commits") return handleCodebergCommits(request);
  if (pathname.startsWith("/blog")) return handleBlog(request, pathname);

  return new Response(JSON.stringify({ error: "Unknown API route" }), {
    status: 404,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export { handleApiRequest };
