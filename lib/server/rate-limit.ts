// Limitador de tasa en memoria (por proceso). Suficiente para un solo
// servidor sin Docker/Redis (ver PLAN_PROYECTO.md sección 5). Si en el
// futuro se despliega en varias instancias, esto debe moverse a Redis para
// que el conteo sea compartido entre procesos.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * true si `key` superó `limite` intentos dentro de `ventanaMs`.
 * Cada llamada cuenta como un intento.
 */
export function estaLimitado(key: string, limite: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || ahora > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: ahora + ventanaMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limite;
}
