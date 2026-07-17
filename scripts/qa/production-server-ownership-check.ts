import { spawn, execSync, ChildProcess } from "node:child_process";

// Windows-specific process tree helper using WMIC to get all descendants
function getProcessTree(rootPid: number): number[] {
  try {
    const output = execSync(`wmic process where (ParentProcessId=${rootPid}) get ProcessId`, { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] });
    const pids = output.split(/\r?\n/).map(l => l.trim()).filter(l => l && l !== "ProcessId" && /^\d+$/.test(l)).map(l => parseInt(l, 10));
    let tree: number[] = [...pids];
    for (const pid of pids) {
      tree = tree.concat(getProcessTree(pid));
    }
    return tree;
  } catch {
    return [];
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function terminateOwnedProcessTree(rootPid: number) {
  const tree = getProcessTree(rootPid);
  // Send graceful SIGTERM first
  try { process.kill(rootPid, "SIGTERM"); } catch {}
  for (const pid of tree) {
    try { process.kill(pid, "SIGTERM"); } catch {}
  }
}

async function waitForPidsToExit(pids: number[], timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const anyAlive = pids.some(pid => isPidAlive(pid));
    if (!anyAlive) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

function findListeningPids(port: number): number[] {
  try {
    const o = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf-8" }).trim();
    if (!o) return [];
    const lines = o.split(/\r?\n/);
    const pids = lines.filter(l => l.includes("LISTENING")).map(l => {
      const parts = l.trim().split(/\s+/);
      return parseInt(parts[parts.length - 1], 10);
    }).filter(p => !isNaN(p) && p !== 0);
    return Array.from(new Set(pids));
  } catch {
    return [];
  }
}

async function waitForPortRelease(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pids = findListeningPids(port);
    if (pids.length === 0) return true;
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function runCycle(cycleNumber: number, port: number) {
  console.log(`\n--- Cycle ${cycleNumber} (Port ${port}) ---`);
  
  // Probe port
  const prePids = findListeningPids(port);
  if (prePids.length > 0) {
    console.log(`BLOCKED: QA PORT ALREADY IN USE BY PID ${prePids.join(",")}`);
    return { ready: "FAIL", rootExited: "FAIL", descendantsExited: "FAIL", portReleased: "FAIL" };
  }

  let server: ChildProcess | null = null;
  let rootPid = -1;
  let treePids: number[] = [];
  
  try {
    const nextBin = require.resolve("next/dist/bin/next");
    server = spawn(
      process.execPath,
      [nextBin, "start", "-p", String(port)],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: String(port)
        },
        windowsHide: true,
        shell: false,
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    rootPid = server.pid!;
    
    // Readiness HTTP polling
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/login`);
        if (res.status === 200) { ready = true; break; }
      } catch {}
      await new Promise(r => setTimeout(r, 500));
    }

    if (!ready) {
      console.log("Server never became ready.");
      return { ready: "FAIL", rootExited: "FAIL", descendantsExited: "FAIL", portReleased: "FAIL" };
    }
    
    treePids = getProcessTree(rootPid);
    const ownerPids = findListeningPids(port);
    console.log(`Server Ready! Root PID: ${rootPid}, Descendants: ${treePids.join(",") || "None"}, Port Owner: ${ownerPids.join(",")}`);

  } finally {
    if (server && rootPid > 0) {
      terminateOwnedProcessTree(rootPid);
      
      const allPids = [rootPid, ...treePids];
      const gracefulExit = await waitForPidsToExit(allPids, 5000);
      
      if (!gracefulExit) {
        console.log("Graceful exit failed, forcing taskkill...");
        try { execSync(`taskkill /PID ${rootPid} /T /F`, { stdio: "ignore" }); } catch {}
        await waitForPidsToExit(allPids, 2000);
      }

      const rootAlive = isPidAlive(rootPid);
      const descAlive = treePids.some(p => isPidAlive(p));
      const portReleased = await waitForPortRelease(port, 2000);
      
      return {
        ready: "PASS",
        rootExited: rootAlive ? "FAIL" : "PASS",
        descendantsExited: descAlive ? "FAIL" : "PASS",
        portReleased: portReleased ? "PASS" : "FAIL"
      };
    }
  }
  return { ready: "FAIL", rootExited: "FAIL", descendantsExited: "FAIL", portReleased: "FAIL" };
}

async function main() {
  const results = [];
  const ports = [3141, 3142, 3143];
  
  for (let i = 0; i < 3; i++) {
    const res = await runCycle(i + 1, ports[i]);
    results.push(res);
  }

  console.log("\nExpected:\n| Cycle | Ready | Root exited | Descendants exited | Port released |");
  for (let i = 0; i < 3; i++) {
    const r = results[i];
    console.log(`| ${i + 1} | ${r.ready} | ${r.rootExited} | ${r.descendantsExited} | ${r.portReleased} |`);
  }

  const allPass = results.every(r => r.ready === "PASS" && r.rootExited === "PASS" && r.descendantsExited === "PASS" && r.portReleased === "PASS");
  if (!allPass) {
    process.exitCode = 1;
  }
}

main();
