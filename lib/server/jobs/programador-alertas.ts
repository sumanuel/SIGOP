import { evaluarAlertas } from '@/lib/server/services/alertas.service';

// Evaluación diaria de alertas sin dependencias nuevas: un temporizador dentro
// del propio proceso de Next.js (el proyecto corre en un solo proceso; ver
// PLAN_PROYECTO.md sección 5). Se arranca desde instrumentation.ts. Con varias
// instancias habría que sacarlo a un cron externo que llame al botón/endpoint
// "Evaluar ahora", porque cada instancia correría su propio temporizador.

const UNA_HORA_MS = 60 * 60 * 1000;
const INTERVALO_MS = 24 * UNA_HORA_MS;
const RETRASO_INICIAL_MS = 2 * 60 * 1000; // deja que el servidor termine de arrancar

const estado = globalThis as { __alertasProgramadas?: boolean };

export function iniciarProgramadorAlertas() {
  // En desarrollo el módulo se recarga con cada cambio: sin esta marca se
  // acumularían temporizadores.
  if (estado.__alertasProgramadas) return;
  if (process.env.ALERTAS_AUTOMATICAS === 'false') return;
  estado.__alertasProgramadas = true;

  const ejecutar = async () => {
    try {
      const r = await evaluarAlertas();
      console.log(
        `[alertas] evaluadas ${r.evaluadas} obras: ${r.creadas} nuevas, ${r.actualizadas} actualizadas, ${r.autoResueltas} resueltas solas`
      );
    } catch (error) {
      console.error('[alertas] falló la evaluación automática:', error);
    }
  };

  setTimeout(ejecutar, RETRASO_INICIAL_MS).unref?.();
  setInterval(ejecutar, INTERVALO_MS).unref?.();
}
