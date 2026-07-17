import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  const connectionString = process.env.DATABASE_URL;
  console.log('Connecting to:', connectionString);
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const email = 'qa_admin_2026_07@construction-erp-qa.local';
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log('User found in database:', user.email);
    console.log('User role:', user.role);
    console.log('User isActive:', user.isActive);
    console.log('User deletedAt:', user.deletedAt);
    
    // Read the password from the secrets file to compare
    const secretsPath = 'test-results/ui-ux-phase-3/.secrets/qa-credentials.json';
    const saved = JSON.parse(require('fs').readFileSync(secretsPath, 'utf-8'));
    console.log('Password from secrets:', saved.password);
    console.log('Hash in database:', user.password);

    const match = await bcrypt.compare(saved.password, user.password);
    console.log('Bcrypt comparison matches:', match);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

check();
