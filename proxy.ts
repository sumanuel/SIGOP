import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/server/auth';

// Protege /admin: sin una sesión con firma válida, redirige a /admin/login.
// Las páginas del panel leen la base de datos directamente (sin pasar por la
// API), así que ESTA verificación es la que las protege: no basta con que
// exista la cookie, se comprueba su firma y vigencia. Las rutas de la API
// vuelven a validar el token en cada Route Handler (lib/server/require-auth.ts).
//
// Nota: en esta versión de Next.js el archivo se llama proxy.ts (antes
// middleware.ts) y corre en el runtime de Node.js, por eso puede usar jsonwebtoken.

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Páginas de /admin que se usan SIN sesión: iniciar sesión y recuperar la contraseña.
  const RUTAS_PUBLICAS_ADMIN = ['/admin/login', '/admin/recuperar', '/admin/restablecer'];
  const isAdminRoute = pathname.startsWith('/admin') && !RUTAS_PUBLICAS_ADMIN.includes(pathname);

  if (isAdminRoute) {
    const irAlLogin = () => {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      const respuesta = NextResponse.redirect(loginUrl);
      // Una cookie inválida o vencida se descarta para no dejarla colgada.
      if (request.cookies.has('accessToken')) respuesta.cookies.delete('accessToken');
      return respuesta;
    };

    const accessToken = request.cookies.get('accessToken')?.value;
    if (!accessToken) return irAlLogin();

    let sin2fa = false;
    try {
      sin2fa = Boolean(verifyAccessToken(accessToken).sin2fa);
    } catch {
      return irAlLogin();
    }

    // Rol que exige 2FA y aún no la tiene: solo puede ver la página de seguridad.
    if (sin2fa && pathname !== '/admin/seguridad') {
      return NextResponse.redirect(new URL('/admin/seguridad', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
