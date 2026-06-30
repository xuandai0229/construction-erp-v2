const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log("=== BẮT ĐẦU AUDIT GLOBAL PROJECT CONTEXT & FINANCE ===");

  // Check Tran Quang Hieu
  const p1Res = await pool.query(`SELECT * FROM "Project" WHERE "name" LIKE '%Trần Quang Hiếu%' LIMIT 1`);
  const p1 = p1Res.rows[0];

  // Check Nha Van Phong
  const p2Res = await pool.query(`SELECT * FROM "Project" WHERE "name" LIKE '%Nha Van Phong%' OR "name" LIKE '%Nhà Văn Phòng%' LIMIT 1`);
  const p2 = p2Res.rows[0] || { id: 'unknown', name: 'Nha Van Phong (Not found by name)' };

  console.log(`[1] Selected project từ cookie: N/A (Script chạy ngoài Next.js)`);
  console.log(`[2] Selected project từ URL: N/A (Script chạy ngoài Next.js)`);
  
  const contractsRes = await pool.query(`SELECT "projectId", COUNT(*) as count FROM "Contract" GROUP BY "projectId"`);
  console.log(`[3] Projects có Contract: ${contractsRes.rows.map(r => r.projectId).join(', ')}`);

  const paymentsRes = await pool.query(`SELECT "projectId", COUNT(*) as count FROM "PaymentRequest" GROUP BY "projectId"`);
  console.log(`[4] Projects có PaymentRequest: ${paymentsRes.rows.map(r => r.projectId).join(', ')}`);

  const materialsRes = await pool.query(`SELECT "projectId", COUNT(*) as count FROM "MaterialMovement" GROUP BY "projectId"`);
  console.log(`[5] Projects có MaterialMovement: ${materialsRes.rows.map(r => r.projectId).join(', ')}`);

  console.log(`[6] ĐỐI CHIẾU:`);
  
  // Tran Quang Hieu stats
  const c1 = await pool.query(`SELECT COUNT(*) FROM "Contract" WHERE "projectId" = $1`, [p1?.id]);
  const pr1 = await pool.query(`SELECT COUNT(*) FROM "PaymentRequest" WHERE "projectId" = $1`, [p1?.id]);
  console.log(`  - Dự án Trần Quang Hiếu (${p1?.id}) có Contract không? ${c1.rows[0].count > 0 ? 'CÓ' : 'KHÔNG'} (${c1.rows[0].count})`);
  console.log(`  - Dự án Trần Quang Hiếu (${p1?.id}) có PaymentRequest không? ${pr1.rows[0].count > 0 ? 'CÓ' : 'KHÔNG'} (${pr1.rows[0].count})`);

  // Nha Van Phong stats
  const c2 = await pool.query(`SELECT COUNT(*) FROM "Contract" WHERE "projectId" = $1`, [p2?.id]);
  const pr2 = await pool.query(`SELECT COUNT(*) FROM "PaymentRequest" WHERE "projectId" = $1`, [p2?.id]);
  const mat2 = await pool.query(`SELECT COUNT(*) FROM "MaterialMovement" WHERE "projectId" = $1`, [p2?.id]);
  console.log(`  - Công trình Nha Van Phong (${p2?.id}) có Contract không? ${c2.rows[0].count > 0 ? 'CÓ' : 'KHÔNG'} (${c2.rows[0].count})`);
  console.log(`  - Công trình Nha Van Phong (${p2?.id}) có PaymentRequest không? ${pr2.rows[0].count > 0 ? 'CÓ' : 'KHÔNG'} (${pr2.rows[0].count})`);
  console.log(`  - Công trình Nha Van Phong (${p2?.id}) có Material data không? ${mat2.rows[0].count > 0 ? 'CÓ' : 'KHÔNG'} (${mat2.rows[0].count})`);

  const pWithData = await pool.query(`SELECT name FROM "Project" WHERE id = 'cmqvqgltk0009n0wk9dsqslvy'`);
  console.log(`\n  => Project có thực sự có dữ liệu là: ${pWithData.rows[0]?.name}`);

  await pool.end();
}

main().catch(console.error);
