const { execSync } = require('child_process');
require('dotenv').config();
const date = new Date();
const ds = date.toISOString().replace(/[:\-T]/g, '').slice(0, 14);
const file = '.local-audit-quarantine/db-backups/before-field-progress-uat-baseline-' + ds + '.sql';
const dbUrl = process.env.DATABASE_URL.split('?')[0];
execSync(`"C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe" ${dbUrl} > ${file}`);
console.log(file);
