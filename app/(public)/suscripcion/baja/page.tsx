import type { Metadata } from 'next';
import { AccionSuscripcion } from '@/components/suscripcion/accion-suscripcion';

export const metadata: Metadata = { title: 'Darse de baja — SIGOP', robots: { index: false } };

export default function BajaSuscripcionPage() {
  return <AccionSuscripcion accion="baja" />;
}
