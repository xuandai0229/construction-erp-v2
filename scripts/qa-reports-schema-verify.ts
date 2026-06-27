import prisma from '../src/lib/prisma';

async function main() {
  console.log("=== KIỂM TRA SCHEMA DB THỰC TẾ ===");
  
  const tables = ['SiteReport', 'SiteReportAttachment', 'SiteReportLine'];
  
  for (const table of tables) {
    console.log(`\n--- Bảng: ${table} ---`);
    try {
      const columns = await prisma.$queryRawUnsafe<{column_name: string, data_type: string}[]>(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
        ORDER BY ordinal_position;
      `);
      
      if (columns.length === 0) {
        console.log(`Bảng ${table} KHÔNG TỒN TẠI trong DB!`);
      } else {
        console.log(`Các cột thực tế trong DB:`);
        columns.forEach(c => console.log(`  - ${c.column_name} (${c.data_type})`));
      }
    } catch (e: any) {
      console.log(`Lỗi query bảng ${table}: ${e.message}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
