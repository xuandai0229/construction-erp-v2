import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";

const targetChecksums = new Set([
  "409726497bda24a3f425b40ed7d098b37e288a6020f3e94dec139f9cc6a516a5",
  "435bc98663a5565106641764b98aafc990f46ae3d4ecf558a9c742b82ca80885",
  "734950976b78fa8325465c158283b58e1759b4b0bb4a903e9593842a15ae5c42",
  "657b5760f7dfd7b331637acb1fe06ce69ab6a5836108314fffeb7c05cc894c78",
  "f638ad1effaab7a24b7e1f440e10561f7024b5aff56ed03db1fbea3ed8d4deae",
]);

type ObjectDescriptor = { objectId: string; type: string; size: number };

function gitText(args: string[]): string {
  const result = spawnSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(" ")} failed`);
  return result.stdout;
}

function listGitObjects(): ObjectDescriptor[] {
  return gitText(["cat-file", "--batch-all-objects", "--batch-check=%(objectname) %(objecttype) %(objectsize)"])
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [objectId, type, rawSize] = line.split(" ");
      return { objectId, type, size: Number(rawSize) };
    });
}

async function hashBlob(objectId: string): Promise<string> {
  const child = spawn("git", ["cat-file", "blob", objectId], { stdio: ["ignore", "pipe", "pipe"] });
  const hash = createHash("sha256");
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => hash.update(chunk));
  child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
  const [code] = await once(child, "close") as [number | null];
  if (code !== 0) throw new Error(stderr.trim() || `git cat-file blob ${objectId} failed`);
  return hash.digest("hex");
}

async function main(): Promise<void> {
  const objects = listGitObjects();
  const blobs = objects.filter((object) => object.type === "blob");
  let scanned = 0;
  let readErrors = 0;
  let totalBytes = 0;
  let largestBlob = { objectId: "", size: 0 };
  const matches: Array<{ objectId: string; checksum: string; size: number }> = [];

  for (const blob of blobs) {
    totalBytes += blob.size;
    if (blob.size > largestBlob.size) largestBlob = { objectId: blob.objectId, size: blob.size };
    try {
      const checksum = await hashBlob(blob.objectId);
      scanned += 1;
      if (targetChecksums.has(checksum)) matches.push({ objectId: blob.objectId, checksum, size: blob.size });
    } catch {
      readErrors += 1;
    }
  }

  console.log(JSON.stringify({
    mode: "read-only all Git object database blobs",
    objectsTotal: objects.length,
    blobsTotal: blobs.length,
    blobsScanned: scanned,
    readErrors,
    totalBytesScanned: totalBytes,
    largestBlob,
    targetChecksums: [...targetChecksums],
    matches,
  }, null, 2));
}

void main();
