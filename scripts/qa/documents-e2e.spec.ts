import { test, expect } from '@playwright/test';
import prisma from '../../src/lib/prisma';
import * as bcrypt from 'bcryptjs';
const QA_PROJECT_CODE = 'QA_E2E_PROJ';
const QA_USER_EMAIL = 'qa_e2e@example.com';
const QA_PASSWORD = 'password123';

test.describe('Document Management Module - E2E Verification', () => {
  let projectId: string;
  let activeFolderId: string;
  let trashFolderAId: string;
  let trashFolderBId: string;
  let trashFolderPId: string;
  let trashFolderQId: string;
  let userId: string;

  test.beforeAll(async () => {
    // 1. Seed user
    const existingUser = await prisma.user.findUnique({ where: { email: QA_USER_EMAIL } });
    if (existingUser) {
      userId = existingUser.id;
    } else {
      const hashedPassword = await bcrypt.hash(QA_PASSWORD, 10);
      const user = await prisma.user.create({
        data: {
          email: QA_USER_EMAIL,
          username: QA_USER_EMAIL,
          name: 'QA User',
          password: hashedPassword,
          role: 'ADMIN',
        }
      });
      userId = user.id;
    }

    // 2. Clean up old QA project
    await prisma.project.deleteMany({ where: { code: QA_PROJECT_CODE } });

    const project = await prisma.project.create({
      data: {
        code: QA_PROJECT_CODE,
        name: 'QA E2E Project',
        status: 'ACTIVE',
      }
    });
    projectId = project.id;

    // 4. Seed 1000 files in an active folder
    const activeFolder = await prisma.documentFolder.create({
      data: {
        projectId,
        name: 'Active Folder 1000',
      }
    });
    activeFolderId = activeFolder.id;

    // We will batch insert 1000 files
    const docs = [];
    for (let i = 0; i < 1000; i++) {
      docs.push({
        projectId,
        folderId: activeFolderId,
        originalName: `File_${i.toString().padStart(4, '0')}.txt`,
        storedName: `file_${i}.txt`,
        mimeType: 'text/plain',
        extension: 'txt',
        size: 1024,
        storagePath: `/tmp/file_${i}.txt`,
        uploadedById: userId,
        displayName: i === 999 ? 'QA_SEARCH_TARGET_0999.pdf' : `Display_File_${i}`,
      });
    }
    await prisma.document.createMany({ data: docs });

    // 5. Seed Trash cases
    // Case 1: Folder cha A active, con B bị xóa riêng
    const folderA = await prisma.documentFolder.create({
      data: { projectId, name: 'Folder A (Active)' }
    });
    const folderB = await prisma.documentFolder.create({
      data: { projectId, parentId: folderA.id, name: 'Folder B (Deleted)', deletedAt: new Date() }
    });
    trashFolderAId = folderA.id;
    trashFolderBId = folderB.id;

    // Case 2: Folder cha P bị xóa, con Q cũng bị xóa
    const folderP = await prisma.documentFolder.create({
      data: { projectId, name: 'Folder P (Deleted)', deletedAt: new Date() }
    });
    const folderQ = await prisma.documentFolder.create({
      data: { projectId, parentId: folderP.id, name: 'Folder Q (Deleted)', deletedAt: new Date() }
    });
    trashFolderPId = folderP.id;
    trashFolderQId = folderQ.id;
  });

  test.afterAll(async () => {
    // Cleanup
    await prisma.project.deleteMany({ where: { code: QA_PROJECT_CODE } });
    await prisma.user.deleteMany({ where: { email: QA_USER_EMAIL } });
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page, context }) => {
    // Check hydration errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/hydration|recoverable|did not match/i.test(text)) {
          console.error(`HYDRATION ERROR DETECTED: ${text}`);
          throw new Error('Hydration error detected');
        }
      }
    });

    // Login via API to set session cookie
    const loginRes = await page.request.post('/api/auth/login', {
      data: { email: QA_USER_EMAIL, password: QA_PASSWORD }
    });
    expect(loginRes.ok()).toBeTruthy();

    // Copy cookies to context
    const cookies = await page.request.storageState();
    await context.addCookies(cookies.cookies);
  });

  test('Search Server-side behavior (Target outside page 1)', async ({ page }) => {
    await page.goto(`/documents/${projectId}?folder=${activeFolderId}`);
    
    // Page đầu không có target
    await expect(page.getByText('QA_SEARCH_TARGET_0999.pdf')).not.toBeVisible();
    
    // Nhập search
    await page.fill('input[placeholder*="tài liệu"]', 'QA_SEARCH_TARGET');
    
    // Đợi url update
    await page.waitForURL(/search=QA_SEARCH_TARGET/);
    
    // Assert target xuất hiện
    await expect(page.getByText('QA_SEARCH_TARGET_0999.pdf')).toBeVisible();
  });

  test('Load More Active', async ({ page }) => {
    await page.goto(`/documents/${projectId}?folder=${activeFolderId}`);
    
    // Count items (assume 20 per page)
    await page.waitForLoadState('networkidle');
    const initialFiles = await page.locator('.group.relative').count();
    expect(initialFiles).toBeGreaterThan(0);
    
    // Nhấn Tải thêm và đợi thêm file load
    const responsePromise = page.waitForResponse(res => res.url().includes('/api/documents/load-more'));
    await page.getByText(/Tải thêm tài liệu/).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    
    // Số file phải tăng lên
    await expect(async () => {
      const newFiles = await page.locator('.group.relative').count();
      expect(newFiles).toBeGreaterThan(initialFiles);
    }).toPass();
  });

  test('Trash Root and Nested logic', async ({ page }) => {
    await page.goto(`/documents/${projectId}?trash=true`);
    
    // B bị xóa riêng phải hiện ở root trash
    await expect(page.getByText('Folder B (Deleted)')).toBeVisible();
    
    // Q không hiện ở root trash nếu cha P bị xóa
    await expect(page.getByText('Folder Q (Deleted)')).not.toBeVisible();
    
    // Mở P thì thấy Q
    // P có ở root trash
    await page.getByText('Folder P (Deleted)').click({ button: 'right' });
    await page.getByText('Mở / Xem nội dung').click();
    
    await page.waitForURL(/trashFolder=/);
    
    // Q xuất hiện
    await expect(page.getByText('Folder Q (Deleted)')).toBeVisible();
    
    // F5 trong P
    await page.reload();
    await expect(page.getByText('Folder Q (Deleted)')).toBeVisible();
    
    // Kiểm tra breadcrumb có P
    await expect(page.getByText('Folder P (Deleted)').first()).toBeVisible();
  });

  test('F5 persistence & GlobalProjectContextSwitcher', async ({ page }) => {
    const urls = [
      `/documents`,
      `/documents/${projectId}`,
      `/documents/${projectId}?folder=${activeFolderId}`,
      `/documents/${projectId}?trash=true`,
      `/documents/${projectId}?trash=true&trashFolder=${trashFolderPId}`
    ];
    
    for (const url of urls) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // We expect no hydration errors (which are asserted globally in beforeEach)
      // We also check if the active project name is displayed if we are inside a project
      if (url !== '/documents') {
        await expect(page.getByText('QA E2E Project').first()).toBeVisible();
      }
    }
  });

  test('Upload 50MB using raw body/XHR (True flow)', async ({ page }) => {
    const dummyBuffer50 = Buffer.alloc(50 * 1024 * 1024, 'a');
    dummyBuffer50.write('%PDF-', 0);
    const fileName = 'test-50mb-raw.pdf';
    
    // Construct query string for metadata
    const query = new URLSearchParams({
      projectId,
      folderId: activeFolderId,
      fileName,
      displayName: 'test-50mb',
    }).toString();

    const res = await page.request.post(`/api/documents/upload?${query}`, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': dummyBuffer50.length.toString()
      },
      data: dummyBuffer50
    });
    
    expect(res.status()).toBe(200);

    // Verify DB
    const createdDoc = await prisma.document.findFirst({
      where: { originalName: fileName, projectId }
    });
    expect(createdDoc).not.toBeNull();
    expect(createdDoc?.size).toBe(50 * 1024 * 1024);

    // Cleanup
    if (createdDoc) {
      await prisma.document.delete({ where: { id: createdDoc.id } });
      const fs = require('fs');
      if (fs.existsSync(createdDoc.storedName)) {
        fs.unlinkSync(createdDoc.storedName);
      }
    }
  });

  test('Upload 150MB expected 413 Limit', async ({ page }) => {
    test.setTimeout(120000); // Allow time for large alloc
    const dummyBuffer150 = Buffer.alloc(150 * 1024 * 1024, 'a');
    dummyBuffer150.write('%PDF-', 0);
    
    const query = new URLSearchParams({
      projectId,
      folderId: activeFolderId,
      fileName: 'test-150mb.pdf',
    }).toString();

    const res = await page.request.post(`/api/documents/upload?${query}`, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': dummyBuffer150.length.toString()
      },
      data: dummyBuffer150
    });
    
    expect([413, 400]).toContain(res.status());
  });
});
