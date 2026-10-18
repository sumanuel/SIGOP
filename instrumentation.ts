// Se ejecuta una vez al arrancar el servidor de Next.js (ver node_modules/next/dist/docs, instrumentation).
export async function register() {
  // Solo en el runtime de Node (Prisma no corre en edge).
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { iniciarProgramadorAlertas } = await import('./lib/server/jobs/programador-alertas');
    iniciarProgramadorAlertas();
  }
}
