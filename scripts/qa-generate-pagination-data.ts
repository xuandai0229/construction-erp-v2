import "dotenv/config";
import { assertSafeQaDatabase } from "./qa/assert-safe-qa-database";
import { createSafeQaPrismaClient } from "./qa/create-safe-qa-prisma-client";

async function main() {
  const safety = await assertSafeQaDatabase();
  if (!safety.safe || !process.env.QA_DATABASE_URL) throw new Error("QA safety guard chưa đạt; không tạo fixture.");
  const { prisma, close } = createSafeQaPrismaClient(process.env.QA_DATABASE_URL);
  try {
  for (let i = 1; i <= 16; i++) {
    const code = `QA_TEST_PAGINATION_${i.toString().padStart(3, '0')}`;
    await prisma.project.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: `QA Pagination Project ${i}`,
        status: "ACTIVE"
      }
    });
  }
    console.log("Created 16 QA_TEST_PAGINATION_ projects.");
  } finally {
    await close();
  }
}

main().catch(() => {
  console.error("QA pagination fixture setup failed.");
  process.exitCode = 1;
});
