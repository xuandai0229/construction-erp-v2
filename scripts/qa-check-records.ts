import { Client } from "pg";

const qaUrlStr = process.env.QA_DATABASE_URL;

async function main() {
  if (!qaUrlStr) {
    console.error("FAIL: QA_DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = new Client({ connectionString: qaUrlStr });
  await client.connect();

  try {
    const supplierRes = await client.query('SELECT COUNT(*) FROM "Supplier"');
    const contractRes = await client.query('SELECT COUNT(*) FROM "Contract"');
    const paymentPlanRes = await client.query('SELECT COUNT(*) FROM "PaymentPlan"');
    const paymentRecordRes = await client.query('SELECT COUNT(*) FROM "PaymentRecord"');
    const paymentRequestRes = await client.query('SELECT COUNT(*) FROM "PaymentRequest"');
    const userRes = await client.query('SELECT COUNT(*) FROM "User"');
    const accountantRes = await client.query('SELECT COUNT(*) FROM "User" WHERE role = \'ACCOUNTANT\'');
    const approvalContractRes = await client.query('SELECT COUNT(*) FROM "ApprovalRequest" WHERE type = \'CONTRACT\'');
    const approvalPaymentRes = await client.query('SELECT COUNT(*) FROM "ApprovalRequest" WHERE type = \'PAYMENT\'');

    console.log("Supplier: " + supplierRes.rows[0].count);
    console.log("Contract: " + contractRes.rows[0].count);
    console.log("PaymentPlan: " + paymentPlanRes.rows[0].count);
    console.log("PaymentRecord: " + paymentRecordRes.rows[0].count);
    console.log("PaymentRequest: " + paymentRequestRes.rows[0].count);
    console.log("User: " + userRes.rows[0].count);
    console.log("ACCOUNTANT: " + accountantRes.rows[0].count);
    console.log("Approval CONTRACT: " + approvalContractRes.rows[0].count);
    console.log("Approval PAYMENT: " + approvalPaymentRes.rows[0].count);
  } catch (e: any) {
    console.error("Error querying DB: " + e.message);
  } finally {
    await client.end();
  }
}

main();
