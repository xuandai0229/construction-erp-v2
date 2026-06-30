const { Pool } = require('pg');
require('dotenv').config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  console.log("=== BẮT ĐẦU AUDIT DỮ LIỆU TÀI CHÍNH DASHBOARD (PG DIRECT) ===\n");

  const projectRes = await pool.query(`SELECT * FROM "Project" WHERE "name" LIKE '%Trần Quang Hiếu%' AND "deletedAt" IS NULL LIMIT 1`);
  const project = projectRes.rows[0];

  if (!project) {
    console.log("Không tìm thấy dự án.");
    await pool.end();
    return;
  }

  console.log(`[1] PROJECT INFO:`);
  console.log(`- ID: ${project.id}`);
  console.log(`- Code: ${project.code}`);
  console.log(`- Name: ${project.name}`);
  console.log(`- Status: ${project.status}\n`);

  // Contracts
  const contractRes = await pool.query(`SELECT * FROM "Contract" WHERE "projectId" = $1 AND "deletedAt" IS NULL`, [project.id]);
  const contracts = contractRes.rows;

  console.log(`[2] CONTRACTS TRONG DB: ${contracts.length}`);
  contracts.forEach(c => {
    console.log(`  - ID: ${c.id} | Status: ${c.status} | Value: ${c.value}`);
  });

  const activeContracts = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'COMPLETED');
  const activeContractValue = activeContracts.reduce((sum, c) => sum + parseFloat(c.value), 0);
  console.log(`  => Hợp đồng hợp lệ: ${activeContracts.length}, Tổng: ${activeContractValue}\n`);

  // Payments
  const paymentRes = await pool.query(`SELECT * FROM "PaymentRequest" WHERE "projectId" = $1 AND "deletedAt" IS NULL`, [project.id]);
  const payments = paymentRes.rows;

  console.log(`[3] PAYMENT REQUESTS TRONG DB: ${payments.length}`);
  payments.forEach(p => {
    console.log(`  - ID: ${p.id} | Status: ${p.status} | Amount: ${p.totalAmount}`);
  });

  const pendingPayments = payments.filter(p => !['PAID', 'REJECTED', 'CANCELLED', 'DRAFT'].includes(p.status));
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + parseFloat(p.totalAmount), 0);
  console.log(`  => Thanh toán chờ xử lý: ${pendingPayments.length}, Tổng: ${pendingAmount}\n`);

  console.log(`[4] GLOBAL DATA:`);
  const globalContractsRes = await pool.query(`SELECT * FROM "Contract" WHERE "deletedAt" IS NULL`);
  console.log(`  - Total global contracts: ${globalContractsRes.rows.length}`);
  const globalPaymentsRes = await pool.query(`SELECT * FROM "PaymentRequest" WHERE "deletedAt" IS NULL`);
  console.log(`  - Total global payments: ${globalPaymentsRes.rows.length}`);

  await pool.end();
}

main().catch(console.error);
