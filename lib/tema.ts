export type PreferenciaTema = 'sistema' | 'claro' | 'oscuro';

export const CLAVE_TEMA = 'sigop-tema';
const EVENTO_TEMA = 'sigop-tema-cambio';

export const ORDEN_TEMAS: PreferenciaTema[] = ['sistema', 'claro', 'oscuro'];

// Se ejecuta en <head> antes de pintar para evitar el parpadeo claro→oscuro.
// Debe mantenerse equivalente a aplicarTema().
export const SCRIPT_TEMA_INICIAL = `(function(){try{var p=localStorage.getItem('${CLAVE_TEMA}');var o=p==='oscuro'||(p!=='claro'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',o);}catch(e){}})();`;

export function leerPreferencia(): PreferenciaTema {
  try {
    const guardada = localStorage.getItem(CLAVE_TEMA);
    return guardada === 'claro' || guardada === 'oscuro' ? guardada : 'sistema';
  } catch {
    return 'sistema';
  }
}

export function aplicarTema(preferencia: PreferenciaTema) {
  const oscuro =
    preferencia === 'oscuro' || (preferencia === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', oscuro);
}

export function guardarPreferencia(preferencia: PreferenciaTema) {
  try {
    if (preferencia === 'sistema') localStorage.removeItem(CLAVE_TEMA);
    else localStorage.setItem(CLAVE_TEMA, preferencia);
  } catch {
    // Almacenamiento bloqueado: el tema aplica solo en esta visita.
  }
  aplicarTema(preferencia);
  window.dispatchEvent(new Event(EVENTO_TEMA));
}

export function suscribirseATema(avisar: () => void) {
  window.addEventListener(EVENTO_TEMA, avisar);
  window.addEventListener('storage', avisar);
  return () => {
    window.removeEventListener(EVENTO_TEMA, avisar);
    window.removeEventListener('storage', avisar);
  };
}
