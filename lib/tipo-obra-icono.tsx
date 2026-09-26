import { Building, Droplet, Home, Hospital, Road, School, Trophy, Zap, type LucideIcon } from 'lucide-react';

// Mapea el campo `TipoObra.icono` (ver TIPOS_OBRA en prisma/seed.ts) al ícono
// de lucide-react correspondiente. `Building` es el fallback para tipos
// nuevos que aún no tengan un ícono específico asignado.
const ICONOS_POR_NOMBRE: Record<string, LucideIcon> = {
  hospital: Hospital,
  school: School,
  road: Road,
  home: Home,
  droplet: Droplet,
  zap: Zap,
  trophy: Trophy,
  building: Building,
};

export function obtenerIconoTipoObra(icono: string): LucideIcon {
  return ICONOS_POR_NOMBRE[icono] ?? Building;
}
