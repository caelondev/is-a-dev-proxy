function getClientIP(request) {
  return (
    request.headers.get("x-user-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown"
  );
}

function isIPv6(ip) {
  return ip.includes(":");
}

async function banIPCloudflare(ip, env) {
  const target = isIPv6(ip) ? "ip6" : "ip";

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/firewall/access_rules/rules`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: "block",
        configuration: { target, value: ip },
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
