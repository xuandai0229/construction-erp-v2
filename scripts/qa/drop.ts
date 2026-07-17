const { Client } = require('pg');
const c = new Client({ connectionString: 'postgresql://postgres:123456@127.0.0.1:5432/construction_erp_v2_qa?schema=public' });
c.connect().then(() => c.query('ALTER TABLE "ApprovalRequest" DROP COLUMN IF EXISTS "entityType", DROP COLUMN IF EXISTS "entityId"')).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
