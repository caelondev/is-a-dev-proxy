const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_USERNAME = "caelondev";

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

async function handleApiRequest(req, res, pathname) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204);
    res.end();
    return;
  }

  switch (pathname) {
    case "/lastfm":
      await handleLastfm(res);
      return;
    default:
      res.status(404);
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.send(JSON.stringify({ error: "Unknown API route" }));
      return;
  }
}

export { handleApiRequest };
