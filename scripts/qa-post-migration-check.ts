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
    const targetTables = ["Supplier", "Contract", "PaymentPlan", "PaymentRecord", "PaymentRequest"];
    const tablesCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])
    `, [targetTables]);
    console.log("Deleted Tables remaining: " + tablesCheck.rows.length);

    const amountColCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ApprovalRequest' AND column_name = 'amount'
    `);
    console.log("ApprovalRequest.amount remaining: " + amountColCheck.rows.length);

    const fiscalColCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'SystemSetting' AND column_name = 'fiscalYearStartMonth'
    `);
    console.log("SystemSetting.fiscalYearStartMonth remaining: " + fiscalColCheck.rows.length);

    const enumsCheck = await client.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'ApprovalRequestType' AND e.enumlabel IN ('CONTRACT', 'PAYMENT')
    `);
    console.log("Approval CONTRACT/PAYMENT enum values remaining: " + enumsCheck.rows.length);

    const roleCheck = await client.query(`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'UserRole' AND e.enumlabel = 'ACCOUNTANT'
    `);
    console.log("UserRole ACCOUNTANT enum value remaining: " + roleCheck.rows.length);

    const fkCheck = await client.query(`
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE ccu.table_name = ANY($1::text[]) AND tc.constraint_type = 'FOREIGN KEY'
    `, [targetTables]);
    console.log("Foreign keys to deleted tables remaining: " + fkCheck.rows.length);

    const userCount = await client.query('SELECT COUNT(*) FROM "User"');
    console.log("User count post-migration: " + userCount.rows[0].count);

    const staffCount = await client.query('SELECT COUNT(*) FROM "User" WHERE role = \'STAFF\'');
    console.log("STAFF count post-migration: " + staffCount.rows[0].count);

    const approvalDataCheck = await client.query(`SELECT COUNT(*) FROM "ApprovalRequest" WHERE type::text IN ('CONTRACT', 'PAYMENT')`);
    console.log("Approval CONTRACT/PAYMENT data remaining: " + approvalDataCheck.rows[0].count);

    const notificationCheck = await client.query(`SELECT COUNT(*) FROM "Notification" WHERE upper(type) IN ('PAYMENT', 'CONTRACT', 'SUPPLIER')`);
    console.log("Notification financial data remaining: " + notificationCheck.rows[0].count);

    const auditCheck = await client.query(`SELECT COUNT(*) FROM "AuditLog" WHERE upper("entityType") IN ('SUPPLIER', 'CONTRACT', 'PAYMENTPLAN', 'PAYMENTRECORD', 'PAYMENTREQUEST')`);
    console.log("Audit financial data remaining: " + auditCheck.rows[0].count);

  } catch (e: any) {
    console.error("Error querying DB: " + e.message);
  } finally {
    await client.end();
  }
}

main();
