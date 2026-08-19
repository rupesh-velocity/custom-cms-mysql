const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
console.log("URL:", process.env.DATABASE_URL);
const url = process.env.NEON_DATABASE_URL || process.env.PRISMA_DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
console.log("SELECTED URL:", url);
