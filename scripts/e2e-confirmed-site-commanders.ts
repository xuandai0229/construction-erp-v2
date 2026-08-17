import dotenv from "dotenv";
import path from "node:path";
import { randomBytes } from "node:crypto";
import * as bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
const baseUrl = process.env.SITE_COMMANDER_E2E_BASE_URL || "http://localhost:3000";

function oneTimePassword() {
  return `C!${randomBytes(14).toString("base64url")}9a`;
}

function cookieFrom(response: Response) {
  const value = response.headers.get("set-cookie");
  if (!value) throw new Error("Response không trả session cookie.");
  return value.split(";", 1)[0];
}

async function json(response: Response) {
  return response.json().catch(() => ({})) as Promise<any>;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình.");
  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const [commanders, allProjects] = await Promise.all([
      prisma.user.findMany({
        where: { role: "CHIEF_COMMANDER", isActive: true, deletedAt: null, employee: { isNot: null } },
        select: {
          id: true,
          name: true,
          username: true,
          employee: {
            select: {
              code: true,
              projectAssignments: {
                where: { status: "ACTIVE", projectPersonnelRole: { code: "CHT" } },
                select: { projectId: true },
              },
            },
          },
        },
        orderBy: { username: "asc" },
      }),
      prisma.project.findMany({ where: { deletedAt: null }, select: { id: true } }),
    ]);
    if (commanders.length !== 11) throw new Error(`Dự kiến 11 tài khoản CHT, thực tế ${commanders.length}.`);

    const evidence = [];
    for (const commander of commanders) {
      if (!commander.username || !commander.employee) throw new Error(`Tài khoản ${commander.id} thiếu username/Employee.`);
      const assignedProjectIds = commander.employee.projectAssignments.map((item) => item.projectId);
      const unauthorizedProject = allProjects.find((project) => !assignedProjectIds.includes(project.id));
      if (!assignedProjectIds.length || !unauthorizedProject) throw new Error(`Không đủ dữ liệu scope để test ${commander.name}.`);

      const firstPassword = oneTimePassword();
      await prisma.user.update({
        where: { id: commander.id },
        data: { password: await bcrypt.hash(firstPassword, 12), mustChangePassword: true, passwordChangedAt: null },
      });

      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: commander.username, password: firstPassword }),
      });
      const loginBody = await json(loginResponse);
      if (loginResponse.status !== 200 || loginBody.redirectTo !== "/change-password") {
        throw new Error(`Login lần đầu thất bại cho ${commander.username}: HTTP ${loginResponse.status}.`);
      }
      const firstCookie = cookieFrom(loginResponse);

      const changedPassword = oneTimePassword();
      const changeResponse = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: "POST",
        headers: { "content-type": "application/json", cookie: firstCookie },
        body: JSON.stringify({
          currentPassword: firstPassword,
          newPassword: changedPassword,
          confirmation: changedPassword,
        }),
      });
      if (changeResponse.status !== 200) {
        throw new Error(`Đổi mật khẩu lần đầu thất bại cho ${commander.username}: HTTP ${changeResponse.status}.`);
      }

      const reloginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: commander.username.toLocaleLowerCase("en-US"), password: changedPassword }),
      });
      const reloginBody = await json(reloginResponse);
      if (reloginResponse.status !== 200 || reloginBody.mustChangePassword) {
        throw new Error(`Login lại thất bại cho ${commander.username}.`);
      }
      const cookie = cookieFrom(reloginResponse);

      const listResponse = await fetch(`${baseUrl}/api/v1/projects?pageSize=100`, { headers: { cookie } });
      const listBody = await json(listResponse);
      const visibleIds = Array.isArray(listBody.data) ? listBody.data.map((project: any) => project.id).sort() : [];
      const expectedIds = [...assignedProjectIds].sort();
      if (listResponse.status !== 200 || JSON.stringify(visibleIds) !== JSON.stringify(expectedIds)) {
        throw new Error(`Danh sách project sai scope cho ${commander.username}.`);
      }

      const allowedResponse = await fetch(`${baseUrl}/api/v1/projects/${assignedProjectIds[0]}`, { headers: { cookie } });
      const deniedResponse = await fetch(`${baseUrl}/api/v1/projects/${unauthorizedProject.id}`, { headers: { cookie } });
      const deniedReportResponse = await fetch(`${baseUrl}/api/v1/reports?projectId=${unauthorizedProject.id}`, { headers: { cookie } });
      const deniedUploadResponse = await fetch(
        `${baseUrl}/api/documents/upload?projectId=${unauthorizedProject.id}&folderId=scope-check&fileName=scope-check.pdf`,
        { method: "POST", headers: { cookie, "content-type": "application/pdf", "content-length": "8" }, body: "%PDF-1.4" },
      );
      if (allowedResponse.status !== 200 || deniedResponse.status !== 403 || deniedReportResponse.status !== 403 || deniedUploadResponse.status !== 403) {
        throw new Error(`RBAC runtime thất bại cho ${commander.username}.`);
      }

      const authorizedReportResponse = await fetch(`${baseUrl}/api/v1/reports?projectId=${assignedProjectIds[0]}`, { headers: { cookie } });
      if (authorizedReportResponse.status !== 200) throw new Error(`Quyền xem báo cáo thất bại cho ${commander.username}.`);

      const logoutResponse = await fetch(`${baseUrl}/api/v1/auth/logout`, { method: "POST", headers: { cookie } });
      if (logoutResponse.status !== 200) throw new Error(`Logout thất bại cho ${commander.username}.`);

      const deliveryPassword = oneTimePassword();
      await prisma.user.update({
        where: { id: commander.id },
        data: { password: await bcrypt.hash(deliveryPassword, 12), mustChangePassword: true, passwordChangedAt: null },
      });

      evidence.push({
        name: commander.name,
        employeeCode: commander.employee.code,
        username: commander.username,
        assignedProjects: assignedProjectIds.length,
        firstLogin: "PASS",
        forcedPasswordChange: "PASS",
        relogin: "PASS",
        projectListScope: "PASS",
        unauthorizedProject: 403,
        unauthorizedReport: 403,
        unauthorizedUpload: 403,
        authorizedProject: 200,
        authorizedReport: 200,
        logout: "PASS",
        finalState: "ACTIVE_MUST_CHANGE_PASSWORD",
      });
    }

    const report = {
      baseUrl,
      accountsTested: evidence.length,
      passwordsLogged: false,
      results: evidence,
    };
    if (process.argv.includes("--compact")) {
      console.log(JSON.stringify({
        baseUrl,
        accountsTested: evidence.length,
        allLoginPassed: evidence.every((item) => item.firstLogin === "PASS" && item.relogin === "PASS"),
        allRbacPassed: evidence.every((item) => item.unauthorizedProject === 403 && item.unauthorizedReport === 403 && item.unauthorizedUpload === 403),
        usernames: evidence.map((item) => item.username),
        projectCounts: Object.fromEntries(evidence.map((item) => [item.username, item.assignedProjects])),
        passwordsLogged: false,
        finalState: "ACTIVE_MUST_CHANGE_PASSWORD",
      }, null, 2));
      return;
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
