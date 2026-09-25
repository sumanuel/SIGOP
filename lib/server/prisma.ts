import { PrismaClient } from '@prisma/client';

// Evita crear múltiples instancias de PrismaClient en desarrollo, donde
// Next.js recarga los módulos en cada cambio (Hot Module Replacement).
// Mismo patrón recomendado por Prisma para apps Next.js.

declare global {
  var __prisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma__ = prisma;
}
