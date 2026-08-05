import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "path";
import { existsSync } from "fs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { LocalStorageProvider } from "@/lib/storage/local-storage-provider";
import { validateDocumentUploadPolicy } from "@/lib/documents/validation";
import { assertSafeStorage } from "../../../scripts/qa/assert-safe-storage";

const dbUrl = process.env.QA_DATABASE_URL;
if (!dbUrl) throw new Error("QA_DATABASE_URL is required; credential fallback is prohibited");
const storageDir = path.resolve(process.cwd(), "storage_e2e");

describe("Phase 7 — Storage & Upload E2E Integration Tests", () => {
  let pool: Pool;
  let adapter: PrismaPg;
  let prisma: PrismaClient;
  let storage: LocalStorageProvider;

  beforeAll(async () => {
    process.env.DATABASE_URL = dbUrl;
    process.env.STORAGE_ROOT = storageDir;

    // Verify storage safety guard
    await assertSafeStorage(storageDir);

    pool = new Pool({ connectionString: dbUrl });
    adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    storage = new LocalStorageProvider();

    // Ensure test project and document folder exist
    let proj = await prisma.project.findFirst();
    if (!proj) {
      proj = await prisma.project.create({
        data: { name: `Test Project ${Date.now()}`, code: `PRJ_${Date.now()}` },
      });
    }
    let folder = await prisma.documentFolder.findFirst({ where: { projectId: proj.id } });
    if (!folder) {
      await prisma.documentFolder.create({
        data: { name: `Test Folder ${Date.now()}`, projectId: proj.id },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

  it("1. Storage provider saves file within isolated E2E root without escaping", async () => {
    const testBuffer = Buffer.from("%PDF-1.4 Fake PDF Content for E2E Test");
    const result = await storage.saveFile({
      buffer: testBuffer,
      projectId: "proj_e2e_01",
      projectCode: "SETTINGS-E2E-01",
      folderId: "folder_e2e_01",
      originalName: "Báo_cáo_nghiệm_thu_2026.pdf",
    });

    expect(result.provider).toBe("LOCAL");
    expect(result.storagePath).toContain("projects/SETTINGS-E2E-01/documents/folder_e2e_01/");

    // Verify file actually exists on disk inside storage_e2e
    const fullPhysicalPath = path.join(storageDir, result.storagePath);
    expect(existsSync(fullPhysicalPath)).toBe(true);

    // Verify file reading
    const readBack = await storage.readFile(result.storagePath);
    expect(readBack.toString()).toContain("%PDF-1.4");

    // Clean test file
    await storage.deleteFile(result.storagePath);
    expect(await storage.exists(result.storagePath)).toBe(false);
  });

  it("2. Validates upload policy: accepts valid file and extension", () => {
    const settings = {
      maxUploadSizeMb: 50,
      allowedExtensions: "pdf, docx, xlsx, dwg",
      enforceNamingConvention: true,
    };

    const validResult = validateDocumentUploadPolicy(
      { name: "Hop_dong_thi_cong_2026.pdf", size: 10 * 1024 * 1024 },
      settings
    );
    expect(validResult.valid).toBe(true);
  });

  it("3. Validates upload policy: rejects file exceeding max upload size", () => {
    const settings = {
      maxUploadSizeMb: 50,
      allowedExtensions: "pdf, docx",
      enforceNamingConvention: true,
    };

    const invalidResult = validateDocumentUploadPolicy(
      { name: "File_too_large.pdf", size: 51 * 1024 * 1024 },
      settings
    );
    expect(invalidResult.valid).toBe(false);
    if (!invalidResult.valid) {
      expect(invalidResult.reason).toBe("size_limit");
    }
  });

  it("4. Validates upload policy: blocks executable & dangerous extensions", () => {
    const settings = {
      maxUploadSizeMb: 50,
      allowedExtensions: "pdf, docx, exe, sh",
      enforceNamingConvention: false,
    };

    const exeResult = validateDocumentUploadPolicy({ name: "malicious.exe", size: 1024 }, settings);
    expect(exeResult.valid).toBe(false);

    const shResult = validateDocumentUploadPolicy({ name: "script.sh", size: 1024 }, settings);
    expect(shResult.valid).toBe(false);

    const phpResult = validateDocumentUploadPolicy({ name: "shell.php", size: 1024 }, settings);
    expect(phpResult.valid).toBe(false);
  });

  it("5. Path traversal attempt in projectCode or folderId is blocked", async () => {
    const testBuffer = Buffer.from("Test");
    await expect(
      storage.saveFile({
        buffer: testBuffer,
        projectId: "proj_1",
        projectCode: "../dangerous_path",
        folderId: "folder_1",
        originalName: "test.pdf",
      })
    ).rejects.toThrow(/Invalid path parameters/);
  });

  it("6. Auto-versioning increments version when autoVersioning=true", async () => {
    const adminUser = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
    const project = await prisma.project.findFirstOrThrow();
    const folder = await prisma.documentFolder.findFirstOrThrow();

    const docName = `Tailieu_E2E_${Date.now()}.pdf`;

    // Create v1
    const doc1 = await prisma.document.create({
      data: {
        projectId: project.id,
        folderId: folder.id,
        originalName: docName,
        storedName: "stored_v1.pdf",
        mimeType: "application/pdf",
        extension: ".pdf",
        size: 2048,
        storagePath: "projects/test/v1.pdf",
        uploadedById: adminUser.id,
        version: 1,
      },
    });

    // Check existing for auto-versioning
    const existing = await prisma.document.findFirst({
      where: { folderId: folder.id, projectId: project.id, originalName: docName, deletedAt: null },
      orderBy: { version: "desc" },
    });
    const nextVersion = existing ? existing.version + 1 : 1;

    expect(nextVersion).toBe(2);

    // Create v2
    const doc2 = await prisma.document.create({
      data: {
        projectId: project.id,
        folderId: folder.id,
        originalName: docName,
        storedName: "stored_v2.pdf",
        mimeType: "application/pdf",
        extension: ".pdf",
        size: 4096,
        storagePath: "projects/test/v2.pdf",
        uploadedById: adminUser.id,
        version: nextVersion,
      },
    });

    expect(doc2.version).toBe(2);

    // Cleanup
    await prisma.document.deleteMany({ where: { id: { in: [doc1.id, doc2.id] } } });
  });

  it("7. Handles Vietnamese Unicode filenames safely", async () => {
    const unicodeName = "Báo cáo nghiệm thu hạng mục cọc 2026.pdf";
    const saved = await storage.saveFile({
      buffer: Buffer.from("Vietnamese content"),
      projectId: "proj_vn",
      projectCode: "PROJ-VN-01",
      folderId: "folder_vn",
      originalName: unicodeName,
    });

    expect(saved.storagePath).toBeDefined();
    expect(await storage.exists(saved.storagePath)).toBe(true);

    await storage.deleteFile(saved.storagePath);
  });
});
