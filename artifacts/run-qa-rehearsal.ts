import { execSync } from 'child_process';
import { Client } from 'pg';
import fs from 'fs';

const rehearsalDbName = 'construction_erp_v2_clean_rehearsal_20260730';
const basePgUrl = 'postgresql://postgres:123456@127.0.0.1:5432/postgres';
const rehearsalDbUrl = `postgresql://postgres:123456@127.0.0.1:5432/${rehearsalDbName}?schema=public`;

async function runRehearsal() {
  console.log(`Starting QA Rehearsal on fresh database: ${rehearsalDbName}...`);

  const pgClient = new Client({ connectionString: basePgUrl });
  await pgClient.connect();

  // Drop rehearsal DB if exists, then create fresh
  await pgClient.query(`DROP DATABASE IF EXISTS "${rehearsalDbName}"`);
  await pgClient.query(`CREATE DATABASE "${rehearsalDbName}"`);
  await pgClient.end();
  console.log(`Created database ${rehearsalDbName}`);

  // Deploy migrations to fresh rehearsal DB
  console.log('Running npx prisma migrate deploy...');
  const deployOutput = execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: rehearsalDbUrl },
    encoding: 'utf-8'
  });
  console.log('Migrate deploy output:\n', deployOutput);

  // Check migrate status
  console.log('Running npx prisma migrate status...');
  const statusOutput = execSync('npx prisma migrate status', {
    env: { ...process.env, DATABASE_URL: rehearsalDbUrl },
    encoding: 'utf-8'
  });
  console.log('Migrate status output:\n', statusOutput);

  // Inspect tables in rehearsal DB
  const rehearsalPgClient = new Client({ connectionString: rehearsalDbUrl });
  await rehearsalPgClient.connect();

  const tablesRes = await rehearsalPgClient.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const tables: string[] = tablesRes.rows.map((r: any) => r.table_name);
  
  const safetyTables = tables.filter((t) => t.toLowerCase().includes('safety'));
  const supervisionTables = tables.filter((t) => t.toLowerCase().includes('supervision'));

  console.log('Total tables created:', tables.length);
  console.log('Safety tables found:', safetyTables);
  console.log('Supervision tables found:', supervisionTables);

  await rehearsalPgClient.end();

  // Drop the temporary rehearsal DB
  const cleanupPgClient = new Client({ connectionString: basePgUrl });
  await cleanupPgClient.connect();
  await cleanupPgClient.query(`DROP DATABASE IF EXISTS "${rehearsalDbName}"`);
  await cleanupPgClient.end();
  console.log(`Dropped database ${rehearsalDbName} (databaseDropped=true)`);

  return {
    rehearsalDbName,
    deployPassed: deployOutput.includes('All migrations have been successfully applied'),
    statusPassed: statusOutput.includes('Database schema is up to date'),
    totalTables: tables.length,
    safetyTablesCount: safetyTables.length,
    supervisionTablesCount: supervisionTables.length,
    databaseDropped: true
  };
}

runRehearsal()
  .then((res) => {
    fs.writeFileSync('artifacts/safety-cleanup/qa-rehearsal-result.json', JSON.stringify(res, null, 2));
    console.log('Rehearsal completed successfully:', res);
  })
  .catch((err) => {
    console.error('Rehearsal failed:', err);
    process.exit(1);
  });
