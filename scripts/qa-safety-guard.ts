import "dotenv/config";

const qaUrlStr = process.env.QA_DATABASE_URL;
const devUrlStr = process.env.DATABASE_URL;

if (!qaUrlStr) {
  console.error("FAIL: QA_DATABASE_URL is not set.");
  process.exit(1);
}

function parsePgUrl(rawUrl?: string) {
  if (!rawUrl) return null;
  const clean = rawUrl.trim().replace(/^"|"$/g, '');
  try {
    return new URL(clean);
  } catch {
    // Fallback regex parsing if password has special unescaped characters like !
    const match = clean.match(/^(postgres(?:ql)?):\/\/(?:([^:]+):([^@]+)@)?([^:\/]+)(?::(\d+))?\/(.+)$/);
    if (!match) return null;
    return {
      protocol: match[1] + ':',
      hostname: match[4],
      port: match[5] || '5432',
      pathname: '/' + match[6].split('?')[0]
    };
  }
}

try {
  const qaParsed = parsePgUrl(qaUrlStr);
  const devParsed = parsePgUrl(devUrlStr);

  if (!qaParsed) {
    console.error("FAIL: QA_DATABASE_URL could not be parsed.");
    process.exit(1);
  }

  if (qaParsed.protocol !== "postgresql:" && qaParsed.protocol !== "postgres:") {
    console.error("FAIL: URL is not PostgreSQL.");
    process.exit(1);
  }

  const dbName = qaParsed.pathname.replace("/", "");
  if (!dbName.includes("qa") && !dbName.includes("test") && !dbName.includes("ci") && !dbName.includes("sandbox")) {
    console.error("FAIL: Database name must contain qa, test, ci, or sandbox.");
    process.exit(1);
  }

  const qaFingerprint = `${qaParsed.hostname}:${qaParsed.port}/${dbName}`;
  const devFingerprint = devParsed ? `${devParsed.hostname}:${devParsed.port}/${devParsed.pathname.replace("/", "")}` : "";

  if (devFingerprint && qaFingerprint === devFingerprint) {
    console.error("FAIL: QA fingerprint is the same as dev fingerprint.");
    process.exit(1);
  }

  console.log(`PASS: Safety guard checks passed.`);
  console.log(`QA Database Host: ${qaParsed.hostname}`);
  console.log(`QA Database Port: ${qaParsed.port || 5432}`);
  console.log(`QA Database Name: ${dbName}`);
  process.exit(0);

} catch (e: any) {
  console.error(`FAIL: Safety check failed - ${e.message}`);
  process.exit(1);
}
