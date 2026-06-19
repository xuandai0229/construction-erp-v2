import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Seed requires ${name}`);
  }
  return value;
}

function assertStrongSeedPassword(password: string, variableName: string) {
  if (password.length < 12) {
    throw new Error(`${variableName} must contain at least 12 characters`);
  }
}

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  throw new Error(
    "Refusing to run seed in production without ALLOW_PRODUCTION_SEED=true",
  );
}

const connectionString = requireEnv("DATABASE_URL");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seedProductionAdmin() {
  const email = requireEnv("SEED_ADMIN_EMAIL");
  const password = requireEnv("SEED_ADMIN_PASSWORD");
  assertStrongSeedPassword(password, "SEED_ADMIN_PASSWORD");

  const hashedPassword = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      name: process.env.SEED_ADMIN_NAME?.trim() || "System Administrator",
      username: process.env.SEED_ADMIN_USERNAME?.trim() || null,
    },
    create: {
      email,
      password: hashedPassword,
      role: "ADMIN",
      isActive: true,
      name: process.env.SEED_ADMIN_NAME?.trim() || "System Administrator",
      username: process.env.SEED_ADMIN_USERNAME?.trim() || null,
    },
  });

  console.log("Seeded production administrator:", admin.email);
}

async function seedDevelopmentFixtures() {
  const adminPassword = requireEnv("SEED_DEV_ADMIN_PASSWORD");
  const testPassword = requireEnv("SEED_DEV_TEST_PASSWORD");
  assertStrongSeedPassword(adminPassword, "SEED_DEV_ADMIN_PASSWORD");
  assertStrongSeedPassword(testPassword, "SEED_DEV_TEST_PASSWORD");

  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
  const hashedTestPassword = await bcrypt.hash(testPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@construction.local" },
    update: {
      password: hashedAdminPassword,
      role: "ADMIN",
      isActive: true,
      name: "Admin (Dev)",
      username: "dev_admin_test",
    },
    create: {
      email: "admin@construction.local",
      password: hashedAdminPassword,
      name: "Admin (Dev)",
      role: "ADMIN",
      isActive: true,
      username: "dev_admin_test",
    },
  });
  console.log("Seeded development admin:", admin.email);

  const director = await prisma.user.upsert({
    where: { email: "director@construction.local" },
    update: {
      password: hashedTestPassword,
      role: "DIRECTOR",
      isActive: true,
      name: "Giám đốc Test",
      username: "director_test",
    },
    create: {
      email: "director@construction.local",
      password: hashedTestPassword,
      name: "Giám đốc Test",
      role: "DIRECTOR",
      isActive: true,
      username: "director_test",
    },
  });
  console.log("Seeded development director:", director.email);

  const deputy = await prisma.user.upsert({
    where: { email: "deputy@construction.local" },
    update: {
      password: hashedTestPassword,
      role: "DEPUTY_DIRECTOR",
      isActive: true,
      name: "Phó GĐ Test",
      username: "deputy_director_test",
    },
    create: {
      email: "deputy@construction.local",
      password: hashedTestPassword,
      name: "Phó GĐ Test",
      role: "DEPUTY_DIRECTOR",
      isActive: true,
      username: "deputy_director_test",
    },
  });
  console.log("Seeded development deputy director:", deputy.email);

  const ct001 = await prisma.project.upsert({
    where: { code: "QA_RBAC_CT_001" },
    update: { name: "Công trình RBAC Test 001" },
    create: {
      code: "QA_RBAC_CT_001",
      name: "Công trình RBAC Test 001",
      status: "ACTIVE",
    },
  });

  const ct002 = await prisma.project.upsert({
    where: { code: "QA_RBAC_CT_002" },
    update: { name: "Công trình RBAC Test 002" },
    create: {
      code: "QA_RBAC_CT_002",
      name: "Công trình RBAC Test 002",
      status: "ACTIVE",
    },
  });

  const commander1 = await prisma.user.upsert({
    where: { email: "commander1@construction.local" },
    update: {
      password: hashedTestPassword,
      role: "CHIEF_COMMANDER",
      isActive: true,
      name: "Chỉ huy trưởng CT001",
      username: "commander_ct001_test",
    },
    create: {
      email: "commander1@construction.local",
      password: hashedTestPassword,
      name: "Chỉ huy trưởng CT001",
      role: "CHIEF_COMMANDER",
      isActive: true,
      username: "commander_ct001_test",
    },
  });
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: ct001.id, userId: commander1.id } },
    update: {
      role: "CHIEF_COMMANDER",
      isActive: true,
      assignedById: admin.id,
    },
    create: {
      projectId: ct001.id,
      userId: commander1.id,
      role: "CHIEF_COMMANDER",
      assignedById: admin.id,
      isActive: true,
    },
  });

  const commander2 = await prisma.user.upsert({
    where: { email: "commander2@construction.local" },
    update: {
      password: hashedTestPassword,
      role: "CHIEF_COMMANDER",
      isActive: true,
      name: "Chỉ huy trưởng CT002",
      username: "commander_ct002_test",
    },
    create: {
      email: "commander2@construction.local",
      password: hashedTestPassword,
      name: "Chỉ huy trưởng CT002",
      role: "CHIEF_COMMANDER",
      isActive: true,
      username: "commander_ct002_test",
    },
  });
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: ct002.id, userId: commander2.id } },
    update: {
      role: "CHIEF_COMMANDER",
      isActive: true,
      assignedById: admin.id,
    },
    create: {
      projectId: ct002.id,
      userId: commander2.id,
      role: "CHIEF_COMMANDER",
      assignedById: admin.id,
      isActive: true,
    },
  });

  console.log("Seeded development RBAC fixtures without logging credentials.");
}

async function main() {
  if (isProduction) {
    await seedProductionAdmin();
    return;
  }

  await seedDevelopmentFixtures();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
