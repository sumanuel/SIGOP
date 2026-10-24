/* Service worker de SIGOP: permite abrir el sitio sin conexión con lo último que se vio.
 *
 * Qué guarda:
 *  - Archivos estáticos de la app (/_next/static, íconos): primero la copia local (son inmutables).
 *  - Páginas públicas y datos públicos del mapa/estadísticas: primero la red; si falla, la última copia.
 *  - Sin red y sin copia: la página /offline.
 *
 * Qué NO guarda jamás (privacidad y seguridad):
 *  - El panel (/admin) y toda la API de administración y sesión.
 *  - Las denuncias: guardar en el equipo qué páginas visitó alguien podría exponer a un
 *    denunciante en un dispositivo compartido.
 *  - Cualquier petición que no sea GET (formularios, suscripciones, reportes).
 *  - Las teselas del mapa: los proveedores gratuitos prohíben su descarga masiva; el navegador
 *    ya las guarda en su caché normal.
 */

const VERSION = 'v1';
const CACHE_ESTATICO = `sigop-estatico-${VERSION}`;
const CACHE_PAGINAS = `sigop-paginas-${VERSION}`;
const CACHE_DATOS = `sigop-datos-${VERSION}`;
const CACHES_VIGENTES = [CACHE_ESTATICO, CACHE_PAGINAS, CACHE_DATOS];
const PAGINA_OFFLINE = '/offline';
const MAX_PAGINAS = 40;
const MAX_DATOS = 30;

// Nunca pasan por el caché.
const RUTAS_EXCLUIDAS = [/^\/admin(\/|$)/, /^\/api\/admin(\/|$)/, /^\/api\/auth(\/|$)/, /^\/denuncias(\/|$)/, /^\/api\/denuncias(\/|$)/, /^\/suscripcion(\/|$)/, /^\/api\/suscripciones(\/|$)/];
// Datos públicos de solo lectura que alimentan el mapa y las estadísticas.
const RUTAS_DATOS = [/^\/api\/obras(\/|$)/, /^\/api\/datos-abiertos(\/|$)/];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE_ESTATICO)
      .then((cache) => cache.addAll([PAGINA_OFFLINE, '/icons/icon-192.png', '/icons/icon-512.png']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.filter((n) => n.startsWith('sigop-') && !CACHES_VIGENTES.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

async function limitar(nombreCache, maximo) {
  const cache = await caches.open(nombreCache);
  const claves = await cache.keys();
  if (claves.length > maximo) await Promise.all(claves.slice(0, claves.length - maximo).map((c) => cache.delete(c)));
}

async function guardar(nombreCache, peticion, respuesta, maximo) {
  // Solo respuestas correctas y sin cookies de sesión de por medio.
  if (!respuesta || respuesta.status !== 200 || respuesta.type === 'opaque') return;
  const cache = await caches.open(nombreCache);
  await cache.put(peticion, respuesta.clone());
  if (maximo) await limitar(nombreCache, maximo);
}

async function primeroCache(peticion) {
  const guardada = await caches.match(peticion);
  if (guardada) return guardada;
  const respuesta = await fetch(peticion);
  await guardar(CACHE_ESTATICO, peticion, respuesta);
  return respuesta;
}

async function primeroRed(peticion, nombreCache, maximo, alternativa) {
  try {
    const respuesta = await fetch(peticion);
    await guardar(nombreCache, peticion, respuesta, maximo);
    return respuesta;
  } catch {
    const guardada = await caches.match(peticion, { ignoreSearch: false });
    if (guardada) return guardada;
    if (alternativa) return alternativa();
    return new Response(JSON.stringify({ error: 'Sin conexión' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;

  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return; // teselas y otros servicios: los maneja el navegador
  if (RUTAS_EXCLUIDAS.some((r) => r.test(url.pathname))) return;
  // Una petición con rango (video) no se puede guardar a medias.
  if (peticion.headers.has('range')) return;

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    evento.respondWith(primeroCache(peticion));
    return;
  }

  if (RUTAS_DATOS.some((r) => r.test(url.pathname))) {
    evento.respondWith(primeroRed(peticion, CACHE_DATOS, MAX_DATOS));
    return;
  }

  if (peticion.mode === 'navigate') {
    evento.respondWith(primeroRed(peticion, CACHE_PAGINAS, MAX_PAGINAS, () => caches.match(PAGINA_OFFLINE)));
  }
});
