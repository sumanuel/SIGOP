import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';

// Ejecuta public/sw.js tal como lo haría el navegador, pero con una red y un caché simulados,
// para comprobar sus reglas: qué guarda, qué nunca guarda y qué muestra sin conexión.

const CODIGO = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const ORIGEN = 'http://sigop.test';

type Oyente = (evento: unknown) => void;

function crearEntorno() {
  const oyentes = new Map<string, Oyente>();
  const almacenes = new Map<string, Map<string, Response>>();
  const pedidosARed: string[] = [];
  const estado = { enLinea: true, respuestas: new Map<string, () => Response>() };

  const clave = (p: Request | string) => (typeof p === 'string' ? new URL(p, ORIGEN).href : p.url);

  const caches = {
    async open(nombre: string) {
      if (!almacenes.has(nombre)) almacenes.set(nombre, new Map());
      const almacen = almacenes.get(nombre)!;
      return {
        async addAll(urls: string[]) {
          for (const u of urls) almacen.set(clave(u), await fakeFetch(clave(u)));
        },
        async put(p: Request, r: Response) {
          almacen.set(clave(p), r);
        },
        async keys() {
          return [...almacen.keys()].map((u) => new Request(u));
        },
        async delete(p: Request) {
          return almacen.delete(clave(p));
        },
      };
    },
    async keys() {
      return [...almacenes.keys()];
    },
    async delete(nombre: string) {
      return almacenes.delete(nombre);
    },
    async match(p: Request | string) {
      for (const almacen of almacenes.values()) {
        const r = almacen.get(clave(p));
        if (r) return r.clone();
      }
      return undefined;
    },
  };

  async function fakeFetch(entrada: Request | string) {
    const url = clave(entrada);
    pedidosARed.push(url);
    if (!estado.enLinea) throw new TypeError('Failed to fetch');
    const fabrica = estado.respuestas.get(new URL(url).pathname);
    return fabrica ? fabrica() : new Response('contenido de ' + url, { status: 200 });
  }

  const self = {
    location: { origin: ORIGEN },
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
    addEventListener: (tipo: string, fn: Oyente) => oyentes.set(tipo, fn),
  };

  new Function('self', 'caches', 'fetch', 'Response', 'URL', CODIGO)(self, caches, fakeFetch, Response, URL);

  /** Dispara `install`/`activate` y espera lo que el service worker pida esperar. */
  async function ciclo(tipo: 'install' | 'activate') {
    let pendiente: Promise<unknown> = Promise.resolve();
    oyentes.get(tipo)!({ waitUntil: (p: Promise<unknown>) => (pendiente = p) });
    await pendiente;
  }

  /** Simula una petición. Devuelve null si el service worker la deja pasar (no responde él). */
  async function pedir(ruta: string, init: { method?: string; modo?: RequestMode; headers?: Record<string, string>; url?: string } = {}) {
    const url = init.url ?? ORIGEN + ruta;
    const request = new Request(url, { method: init.method ?? 'GET', headers: init.headers });
    Object.defineProperty(request, 'mode', { value: init.modo ?? 'cors' });
    let respuesta: Promise<Response> | null = null;
    oyentes.get('fetch')!({ request, respondWith: (p: Promise<Response>) => (respuesta = p) });
    return respuesta ? await (respuesta as Promise<Response>) : null;
  }

  return { ciclo, pedir, almacenes, pedidosARed, estado, fakeFetch };
}

let sw: ReturnType<typeof crearEntorno>;

beforeEach(async () => {
  sw = crearEntorno();
  await sw.ciclo('install'); // deja /offline guardada, como en el primer uso real
  sw.pedidosARed.length = 0;
});

describe('instalación y limpieza', () => {
  it('al instalar guarda la página /offline', async () => {
    const guardadas = [...[...sw.almacenes.values()].flatMap((a) => [...a.keys()])];
    expect(guardadas).toContain(ORIGEN + '/offline');
  });

  it('al activarse borra los cachés de versiones viejas y respeta los ajenos', async () => {
    sw.almacenes.set('sigop-paginas-v0', new Map());
    sw.almacenes.set('otra-app', new Map());
    await sw.ciclo('activate');
    expect([...sw.almacenes.keys()]).not.toContain('sigop-paginas-v0');
    expect([...sw.almacenes.keys()]).toContain('otra-app');
  });
});

