// Types are imported using import type to completely remove them from runtime execution
import type { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prismaClientV3: PrismaClient }

// Recursive mock proxy for build phase
const mockPrisma = new Proxy({}, {
  get(target, prop) {
    if (prop === 'then') return undefined;
    const mockFunc = () => {};
    return new Proxy(mockFunc, {
      get(t, p) {
        if (p === 'then') return undefined;
        return new Proxy(mockFunc, {
          apply() { return Promise.resolve([]); }
        });
      },
      apply() {
        return Promise.resolve([]);
      }
    });
  }
}) as PrismaClient;

let prismaInstance: PrismaClient | undefined = globalForPrisma.prismaClientV3;

// Lazy initialize Prisma to avoid module-level initialization errors in Turbopack
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (prop === 'then') return undefined;

    if (!prismaInstance) {
      let url = process.env.DATABASE_URL;
      
      // Check for build phase using explicit flag
      if (process.env.npm_lifecycle_event === 'build' || process.env.IS_NEXT_BUILD === 'true' || !url) {
        return Reflect.get(mockPrisma, prop);
      }
      
      const { PrismaClient } = require('@prisma/client');
      const { PrismaMariaDb } = require('@prisma/adapter-mariadb');

      const urlObj = new URL(url);
      const adapter = new PrismaMariaDb({ 
        host: urlObj.hostname,
        port: urlObj.port ? parseInt(urlObj.port) : 3306,
        user: urlObj.username,
        password: decodeURIComponent(urlObj.password),
        database: urlObj.pathname.substring(1)
      });
      
      prismaInstance = new PrismaClient({ adapter });
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prismaClientV3 = prismaInstance as PrismaClient;
      }
    }

    return Reflect.get(prismaInstance!, prop);
  }
});
