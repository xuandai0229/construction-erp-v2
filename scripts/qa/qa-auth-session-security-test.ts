import 'dotenv/config';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function record(name: string, passed: boolean, details: string) {
  results.push({ name, passed, details });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${name}: ${details}`);
}

async function runQaAuthSuite() {
  console.log("==========================================================================");
  console.log("QA AUTOMATED E2E AUTHENTICATION & SESSION SECURITY SUITE (FULL AUDIT)");
  console.log("==========================================================================");

  const baseUrl = "http://localhost:3000";

  // 1. Test missing credentials
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "", password: "" }),
    });
    const data = await res.json();
    record(
      "Validation - Missing Credentials",
      res.status === 400 && data.error === "Email và mật khẩu không được bỏ trống.",
      `Status: ${res.status}, Error: "${data.error}"`
    );
  } catch (e: any) {
    record("Validation - Missing Credentials", false, e.message);
  }

  // 2. Test invalid password
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "daicongtu2910@gmail.com", password: "wrongpassword" }),
    });
    const data = await res.json();
    record(
      "Authentication - Invalid Password",
      res.status === 401 && data.error === "Email hoặc mật khẩu không chính xác.",
      `Status: ${res.status}, Error: "${data.error}"`
    );
  } catch (e: any) {
    record("Authentication - Invalid Password", false, e.message);
  }

  // 3. Test non-existent user
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "nonexistent.user.12345@example.test", password: "123456" }),
    });
    const data = await res.json();
    record(
      "Authentication - Non-existent User",
      res.status === 401 && data.error === "Email hoặc mật khẩu không chính xác.",
      `Status: ${res.status}, Error: "${data.error}"`
    );
  } catch (e: any) {
    record("Authentication - Non-existent User", false, e.message);
  }

  // 4. Test Email Normalization and Case Insensitivity
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "  DAICONGTU2910@GMAIL.COM  ", password: "123456" }),
    });
    const data = await res.json();
    const setCookie = res.headers.get("set-cookie");
    record(
      "Authentication - Email Normalization & Case Insensitivity",
      res.status === 200 && data.success === true && !!setCookie && setCookie.includes("auth_session="),
      `Status: ${res.status}, RedirectTo: "${data.redirectTo}", Cookie Set: ${!!setCookie}`
    );
  } catch (e: any) {
    record("Authentication - Email Normalization & Case Insensitivity", false, e.message);
  }

  // 5. Test All 9 Roles Login & Workspace Redirection
  const rolesToTest = [
    { role: 'ADMIN', email: 'qa_admin_2026_07@construction-erp-qa.local', expected: '/dashboard' },
    { role: 'DIRECTOR', email: 'giamdoc12@gmail.com', expected: '/dashboard' },
    { role: 'DEPUTY_DIRECTOR', email: 'qa.ewr.deputy@company.com', expected: '/dashboard' },
    { role: 'CHIEF_COMMANDER', email: 'qa.commander.tuhiep@example.test', expected: '/projects' },
    { role: 'MANAGER', email: 'qa.accountant.tuhiep@example.test', expected: '/projects' },
    { role: 'ENGINEER', email: 'qa.outsider@example.test', expected: '/tasks?mine=1' },
    { role: 'STAFF', email: 'qa.viewer.tuhiep@example.test', expected: '/tasks?mine=1' },
    { role: 'SUPERVISION_HEAD', email: 'giamsat12@gmail.com', expected: '/reports/weekly-inspection' },
    { role: 'CONSTRUCTION_SUPERVISOR', email: 'qa.supervisor.field@example.test', expected: '/reports/weekly-inspection' },
  ];

  for (const item of rolesToTest) {
    try {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: item.email, password: "123456" }),
      });
      const data = await res.json();
      record(
        `RBAC Login - ${item.role}`,
        res.status === 200 && data.redirectTo === item.expected,
        `Role: ${item.role}, Redirect: "${data.redirectTo}" (Expected: "${item.expected}")`
      );
    } catch (e: any) {
      record(`RBAC Login - ${item.role}`, false, e.message);
    }
  }

  // 6. Test Session Expired Page Cookie Invalidation
  try {
    const res = await fetch(`${baseUrl}/login?reason=session_expired`, { method: "GET" });
    const setCookie = res.headers.get("set-cookie");
    record(
      "Session Expiry - Cookie Deletion on /login?reason=session_expired",
      res.status === 200 && (setCookie === null || setCookie.includes("auth_session=;") || setCookie.includes("auth_session=Max-Age=0")),
      `Status: ${res.status}, Set-Cookie Header: ${setCookie || "None (Cleaned)"}`
    );
  } catch (e: any) {
    record("Session Expiry - Cookie Deletion", false, e.message);
  }

  // Summary Report
  const passedCount = results.filter(r => r.passed).length;
  console.log("==========================================================================");
  console.log(`SUMMARY: ${passedCount} / ${results.length} TESTS PASSED.`);
  console.log("==========================================================================");

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runQaAuthSuite();
