require('dotenv').config();
import prisma from "../src/lib/prisma";

async function main() {
  const item = await prisma.fieldProgressItem.findFirst({
    where: { workContent: { contains: "hàng rào tôn" } },
  });
  console.log("ITEM:", item);

  if (item) {
    const historicalSums = await prisma.fieldProgressEntry.groupBy({
      by: ["itemId"],
      where: {
        itemId: item.id,
        status: "APPROVED",
        deletedAt: null,
      },
      _sum: { quantity: true },
    });
    console.log("Historical Sums:", historicalSums);
    
    const sameDay = await prisma.fieldProgressEntry.findMany({
      where: { itemId: item.id },
    });
    console.log("All entries:", sameDay);
  }
}

main();
