import { afterEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
import { generarCodigoTotp, verificarCodigoTotp } from '@/lib/server/totp';
import { cifrarSecreto, descifrarSecreto } from '@/lib/server/secret-box';
import { urlHttp } from '@/lib/server/validators/url';
import { actualizarPersonaSchema, crearPersonaSchema } from '@/lib/server/validators/persona.schema';
import { actualizarAsignacionSchema } from '@/lib/server/validators/asignacion.schema';
import { crearDenunciaSchema } from '@/lib/server/validators/denuncia.schema';
import { obtenerIpCliente } from '@/lib/server/get-client-ip';
import { estaLimitado, liberarLimite } from '@/lib/server/rate-limit';
import { dosFactoresObligatorio, payloadDeSesion } from '@/lib/server/auth';

afterEach(() => vi.unstubAllEnvs());

describe('TOTP (RFC 6238)', () => {
  // Secreto y vectores de la RFC, SHA-1: "12345678901234567890" en base32.
  const secreto = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

  it('genera el código del vector de prueba de la RFC (t = 59 s)', () => {
    expect(generarCodigoTotp(secreto, 59_000)).toBe('287082');
  });

  it('acepta el paso actual y los vecinos, y rechaza los demás', () => {
    const ahora = 1_111_111_109_000; // vector de la RFC: 081804
    expect(generarCodigoTotp(secreto, ahora)).toBe('081804');
    expect(verificarCodigoTotp(secreto, '081804', ahora)).toBe(true);
    expect(verificarCodigoTotp(secreto, '081804', ahora + 30_000)).toBe(true);
    expect(verificarCodigoTotp(secreto, '081804', ahora + 90_000)).toBe(false);
  });

  it('rechaza formatos inválidos', () => {
    expect(verificarCodigoTotp(secreto, '12345', 59_000)).toBe(false);
    expect(verificarCodigoTotp(secreto, 'abcdef', 59_000)).toBe(false);
  });
});

describe('secret-box', () => {
  it('cifra y descifra, con salida distinta cada vez', () => {
    const a = cifrarSecreto('secreto');
    expect(a).not.toContain('secreto');
    expect(descifrarSecreto(a)).toBe('secreto');
    expect(cifrarSecreto('secreto')).not.toBe(a);
  });

  it('detecta datos alterados', () => {
    const partes = cifrarSecreto('secreto').split(':');
    partes[3] = Buffer.from('otra-cosa').toString('base64');
    expect(() => descifrarSecreto(partes.join(':'))).toThrow();
  });
});

describe('urlHttp', () => {
  const schema = urlHttp();
  it('acepta http y https', () => {
    expect(schema.safeParse('https://ejemplo.com/a.pdf').success).toBe(true);
    expect(schema.safeParse('http://ejemplo.com').success).toBe(true);
  });
  it('rechaza esquemas peligrosos', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'ftp://x.com', 'no es url']) {
      expect(schema.safeParse(url).success).toBe(false);
    }
  });
  it('se aplica a la evidencia de las denuncias', () => {
    const base = { categoria: 'SOBRECOSTO', descripcion: 'x'.repeat(40) };
    expect(crearDenunciaSchema.safeParse({ ...base, evidenciaUrl: 'javascript:alert(1)' }).success).toBe(false);
  });
});

describe('actualizaciones parciales (Zod 4 conserva los defaults de .partial())', () => {
  it('no revoca el consentimiento si el campo no viene', () => {
    expect(actualizarPersonaSchema.parse({ nombres: 'Ana' })).toEqual({ nombres: 'Ana' });
    expect(actualizarPersonaSchema.parse({ consentimientoPublicacion: true }).consentimientoPublicacion).toBe(true);
  });

  it('no vuelve a publicar una asignación oculta si el campo no viene', () => {
    expect(actualizarAsignacionSchema.parse({ area: 'Obra civil' })).toEqual({ area: 'Obra civil' });
  });

  it('la creación sí aplica los valores por defecto', () => {
    const p = crearPersonaSchema.parse({ nombres: 'Ana', apellidos: 'Pérez' });
    expect(p.consentimientoPublicacion).toBe(false);
  });
});

const peticion = (cabeceras: Record<string, string>) =>
  ({ headers: { get: (n: string) => cabeceras[n.toLowerCase()] ?? null } }) as unknown as NextRequest;

describe('obtenerIpCliente', () => {
  const xff = { 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' };

  it('en producción sin TRUST_PROXY ignora el encabezado (no se puede falsificar)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TRUST_PROXY', '');
    expect(obtenerIpCliente(peticion(xff))).toBe('desconocida');
  });

  it('con TRUST_PROXY toma la entrada que añadió el proxy, no la del cliente', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('TRUST_PROXY', 'true');
    expect(obtenerIpCliente(peticion(xff))).toBe('3.3.3.3');
    vi.stubEnv('TRUSTED_PROXY_HOPS', '2');
    expect(obtenerIpCliente(peticion(xff))).toBe('2.2.2.2');
  });

  it('en desarrollo usa la primera entrada', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('TRUST_PROXY', '');
    expect(obtenerIpCliente(peticion(xff))).toBe('1.1.1.1');
  });
});

describe('estaLimitado', () => {
  it('bloquea al superar el límite y se puede liberar', () => {
    const clave = `prueba:${Math.random()}`;
    expect([1, 2, 3].map(() => estaLimitado(clave, 2, 60_000))).toEqual([false, false, true]);
    liberarLimite(clave);
    expect(estaLimitado(clave, 2, 60_000)).toBe(false);
  });

  it('la ventana vence con el tiempo', () => {
    vi.useFakeTimers();
    const clave = `ventana:${Math.random()}`;
    estaLimitado(clave, 1, 1000);
    expect(estaLimitado(clave, 1, 1000)).toBe(true);
    vi.advanceTimersByTime(1500);
    expect(estaLimitado(clave, 1, 1000)).toBe(false);
    vi.useRealTimers();
  });
});

describe('2FA obligatoria', () => {
  const usuario = { id: 'u', email: 'a@b.c', enteId: null, twoFactorSecret: null };

  it('se exige en producción y se puede forzar o apagar', () => {
    vi.stubEnv('TWO_FACTOR_REQUIRED', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(dosFactoresObligatorio()).toBe(true);
    vi.stubEnv('TWO_FACTOR_REQUIRED', 'false');
    expect(dosFactoresObligatorio()).toBe(false);
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('TWO_FACTOR_REQUIRED', 'true');
    expect(dosFactoresObligatorio()).toBe(true);
  });

  it('marca sin2fa solo a roles administrativos sin 2FA', () => {
    vi.stubEnv('TWO_FACTOR_REQUIRED', 'true');
    expect(payloadDeSesion({ ...usuario, rol: 'APROBADOR' }).sin2fa).toBe(true);
    expect(payloadDeSesion({ ...usuario, rol: 'APROBADOR', twoFactorSecret: 'x' }).sin2fa).toBeUndefined();
    expect(payloadDeSesion({ ...usuario, rol: 'EDITOR_OBRA' }).sin2fa).toBeUndefined();
    expect(payloadDeSesion({ ...usuario, rol: 'CONSULTA' }).sin2fa).toBeUndefined();
  });
});
