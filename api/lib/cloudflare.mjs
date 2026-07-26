function getClientIP(req) {
  return (
    req.headers["x-user-real-ip"] ||
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    "unknown"
  );
}

async function banIPCloudflare(ip) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE_ID}/firewall/access_rules/rules`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "block",
        configuration: { target: "ip", value: ip },
        notes: `honeypot trigger /__clankers @ ${new Date().toISOString()}`,
      }),
    },
  );
  const data = await res.json();
  if (!data.success) {
    console.error("Cloudflare ban failed:", data.errors);
  }
  return data.success;
}

export { getClientIP, banIPCloudflare };
