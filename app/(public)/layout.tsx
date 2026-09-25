import { SiteHeader } from '@/components/layout/site-header';
import { SiteFooter } from '@/components/layout/site-footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <SiteHeader />
      <div className="relative flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
