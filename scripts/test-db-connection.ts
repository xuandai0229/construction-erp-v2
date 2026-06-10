import "dotenv/config";
import prisma from "../src/lib/prisma";

async function main() {
  try {
    console.log("Testing database connection...");
    const count = await prisma.project.count();
    console.log(`✅ Database connected. Found ${count} projects.`);
    return true;
  } catch (error: any) {
    console.error("❌ Database connection failed:");
    console.error(error.message);
    return false;
  }
}

main()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
