async function testEndpoints() {
  console.log("=== RUNNING HTTP API RUNTIME VERIFICATION TESTS ===");
  const baseUrl = "http://localhost:3000";

  const endpoints = [
    { url: "/api/documents/load-more?projectId=non-existent-id&type=files", method: "GET", name: "Documents Load More (Unauth)" },
    { url: "/api/hr/reports/export", method: "GET", name: "HR Reports Export (Unauth)" },
    { url: "/api/reports/safety/plans", method: "GET", name: "Safety Plans List (Unauth)" },
    { url: "/api/supervision/weekly/test-id/export", method: "GET", name: "Supervision Export (Unauth)" },
    { url: "/api/documents/invalid-id/download", method: "GET", name: "Document Download Invalid ID (Unauth)" },
    { url: "/api/cron/documents-trash-cleanup", method: "GET", name: "Cron Cleanup without Secret" },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${baseUrl}${ep.url}`, { method: ep.method });
      console.log(`[${ep.name}] ${ep.method} ${ep.url} => Status: ${res.status} | StatusText: ${res.statusText}`);
    } catch (err: any) {
      console.log(`[${ep.name}] Connection failed: ${err.message}`);
    }
  }

  // Test Invalid JSON to POST endpoint
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid@example.com", password: "wrongpassword" })
    });
    const body = await res.json();
    console.log(`[Auth Login Test] Status: ${res.status} | Body:`, body);
  } catch (err: any) {
    console.log(`[Auth Login Test] Failed: ${err.message}`);
  }
}

testEndpoints().catch(console.error);
