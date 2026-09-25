import { NotFoundContent } from '@/components/layout/not-found-content';

// Se usa para cualquier notFound() lanzado dentro de app/(public)/**
// (ej. app/(public)/obras/[slug]/page.tsx con un slug inexistente).
// El header y el footer ya los pone app/(public)/layout.tsx.
export default function PublicNotFound() {
  return <NotFoundContent />;
}
