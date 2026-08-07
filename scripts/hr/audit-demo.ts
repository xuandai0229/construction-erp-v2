import * as fs from "fs";
import * as path from "path";

const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = fs.readFileSync(envLocalPath, "utf-8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function main() {
  const prisma = (await import("../../src/lib/prisma")).default;
  const employees = await prisma.employee.findMany({
    include: {
      orgAssignments: {
        where: { endDate: null, isPrimary: true },
        include: { organizationUnit: true, position: true },
      },
    },
  });

  const groupMap = new Map<string, typeof employees>();
  for (const emp of employees) {
    const key = `${emp.fullName}_${emp.joinedDate?.toISOString()}_${emp.orgAssignments[0]?.positionId || "none"}`;
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(emp);
  }

  let dupCount = 0;
  for (const [_, v] of groupMap.entries()) {
    if (v.length > 1) dupCount++;
  }

  const bgdUnit = await prisma.organizationUnit.findFirst({
    where: { OR: [{ code: "BGD" }, { name: { contains: "Giám đốc" } }] },
  });

  let execHeadcount = 0;
  let engineerInExec = 0;

  if (bgdUnit) {
    const execEmps = employees.filter((e) =>
      e.orgAssignments.some((a) => a.organizationUnitId === bgdUnit.id)
    );
    execHeadcount = execEmps.length;
    engineerInExec = execEmps.filter((e) => {
      const posTitle = e.orgAssignments[0]?.position?.title || "";
      const name = e.fullName || "";
      return (
        posTitle.toLowerCase().includes("kỹ sư") ||
        posTitle.toLowerCase().includes("chuyên viên") ||
        name.toLowerCase().includes("kỹ sư")
      );
    }).length;
  }

  console.log(`DUPLICATE_DEMO_EMPLOYEE_GROUPS=${dupCount}`);
  console.log(`EXECUTIVE_UNIT_HEADCOUNT=${execHeadcount}`);
  console.log(`ENGINEERS_IN_EXECUTIVE_UNIT=${engineerInExec}`);
}

main().catch(console.error);
