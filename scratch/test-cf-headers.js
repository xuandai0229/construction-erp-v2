const TUNNEL_URL = 'https://seeing-students-law-affordable.trycloudflare.com';

async function testCloudflareHeaders() {
  console.log("Testing Cloudflare Tunnel headers...");
  const res = await fetch(`${TUNNEL_URL}/login`, { redirect: 'manual' });
  console.log("Login page status:", res.status);
}

testCloudflareHeaders();
