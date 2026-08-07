const path = require('path');
const pgModulePath = require.resolve("pg", { paths: [process.cwd()] });
const { Client } = require(pgModulePath);

async function auditDatabases() {
  const devClient = new Client({ connectionString: 'postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2_dev?schema=public' });
  await devClient.connect();

  console.log('=== AUDITING DEV DATABASE (construction_erp_v2_dev) ===');
  const devEmp = await devClient.query(`SELECT id, code, "fullName" FROM "Employee" WHERE code LIKE '%QA%' OR "fullName" LIKE '%QA%' OR "fullName" LIKE '%Mutation%'`);
  const devOU = await devClient.query(`SELECT id, code, name FROM "OrganizationUnit" WHERE code LIKE '%QA%' OR name LIKE '%QA%' OR code LIKE '%OU_MUT%'`);
  const devPos = await devClient.query(`SELECT id, code, title FROM "Position" WHERE code LIKE '%QA%' OR title LIKE '%QA%' OR code LIKE '%POS_MUT%'`);
  const devPrj = await devClient.query(`SELECT id, code, name FROM "Project" WHERE code LIKE '%QA%' OR name LIKE '%QA%' OR code LIKE '%PRJ_ASN%'`);
  const devUser = await devClient.query(`SELECT id, email, name FROM "User" WHERE email LIKE '%qa_%'`);
  const devAsg = await devClient.query(`SELECT id, notes FROM "EmployeeProjectAssignment" WHERE notes LIKE '%QA%' OR notes LIKE '%MUT%'`);

  console.log('Dev DB Leaked Employees:', devEmp.rows);
  console.log('Dev DB Leaked OrgUnits:', devOU.rows);
  console.log('Dev DB Leaked Positions:', devPos.rows);
  console.log('Dev DB Leaked Projects:', devPrj.rows);
  console.log('Dev DB Leaked Users:', devUser.rows);
  console.log('Dev DB Leaked Assignments:', devAsg.rows);

  await devClient.end();

  const qaClient = new Client({ connectionString: 'postgresql://hr_qa_user:hr_qa_password_2026_secure@127.0.0.1:5432/construction_erp_v2_hr_qa?schema=public' });
  await qaClient.connect();

  console.log('\n=== AUDITING HR QA DATABASE (construction_erp_v2_hr_qa) ===');
  const qaEmp = await qaClient.query(`SELECT id, code, "fullName" FROM "Employee"`);
  const qaOU = await qaClient.query(`SELECT id, code, name FROM "OrganizationUnit"`);
  const qaPos = await qaClient.query(`SELECT id, code, title FROM "Position"`);
  const qaPrj = await qaClient.query(`SELECT id, code, name FROM "Project"`);
  const qaUser = await qaClient.query(`SELECT id, email, name FROM "User"`);
  const qaAsg = await qaClient.query(`SELECT id, notes FROM "EmployeeProjectAssignment"`);

  console.log('QA DB Employees count:', qaEmp.rows.length);
  console.log('QA DB OrgUnits count:', qaOU.rows.length);
  console.log('QA DB Positions count:', qaPos.rows.length);
  console.log('QA DB Projects count:', qaPrj.rows.length);
  console.log('QA DB Users count:', qaUser.rows.length);
  console.log('QA DB Assignments count:', qaAsg.rows.length);

  await qaClient.end();
}

auditDatabases().catch(console.error);
