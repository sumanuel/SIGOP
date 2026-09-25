import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/prisma';

// Endpoint de diagnóstico: confirma que la app y la conexión a la base de
// datos están arriba. Útil para monitoreo (uptime checks) y para verificar
// rápidamente el despliegue en el servidor.

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'up', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Health check falló:', error);
    return NextResponse.json(
      { status: 'error', db: 'down', timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
