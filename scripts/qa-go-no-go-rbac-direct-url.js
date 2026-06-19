const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
const email = process.env.QA_COMMANDER_EMAIL;
const password = process.env.QA_COMMANDER_PASSWORD;
const projectId = process.env.QA_UNASSIGNED_PROJECT_ID;

async function main() {
  if (!email || !password || !projectId) {
    console.error(
      "PARTIAL: Set QA_COMMANDER_EMAIL, QA_COMMANDER_PASSWORD, and QA_UNASSIGNED_PROJECT_ID."
    );
    process.exitCode = 2;
    return;
  }

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!loginResponse.ok) {
    console.error(`FAIL: Commander login returned HTTP ${loginResponse.status}.`);
    process.exitCode = 1;
    return;
  }

  const setCookie = loginResponse.headers.get("set-cookie");
  const cookie = setCookie?.split(";")[0];

  if (!cookie) {
    console.error("FAIL: Login did not return a session cookie.");
    process.exitCode = 1;
    return;
  }

  const editResponse = await fetch(`${baseUrl}/projects/${projectId}/edit`, {
    headers: { cookie, accept: "text/html" },
    redirect: "manual",
  });

  const responseBody = await editResponse.text();
  const location = editResponse.headers.get("location");
  const redirectDigest = "NEXT_REDIRECT;replace;/projects;";
  const blocked =
    location === "/projects" || responseBody.includes(redirectDigest);

  if (!blocked) {
    console.error(
      `FAIL: Direct edit URL remained accessible (HTTP ${editResponse.status}).`
    );
    process.exitCode = 1;
    return;
  }

  console.log(
    `PASS: Direct edit URL redirected commander to /projects (HTTP ${editResponse.status}).`
  );
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
