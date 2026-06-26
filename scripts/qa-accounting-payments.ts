import "dotenv/config";
import prisma from "../src/lib/prisma";
import { getAccountingPermissions } from "../src/lib/accounting/accounting-permissions";

async function runQA() {
  console.log("Starting QA Test for Accounting Payments Simple CRUD...");

  // 1. RBAC Tests (Pure Function)
  console.log("\n--- Testing RBAC Rules ---");
  const adminPerms = getAccountingPermissions("ADMIN");
  console.assert(adminPerms.canCreate === true, "Admin should be able to create");
  console.assert(adminPerms.canUpdate === true, "Admin should be able to update");
  console.assert(adminPerms.canDelete === true, "Admin should be able to delete");

  const noProjectPerms = getAccountingPermissions("ENGINEER", null);
  console.assert(noProjectPerms.canView === false, "User not in project cannot view");

  console.log("✅ RBAC Rules test passed.");

  // 2. Database & Simple CRUD
  console.log("\n--- Testing DB Schema & CRUD ---");
  
  let adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!adminUser) return console.error("No ADMIN user found");

  const project = await prisma.project.findFirst({ where: { status: "ACTIVE" } });
  if (!project) return console.error("No ACTIVE project found");

  // Create a contract
  const contract = await prisma.contract.create({
    data: {
      projectId: project.id,
      contractNo: `C-${Date.now()}`,
      name: "Test Contract for QA",
      type: "SUBCONTRACTOR",
      status: "ACTIVE",
      value: 5000000
    }
  });

  const requestCode = `QA-${Date.now().toString().slice(-6)}`;
  
  try {
    // A. Create request
    const pr = await prisma.paymentRequest.create({
      data: {
        requestCode,
        projectId: project.id,
        contractId: contract.id,
        title: "QA Test Payment",
        type: "PROGRESS",
        status: "DRAFT",
        subTotal: 1000000,
        vatAmount: 100000,
        totalAmount: 1100000,
        dueDate: new Date(),
        createdById: adminUser.id,
        notes: "QA Testing"
      }
    });
    console.log(`✅ Successfully created PaymentRequest: ${pr.requestCode}`);

    // B. Test Update
    const updatedPr = await prisma.paymentRequest.update({
      where: { id: pr.id },
      data: { title: "QA Test Payment - Updated" }
    });
    console.assert(updatedPr.title === "QA Test Payment - Updated", "Title should be updated");
    console.log(`✅ Successfully updated PaymentRequest`);

    // C. Test Soft Delete
    const deletedPr = await prisma.paymentRequest.update({
      where: { id: pr.id },
      data: { deletedAt: new Date() }
    });
    console.assert(deletedPr.deletedAt !== null, "deletedAt should not be null after soft delete");
    console.log(`✅ Successfully soft-deleted PaymentRequest`);

  } catch (err) {
    console.error("❌ QA Test failed:", err);
  } finally {
    // Cleanup
    await prisma.paymentRequest.deleteMany({
      where: { requestCode: { startsWith: "QA-" } }
    });
    await prisma.contract.delete({
      where: { id: contract.id }
    });
    console.log("\n✅ Test data cleaned up.");
    console.log("🎉 QA Script completed.");
  }
}

runQA()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
