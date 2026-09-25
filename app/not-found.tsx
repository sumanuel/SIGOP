import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';
import { NotFoundContent } from '@/components/layout/not-found-content';

// Fallback global para rutas que no coinciden con nada (ej. /lo-que-sea).
// app/(public)/not-found.tsx cubre el caso más común (obras inexistentes)
// ya con el layout público puesto; este envuelve manualmente porque el
// root layout no incluye header/footer por sí solo.
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <div className="relative flex flex-1 flex-col">
        <NotFoundContent />
      </div>
      <SiteFooter />
    </div>
  );
}
