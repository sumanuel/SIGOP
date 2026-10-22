import type { Metadata } from 'next';
import { AccionSuscripcion } from '@/components/suscripcion/accion-suscripcion';

export const metadata: Metadata = { title: 'Confirmar suscripción — SIGOP', robots: { index: false } };

export default function ConfirmarSuscripcionPage() {
  return <AccionSuscripcion accion="confirmar" />;
}
