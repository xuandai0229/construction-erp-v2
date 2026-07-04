require('dotenv').config();
import prisma from "../src/lib/prisma";

async function main() {
  const item = await prisma.fieldProgressItem.findFirst({
    where: { itemType: "WORK" }
  });
  
  if (!item) return console.log("No item");
  
  try {
    await prisma.fieldProgressEntry.create({
      data: {
        projectId: item.projectId,
        itemId: item.id,
        templateId: item.templateId,
        entryDate: new Date(),
        quantity: 44,
        status: "APPROVED",
        createdById: "system"
      }
    });
    console.log("Created first entry");
    
    await prisma.fieldProgressEntry.create({
      data: {
        projectId: item.projectId,
        itemId: item.id,
        templateId: item.templateId,
        entryDate: new Date(Date.now() - 86400000), // yesterday
        quantity: 44, // SAME QUANTITY
        status: "APPROVED",
        createdById: "system"
      }
    });
    console.log("Created second entry successfully!");
  } catch (e) {
    console.error("Error creating entries:", e);
  }
}

main();
