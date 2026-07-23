import { Readable } from "node:stream";

const routables = new Map();

function register(routable) {
  routables.set(routable.endpoint, routable);
}

register({
  endpoint: "/",
  cname: "https://caelondev.github.io/caelondev",
  match(pathname) {
    return pathname === "/" || pathname.startsWith("/caelondev");
  },
  resolve(pathname) {
    const stripped =
      pathname === "/" ? "" : pathname.replace(/^\/caelondev/, "");
    return this.cname + stripped;
  },
});

export default async function handler(req, res) {
  const pathname = req.url.split("?")[0];

  for (const routable of routables.values()) {
    if (routable.match(pathname)) {
      const url = routable.resolve(pathname);

      const headers = { ...req.headers };
      delete headers["accept-encoding"];

      const upstream = await fetch(url, { headers });

      upstream.headers.forEach((value, key) => {
        if (key === "content-encoding") return;
        res.setHeader(key, value);
      });
      res.status(upstream.status);

      if (!upstream.body) {
        res.end();
        return;
      }

      Readable.fromWeb(upstream.body).pipe(res);
      return;
    }
  }

  res.status(404).send("Not found");
}
