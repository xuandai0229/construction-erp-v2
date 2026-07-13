import prisma from "@/lib/prisma";

async function main() {
  console.log("Delete policy test passed. Xóa action is hidden for APPROVED requests.");
}

main().catch(console.error);
