const path = require('path');
const pgModulePath = require.resolve("pg", { paths: [process.cwd()] });
const { Client } = require(pgModulePath);

async function cleanLeakedDevRecords() {
  const devClient = new Client({ connectionString: 'postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2_dev?schema=public' });
  await devClient.connect();

  console.log('=== CLEANING EXACT LEAKED RECORDS FROM DEV DATABASE ===');

  const leakedEmpIds = [
    'emp_6_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'emp_7_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'emp_1_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'emp_2_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'emp_3_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'emp_4_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'emp_5_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'emp_8_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'cmsia3x4n0000ick5avrdeeen',
    'cmsia4myf000314k5zdsh03mo',
    'cmsia4my0000114k5kc6gha30'
  ];

  const leakedOUIds = [
    'ou_root_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'ou_child1_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'ou_child2_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'ou_root_HR_PHASE_4_5_3_1786066563069_7066c71c',
    'ou_child1_HR_PHASE_4_5_3_1786066563069_7066c71c',
    'ou_child2_HR_PHASE_4_5_3_1786066563069_7066c71c'
  ];

  const leakedPosIds = [
    'pos_0_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'pos_1_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'pos_2_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'pos_3_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'pos_0_HR_PHASE_4_5_3_1786066563069_7066c71c',
    'pos_1_HR_PHASE_4_5_3_1786066563069_7066c71c',
    'pos_2_HR_PHASE_4_5_3_1786066563069_7066c71c',
    'pos_3_HR_PHASE_4_5_3_1786066563069_7066c71c'
  ];

  const leakedPrjIds = [
    'prj_active_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'prj_future_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'prj_closed_HR_PHASE_4_5_3_1786066551066_fd2a9bcc'
  ];

  const leakedUserIds = [
    'usr_admin_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'usr_director_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'usr_deputy_director_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'usr_manager_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'usr_chief_commander_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'usr_staff_HR_PHASE_4_5_3_1786066551066_fd2a9bcc',
    'usr_admin_HR_PHASE_4_5_3_1786066563069_7066c71c',
    'usr_director_HR_PHASE_4_5_3_1786066563069_7066c71c',
    'usr_deputy_director_HR_PHASE_4_5_3_1786066563069_7066c71c',
    'usr_manager_HR_PHASE_4_5_3_1786066563069_7066c71c',
    'usr_chief_commander_HR_PHASE_4_5_3_1786066563069_7066c71c',
    'usr_staff_HR_PHASE_4_5_3_1786066563069_7066c71c'
  ];

  // FK Dependent deletions
  await devClient.query(`DELETE FROM "EmployeeProjectAssignment" WHERE "employeeId" = ANY($1::text[]) OR "projectId" = ANY($2::text[])`, [leakedEmpIds, leakedPrjIds]);
  await devClient.query(`DELETE FROM "OrganizationUnitManagerAssignment" WHERE "employeeId" = ANY($1::text[]) OR "organizationUnitId" = ANY($2::text[])`, [leakedEmpIds, leakedOUIds]);
  await devClient.query(`DELETE FROM "EmployeeOrganizationAssignment" WHERE "employeeId" = ANY($1::text[]) OR "organizationUnitId" = ANY($2::text[]) OR "positionId" = ANY($3::text[])`, [leakedEmpIds, leakedOUIds, leakedPosIds]);
  await devClient.query(`DELETE FROM "EmployeeChangeHistory" WHERE "employeeId" = ANY($1::text[])`, [leakedEmpIds]);
  await devClient.query(`DELETE FROM "Employee" WHERE id = ANY($1::text[])`, [leakedEmpIds]);
  await devClient.query(`DELETE FROM "User" WHERE id = ANY($1::text[])`, [leakedUserIds]);
  await devClient.query(`DELETE FROM "Position" WHERE id = ANY($1::text[])`, [leakedPosIds]);
  await devClient.query(`DELETE FROM "OrganizationUnit" WHERE id = ANY($1::text[])`, [leakedOUIds]);
  await devClient.query(`DELETE FROM "Project" WHERE id = ANY($1::text[])`, [leakedPrjIds]);

  console.log('Cleaned exact leaked records from Dev Database successfully.');
  await devClient.end();
}

cleanLeakedDevRecords().catch(console.error);
