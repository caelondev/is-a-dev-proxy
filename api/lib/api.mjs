import { getClientIP } from "./cloudflare.mjs";

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USERNAME = "caelondev";
const BLOG_BACKEND_URL = "https://blog-backend-7yck.onrender.com";

async function handleLastfm(res) {
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USERNAME}&api_key=${LASTFM_API_KEY}&format=json&limit=1`;

  try {
    const upstream = await fetch(url);
    const data = await upstream.json();
    res.status(upstream.status);
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.send(JSON.stringify(data));
  } catch (err) {
    res.status(502);
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.send(
      JSON.stringify({ error: `Upstream fetch failed: ${err.message}` }),
    );
  }
}

async function handleBlog(req, res, pathname) {
  const targetUrl = `${BLOG_BACKEND_URL}${pathname}${req.url.includes("?") ? "?" + req.url.split("?")[1] : ""}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: {
        "content-type": req.headers["content-type"] || "application/json",
        "x-user-real-ip": getClientIP(req),
        "user-agent": req.headers["user-agent"] || "",
        "x-trace-id": req.headers["x-trace-id"] || "",
        "x-turnstile-token": req.headers["x-turnstile-token"] || "",
      },
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : JSON.stringify(req.body),
    });

    const data = await upstream.text();
    res.status(upstream.status);
    res.setHeader(
      "content-type",
      upstream.headers.get("content-type") || "application/json",
    );
    res.send(data);
  } catch (err) {
    res.status(502);
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.send(
      JSON.stringify({ error: `Blog backend fetch failed: ${err.message}` }),
    );
  }
}

async function handleApiRequest(req, res, pathname) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, x-turnstile-token, x-trace-id",
    );
    res.status(204);
    res.end();
    return;
  }

  if (pathname === "/lastfm") {
    await handleLastfm(res);
    return;
  }

  if (pathname.startsWith("/blog")) {
    await handleBlog(req, res, pathname);
    return;
  }

  res.status(404);
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.send(JSON.stringify({ error: "Unknown API route" }));
}

export { handleApiRequest };
