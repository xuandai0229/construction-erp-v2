import "dotenv/config";
import { assertSafeQaDatabase } from "../qa/assert-safe-qa-database";
import {
  createSafeQaPrismaClient,
  verifyQaPrismaFingerprint,
} from "../qa/create-safe-qa-prisma-client";
import { bootstrapSafetyChecklistV1 } from "../../src/lib/safety-inspection/checklist-bootstrap";
import { getSafetyPermissionSet } from "../../src/lib/safety-inspection/permissions";

async function main(): Promise<void> {
  const safe = assertSafeQaDatabase();
  const qaUrl = process.env.QA_DATABASE_URL;
  const actorId = process.env.SAFETY_BOOTSTRAP_ACTOR_ID;
  if (!qaUrl || !actorId) {
    throw new Error(
      "Thiếu QA_DATABASE_URL hoặc SAFETY_BOOTSTRAP_ACTOR_ID.",
    );
  }
  const client = createSafeQaPrismaClient(qaUrl);
  try {
    await verifyQaPrismaFingerprint(client.prisma, safe.qaDatabase);
    const actor = await client.prisma.user.findUnique({
      where: { id: actorId, isActive: true, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!actor) throw new Error("Không tìm thấy actor bootstrap hợp lệ.");
    const result = await bootstrapSafetyChecklistV1(
      client.prisma,
      {
        id: actor.id,
        permissions: getSafetyPermissionSet({
          systemRole: actor.role,
          projectRole: null,
        }),
        projectScope: { kind: "NO_PROJECTS" },
        isCommandActor: false,
        unitNames: [],
      },
      {
        correlationId: `bootstrap-${Date.now()}`,
        processName: "scripts/safety/bootstrap-safety-checklist-v1.ts",
      },
    );
    console.log(
      JSON.stringify({
        database: safe.database,
        code: "SAFETY_COMPANY_V1",
        ...result,
      }),
    );
  } finally {
    await client.close();
  }
}

void main();
