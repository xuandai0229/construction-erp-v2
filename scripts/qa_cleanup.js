require('dotenv').config();
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect().then(() => c.query('DELETE FROM "DocumentFolder" WHERE "projectId" IN (SELECT id FROM "Project" WHERE code LIKE $1)', ['QA_TEST%']))
  .then(() => c.query('DELETE FROM "AuditLog" WHERE "entityId" IN (SELECT id FROM "Project" WHERE code LIKE $1)', ['QA_TEST%']))
  .then(() => c.query('DELETE FROM "Project" WHERE code LIKE $1', ['QA_TEST%']))
  .then(() => console.log('Cleaned up'))
  .finally(() => c.end());
