const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.setting.updateMany({
    where: { key: { in: ['stripePublicKey', 'stripeSecretKey'] } },
    data: { value: '' }
  });
  console.log('Cleared!');
}
main().finally(() => prisma.$disconnect());
