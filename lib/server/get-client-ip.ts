import type { NextRequest } from 'next/server';

/** Extrae la IP del cliente desde los headers del proxy (Nginx/IIS en producción). */
export function obtenerIpCliente(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  return request.headers.get('x-real-ip') ?? 'desconocida';
}
