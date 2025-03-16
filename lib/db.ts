import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

db.$on('error', (e) => {
  console.error('Prisma Client error:', e);
});

db.$on('warn', (e) => {
  console.warn('Prisma Client warning:', e);
}); 