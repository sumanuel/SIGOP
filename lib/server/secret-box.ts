import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

// Cifrado en reposo (AES-256-GCM) de secretos guardados en la base, como el
// secreto TOTP: si alguien obtiene un volcado de la base, no puede generar
// códigos 2FA sin también tener las variables de entorno del servidor.
//
// La clave sale de TWO_FACTOR_ENCRYPTION_KEY y, si no está definida, de
// JWT_REFRESH_SECRET. Rotar esa clave invalida los secretos ya guardados:
// habría que desactivar el 2FA de esos usuarios para que lo configuren de nuevo.

function obtenerClave(): Buffer {
  const origen = process.env.TWO_FACTOR_ENCRYPTION_KEY || process.env.JWT_REFRESH_SECRET;
  if (!origen) {
    throw new Error('Falta TWO_FACTOR_ENCRYPTION_KEY (o JWT_REFRESH_SECRET) para cifrar el secreto 2FA');
  }
  return createHash('sha256').update(`sigop-secret-box:${origen}`).digest();
}

export function cifrarSecreto(texto: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv('aes-256-gcm', obtenerClave(), iv);
  const cifrado = Buffer.concat([cifrador.update(texto, 'utf8'), cifrador.final()]);
  return ['v1', iv.toString('base64'), cifrador.getAuthTag().toString('base64'), cifrado.toString('base64')].join(':');
}

export function descifrarSecreto(valor: string): string {
  const [version, iv, etiqueta, cifrado] = valor.split(':');
  if (version !== 'v1' || !iv || !etiqueta || !cifrado) {
    throw new Error('Formato de secreto cifrado desconocido');
  }
  const descifrador = createDecipheriv('aes-256-gcm', obtenerClave(), Buffer.from(iv, 'base64'));
  descifrador.setAuthTag(Buffer.from(etiqueta, 'base64'));
  return Buffer.concat([descifrador.update(Buffer.from(cifrado, 'base64')), descifrador.final()]).toString('utf8');
}
