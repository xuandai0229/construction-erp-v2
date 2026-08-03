import "dotenv/config";
import prisma from "../../src/lib/prisma";
const names = ["Lê Mạnh Hùng", "Đoàn Văn Giang", "Lê Trọng Hạ", "Trần Quốc Dũng", "Nguyễn Văn Hưng", "Phạm Anh Tuấn", "Nguyễn Đức Mùi", "Nguyễn Tư Mạnh", "Lương Văn Công", "Vũ Hưng", "Nguyễn Minh Hùng"];
async function main() {
const users = await prisma.user.findMany({ where: { email: { endsWith: "@gmail.com" }, name: { in: names } }, select: { id: true, name: true, email: true, role: true, password: true, projectMembers: { where: { deletedAt: null, isActive: true }, select: { projectId: true, role: true, project: { select: { name: true, externalSourceKey: true } } } } } });
const projects = await prisma.project.findMany({ where: { externalSourceKey: { not: null } }, select: { id: true, code: true, name: true, status: true, externalSourceKey: true, plannedDurationValue: true, plannedDurationUnit: true, plannedDurationRaw: true } });
const result = { projectCount: projects.length, activeCount: projects.filter((p) => p.status === "ACTIVE").length, planningCount: projects.filter((p) => p.status === "PLANNING").length, durationMissing: projects.filter((p) => p.plannedDurationValue == null && p.plannedDurationRaw !== "ngày").length, userCount: users.length, assignmentCount: users.reduce((n, u) => n + u.projectMembers.length, 0), duplicateCodes: projects.length - new Set(projects.map(p => p.code)).size, duplicateKeys: projects.length - new Set(projects.map(p => p.externalSourceKey)).size, projects: projects.map((p) => ({ code: p.code, status: p.status, rawDuration: p.plannedDurationRaw, value: p.plannedDurationValue, unit: p.plannedDurationUnit })), users: users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, bcryptHash: /^\$2[aby]?\$/.test(u.password), projectCount: u.projectMembers.length, projectNames: u.projectMembers.map(m => m.project.name) })) };
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
}
main();
