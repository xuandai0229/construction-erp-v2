require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  await client.connect();
  
  console.log("=== KIỂM TRA SCHEMA DB BẰNG PG CLIENT ===");
  const tables = ['SiteReport', 'SiteReportAttachment', 'SiteReportLine'];
  
  for (const table of tables) {
    console.log(`\n--- Bảng: ${table} ---`);
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [table]);
    
    if (res.rows.length === 0) {
      console.log(`Bảng ${table} KHÔNG TỒN TẠI trong DB!`);
    } else {
      console.log(`Các cột thực tế trong DB:`);
      res.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
    }
  }
  
  await client.end();
}

main().catch(console.error);
