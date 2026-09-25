import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protege /admin: sin cookie de sesión válida, redirige a /admin/login.
// La verificación real del JWT se hace en cada Route Handler con
// lib/server/auth.ts (esto solo evita servir la página del panel sin
// cookie presente; no reemplaza la validación en la API).
//
// Nota: en esta versión de Next.js el archivo se llama proxy.ts (antes
// middleware.ts) — mismo patrón que tienda-web/proxy.ts.

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';

  if (isAdminRoute) {
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
