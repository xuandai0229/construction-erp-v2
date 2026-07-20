const { Client } = require('pg');
const fs = require('fs');

async function checkDrift() {
  const env = fs.readFileSync('.env', 'utf8');
  const url = env.match(/DATABASE_URL="([^"]+)"/)[1];
  const client = new Client({ connectionString: url });
  await client.connect();

  const models = ['ApprovalRequest', 'SupervisionWeeklyPackage', 'SupervisionVisit', 'SupervisionFinding', 'User', 'Project', 'Notification', 'AuditLog'];
  const schemaStr = fs.readFileSync('prisma/schema.prisma', 'utf8');
  
  for (const model of models) {
    const regex = new RegExp(`model ${model} \\{([\\s\\S]*?)\\}`, 'm');
    const match = schemaStr.match(regex);
    if (!match) continue;
    
    const lines = match[1].split('\n');
    const prismaFields = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;
      const parts = trimmed.split(/\s+/);
      const fieldName = parts[0];
      if (trimmed.includes('@relation')) continue;
      if (parts[1] && parts[1].endsWith(']')) continue;
      prismaFields.push(fieldName);
    }
    
    const res = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${model}'`);
    const dbFields = res.rows.map(r => r.column_name);
    
    const missingInDb = prismaFields.filter(f => !dbFields.includes(f));
    const missingInPrisma = dbFields.filter(f => !prismaFields.includes(f));
    
    console.log(`Model: ${model}`);
    console.log(`  Missing in DB: ${missingInDb.join(', ') || 'None'}`);
    console.log(`  Missing in Prisma: ${missingInPrisma.join(', ') || 'None'}`);
  }

  await client.end();
}
checkDrift().catch(console.error);