describe('lo que NUNCA se guarda ni se intercepta', () => {
  it.each([
    '/admin',
    '/admin/obras/123/editar',
    '/api/admin/obras/exportar',
    '/api/auth/me',
    '/api/auth/login',
    '/denuncias',
    '/denuncias/seguimiento',
    '/api/denuncias',
    '/suscripcion/baja',
    '/api/suscripciones/baja',
  ])('%s pasa directo a la red, sin caché', async (ruta) => {
    const r = await sw.pedir(ruta, { modo: 'navigate' });
    expect(r).toBeNull();
    const total = [...sw.almacenes.values()].flatMap((a) => [...a.keys()]).filter((u) => u.includes(ruta));
    expect(total).toEqual([]);
  });

  it('las peticiones que no son GET (formularios) no se tocan', async () => {
    expect(await sw.pedir('/api/obras/x/reportes', { method: 'POST' })).toBeNull();
  });

  it('otros dominios (teselas del mapa) los maneja el navegador', async () => {
    expect(await sw.pedir('', { url: 'https://tile.openstreetmap.org/5/10/15.png' })).toBeNull();
  });

  it('las peticiones con rango (video) no se interceptan', async () => {
    expect(await sw.pedir('/uploads/video.mp4', { headers: { Range: 'bytes=0-100' } })).toBeNull();
  });

  it('una respuesta con error no se guarda', async () => {
    sw.estado.respuestas.set('/api/obras', () => new Response('error', { status: 500 }));
    await sw.pedir('/api/obras');
    sw.estado.enLinea = false;
    const sinConexion = await sw.pedir('/api/obras');
    expect(sinConexion?.status).toBe(503);
  });
});

describe('archivos estáticos', () => {
  it('se sirven de la copia local después de la primera descarga', async () => {
    await sw.pedir('/_next/static/chunks/app.js');
    expect(sw.pedidosARed).toHaveLength(1);
    const segunda = await sw.pedir('/_next/static/chunks/app.js');
    expect(sw.pedidosARed).toHaveLength(1); // no volvió a la red
    expect(await segunda?.text()).toContain('/_next/static/chunks/app.js');
  });
});

describe('páginas públicas', () => {
  it('con red, se muestra lo más reciente y se guarda copia', async () => {
    const r = await sw.pedir('/estadisticas', { modo: 'navigate' });
    expect(r?.status).toBe(200);
    sw.estado.enLinea = false;
    const sinRed = await sw.pedir('/estadisticas', { modo: 'navigate' });
    expect(await sinRed?.text()).toContain('/estadisticas'); // la copia guardada
  });

  it('sin red y sin copia, muestra la página /offline', async () => {
    sw.estado.respuestas.set('/offline', () => new Response('pagina offline'));
    await sw.ciclo('install'); // vuelve a guardar /offline con este contenido
    sw.estado.enLinea = false;
    const r = await sw.pedir('/obras/algo-que-nunca-abri', { modo: 'navigate' });
    expect(await r?.text()).toBe('pagina offline');
  });

  it('con red, una página nueva reemplaza a la copia vieja', async () => {
    sw.estado.respuestas.set('/ranking', () => new Response('version 1'));
    await sw.pedir('/ranking', { modo: 'navigate' });
    sw.estado.respuestas.set('/ranking', () => new Response('version 2'));
    await sw.pedir('/ranking', { modo: 'navigate' });
    sw.estado.enLinea = false;
    expect(await (await sw.pedir('/ranking', { modo: 'navigate' }))?.text()).toBe('version 2');
  });
});

describe('datos públicos del mapa', () => {
  it('sin red devuelven la última copia; sin copia, un 503 en JSON', async () => {
    sw.estado.respuestas.set('/api/obras', () => new Response(JSON.stringify({ obras: [1, 2] }), { status: 200 }));
    await sw.pedir('/api/obras');
    sw.estado.enLinea = false;
    expect(await (await sw.pedir('/api/obras'))?.json()).toEqual({ obras: [1, 2] });

    const sinCopia = await sw.pedir('/api/datos-abiertos/obras');
    expect(sinCopia?.status).toBe(503);
    expect(await sinCopia?.json()).toEqual({ error: 'Sin conexión' });
  });
});
