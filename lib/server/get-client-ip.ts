import type { NextRequest } from 'next/server';

/**
 * IP del cliente para el límite de intentos y la auditoría.
 *
 * `X-Forwarded-For` lo escribe cualquiera que llegue directo al puerto de
 * Node, así que solo se confía en él detrás de un proxy propio (Nginx/IIS):
 *  - TRUST_PROXY=true: se lee la entrada que añadió el proxy más cercano
 *    (la última; TRUSTED_PROXY_HOPS=2 si hay dos proxies encadenados). El
 *    proxy debe AÑADIR al encabezado (`$proxy_add_x_forwarded_for`), no copiarlo.
 *  - Sin definir: en desarrollo se usa la primera entrada, por comodidad; en
 *    producción se ignora el encabezado y todos comparten la clave
 *    'desconocida' (los límites se vuelven globales, pero no se pueden evadir).
 */
export function obtenerIpCliente(request: NextRequest): string {
  const configurado = process.env.TRUST_PROXY;
  const confiar = configurado ? configurado === 'true' : process.env.NODE_ENV !== 'production';
  if (!confiar) return 'desconocida';

  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const entradas = forwardedFor.split(',').map((e) => e.trim()).filter(Boolean);
    if (entradas.length) {
      if (configurado !== 'true') return entradas[0];
      const saltos = Math.max(1, Number(process.env.TRUSTED_PROXY_HOPS) || 1);
      return entradas[Math.max(0, entradas.length - saltos)];
    }
  }

  return request.headers.get('x-real-ip') ?? 'desconocida';
}
