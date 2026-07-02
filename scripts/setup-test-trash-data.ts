import { PrismaClient } from "@prisma/client";
import { subDays } from "date-fns";

const prisma = new PrismaClient();

async function runTest() {
  console.log("Setting up test data for trash cleanup...");
  
  try {
    const project = await prisma.project.findFirst();
    if (!project) {
      console.log("No project found to create test data.");
      return;
    }

    const uploader = await prisma.user.findFirst();
    if (!uploader) {
       console.log("No user found.");
       return;
    }

    // 1. Create an 8 days old deleted folder
    const oldFolder = await prisma.documentFolder.create({
      data: {
        name: "Test Folder 8 Days Old",
        projectId: project.id,
        deletedAt: subDays(new Date(), 8),
      }
    });
    console.log("Created old folder:", oldFolder.id);

    // 2. Create a document in the old folder
    const oldDocument = await prisma.document.create({
      data: {
        originalName: "old-doc.pdf",
        displayName: "old-doc.pdf",
        storedName: "old-doc.pdf",
        extension: ".pdf",
        mimeType: "application/pdf",
        size: 1024,
        projectId: project.id,
        folderId: oldFolder.id,
        status: "DRAFT",
        uploadedById: uploader.id,
        deletedAt: subDays(new Date(), 8),
        storagePath: "/tmp/old-doc.pdf",
      }
    });
    console.log("Created old document:", oldDocument.id);

    // 3. Create a recently deleted folder (today)
    const newFolder = await prisma.documentFolder.create({
      data: {
        name: "Test Folder Today",
        projectId: project.id,
        deletedAt: new Date(),
      }
    });
    console.log("Created new folder:", newFolder.id);

    // 4. Create a document in the new folder
    const newDocument = await prisma.document.create({
      data: {
        originalName: "new-doc.pdf",
        displayName: "new-doc.pdf",
        storedName: "new-doc.pdf",
        extension: ".pdf",
        mimeType: "application/pdf",
        size: 1024,
        projectId: project.id,
        folderId: newFolder.id,
        status: "DRAFT",
        uploadedById: uploader.id,
        deletedAt: new Date(),
        storagePath: "/tmp/new-doc.pdf",
      }
    });
    console.log("Created new document:", newDocument.id);
    
    console.log("Setup completed successfully.");
  } catch (error) {
    console.error("Error during test data setup:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
