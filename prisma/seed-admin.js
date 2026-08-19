require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
const bcrypt = require("bcryptjs");

const url =
  process.env.MYSQL_DATABASE_URL ||
  process.env.DATABASE_URL ||
  process.env.MYSQL_URL ||
  process.env.DB_URL;

if (!url) {
  throw new Error(
    "Missing database URL. Set MYSQL_DATABASE_URL, DATABASE_URL, MYSQL_URL, or DB_URL."
  );
}

// Convert mysql://user:password@host:port/database
// into the configuration required by PrismaMariaDb.
const dbUrl = new URL(url);

const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: Number(dbUrl.port || 3306),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: decodeURIComponent(dbUrl.pathname.replace(/^\//, "")),
  connectionLimit: 5,
    allowPublicKeyRetrieval: true,

});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 10);

  const user = await prisma.user.upsert({
    where: {
      username: "admin",
    },
    update: {
      password: hashedPassword,
      role: "Administrator",
    },
    create: {
      username: "admin",
      email: "admin@example.com",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      role: "Administrator",
    },
  });

  console.log("Admin user ready!");
  console.log("Username: admin");
  console.log("Password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });