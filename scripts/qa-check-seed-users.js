require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("PARTIAL: DATABASE_URL is required.");
  process.exit(2);
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: "@construction.local", mode: "insensitive" } },
        { username: { endsWith: "_test", mode: "insensitive" } },
        { username: { contains: "test", mode: "insensitive" } },
        { name: { contains: "test", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      isActive: true,
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { email: "asc" },
  });

  console.log(
    JSON.stringify(
      {
        status: users.length > 0 ? "PARTIAL" : "PASS",
        message:
          users.length > 0
            ? "Seed/test-like users require owner review; no records were changed."
            : "No seed/test-like users found.",
        count: users.length,
        users,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("FAIL:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
