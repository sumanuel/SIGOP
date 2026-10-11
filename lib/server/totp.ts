import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// TOTP (RFC 6238) con HMAC-SHA1, 6 dígitos y paso de 30 s: es la
// configuración que entienden Google Authenticator, Microsoft Authenticator,
// Authy, 1Password, etc. Implementado con `node:crypto` para no añadir
// dependencias (PLAN_PROYECTO.md sección 5).

const ALFABETO_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const PASO_SEGUNDOS = 30;
const DIGITOS = 6;

function codificarBase32(buffer: Buffer): string {
  let bits = 0;
  let valor = 0;
  let salida = '';
  for (const byte of buffer) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO_BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += ALFABETO_BASE32[(valor << (5 - bits)) & 31];
  return salida;
}

function decodificarBase32(texto: string): Buffer {
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const caracter of texto.replace(/=+$/, '').toUpperCase()) {
    const indice = ALFABETO_BASE32.indexOf(caracter);
    if (indice === -1) throw new Error('Secreto TOTP inválido');
    valor = (valor << 5) | indice;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Secreto aleatorio de 160 bits en base32 (el tamaño recomendado por la RFC 4226). */
export function generarSecretoTotp(): string {
  return codificarBase32(randomBytes(20));
}

function codigoParaPaso(secreto: string, paso: number): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(paso));
  const hmac = createHmac('sha1', decodificarBase32(secreto)).update(contador).digest();
  const desplazamiento = hmac[hmac.length - 1] & 15;
  const binario =
    ((hmac[desplazamiento] & 127) << 24) |
    (hmac[desplazamiento + 1] << 16) |
    (hmac[desplazamiento + 2] << 8) |
    hmac[desplazamiento + 3];
  return String(binario % 10 ** DIGITOS).padStart(DIGITOS, '0');
}

export function generarCodigoTotp(secreto: string, ahoraMs = Date.now()): string {
  return codigoParaPaso(secreto, Math.floor(ahoraMs / 1000 / PASO_SEGUNDOS));
}

/**
 * Acepta el código del paso actual y el anterior/siguiente (±30 s) para
 * tolerar relojes levemente desfasados entre el celular y el servidor.
 */
export function verificarCodigoTotp(secreto: string, codigo: string, ahoraMs = Date.now()): boolean {
  const limpio = codigo.replace(/\s/g, '');
  if (!/^\d{6}$/.test(limpio)) return false;

  const pasoActual = Math.floor(ahoraMs / 1000 / PASO_SEGUNDOS);
  const recibido = Buffer.from(limpio);
  let valido = false;
  // Se recorren siempre las 3 ventanas, sin cortar al primer acierto, para
  // no filtrar por tiempo cuál ventana coincidió.
  for (const delta of [-1, 0, 1]) {
    const esperado = Buffer.from(codigoParaPaso(secreto, pasoActual + delta));
    if (timingSafeEqual(recibido, esperado)) valido = true;
  }
  return valido;
}

/** URI estándar `otpauth://` que las apps de autenticación leen desde el QR. */
export function construirUriOtpauth(secreto: string, email: string, emisor = 'SIGOP'): string {
  const etiqueta = encodeURIComponent(`${emisor}:${email}`);
  const parametros = new URLSearchParams({
    secret: secreto,
    issuer: emisor,
    algorithm: 'SHA1',
    digits: String(DIGITOS),
    period: String(PASO_SEGUNDOS),
  });
  return `otpauth://totp/${etiqueta}?${parametros.toString()}`;
}
