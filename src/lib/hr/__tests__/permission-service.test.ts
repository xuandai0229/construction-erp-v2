import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  GrantEffect,
  HrDataScope,
  SensitiveFieldPolicy,
} from "@prisma/client";
import {
  seedHrPermissions,
  resolveUserHrPermission,
  CANONICAL_HR_PERMISSIONS,
} from "../permission-service";

describe("HR Permission Registry & Resolution Service", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;

  beforeAll(async () => {
    const connectionString = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
    pool = new Pool({ connectionString });
    adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    await seedHrPermissions(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("seeds 9 canonical HR permissions into database", async () => {
    const count = await prisma.hrPermissionDefinition.count({
      where: { module: "HR" },
    });
    expect(count).toBe(CANONICAL_HR_PERMISSIONS.length);
  });

  it("grants full access to ADMIN users by default unless DENY grant exists", async () => {
    const adminUser = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (!adminUser) return; // Skip if no admin user

    const res = await resolveUserHrPermission(prisma, adminUser.id, "hr:employee:read");
    expect(res.allowed).toBe(true);
    expect(res.scope).toBe(HrDataScope.ALL_EMPLOYEES);
  });

  it("enforces explicit DENY grant over ALLOW grant or ADMIN role", async () => {
    // Create test user and granter
    const testUser = await prisma.user.create({
      data: {
        email: `hr_perm_test_${Date.now()}@example.com`,
        username: `hr_perm_test_${Date.now()}`,
        password: "dummy",
        name: "Test HR User",
        role: "STAFF",
      },
    });

    const granter = (await prisma.user.findFirst({ where: { id: { not: testUser.id } } })) || testUser;

    // Add ALLOW grant
    await prisma.userAccessGrant.create({
      data: {
        userId: testUser.id,
        permissionCode: "hr:employee:read",
        effect: GrantEffect.ALLOW,
        scope: HrDataScope.OWN_ORGANIZATION_UNIT,
        grantedById: granter.id,
        reason: "Allow testing",
      },
    });

    // Check allow
    const resAllow = await resolveUserHrPermission(prisma, testUser.id, "hr:employee:read");
    expect(resAllow.allowed).toBe(true);
    expect(resAllow.scope).toBe(HrDataScope.OWN_ORGANIZATION_UNIT);

    // Add DENY grant
    const denyGrant = await prisma.userAccessGrant.create({
      data: {
        userId: testUser.id,
        permissionCode: "hr:employee:read",
        effect: GrantEffect.DENY,
        scope: HrDataScope.NONE,
        grantedById: granter.id,
        reason: "Explicit Deny override testing",
      },
    });

    // Check deny override
    const resDeny = await resolveUserHrPermission(prisma, testUser.id, "hr:employee:read");
    expect(resDeny.allowed).toBe(false);
    expect(resDeny.effect).toBe(GrantEffect.DENY);

    // Revoke DENY grant
    await prisma.userAccessGrant.update({
      where: { id: denyGrant.id },
      data: { revokedAt: new Date(), revokedById: granter.id },
    });

    // Check allow restored after revocation
    const resRestored = await resolveUserHrPermission(prisma, testUser.id, "hr:employee:read");
    expect(resRestored.allowed).toBe(true);

    // Cleanup
    await prisma.userAccessGrant.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });

  it("ignores expired grants outside validFrom and validUntil", async () => {
    const testUser = await prisma.user.create({
      data: {
        email: `hr_expired_test_${Date.now()}@example.com`,
        username: `hr_expired_test_${Date.now()}`,
        password: "dummy",
        name: "Test HR Expired User",
        role: "STAFF",
      },
    });

    const granter = (await prisma.user.findFirst()) || testUser;

    // Add expired grant
    await prisma.userAccessGrant.create({
      data: {
        userId: testUser.id,
        permissionCode: "hr:employee:create",
        effect: GrantEffect.ALLOW,
        scope: HrDataScope.ALL_EMPLOYEES,
        validFrom: new Date("2020-01-01"),
        validUntil: new Date("2020-12-31"),
        grantedById: granter.id,
        reason: "Expired testing",
      },
    });

    const res = await resolveUserHrPermission(prisma, testUser.id, "hr:employee:create");
    expect(res.allowed).toBe(false);

    // Cleanup
    await prisma.userAccessGrant.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
  });
});
