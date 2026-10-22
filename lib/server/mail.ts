import nodemailer, { type Transporter } from 'nodemailer';

// Envío de correo por SMTP estándar (variables SMTP_* en .env.example), sin atarse
// a ningún proveedor. Sin SMTP_HOST: en desarrollo el correo se imprime en la
// consola del servidor (para poder probar el flujo sin servidor de correo) y en
// producción no se envía nada.

export interface CorreoSaliente {
  para: string;
  asunto: string;
  texto: string;
}

export interface ResultadoEnvio {
  enviado: boolean;
  modo: 'smtp' | 'consola' | 'deshabilitado';
}

let transporte: Transporter | null = null;

function obtenerTransporte(): Transporter | null {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  transporte ??= nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined,
    // Un servidor de correo caído no debe dejar colgada la petición del usuario.
    connectionTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporte;
}

export async function enviarCorreo(correo: CorreoSaliente): Promise<ResultadoEnvio> {
  const smtp = obtenerTransporte();

  if (!smtp) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[correo] SMTP_HOST no está configurado: no se envió el correo');
      return { enviado: false, modo: 'deshabilitado' };
    }
    console.log(`\n[correo · modo desarrollo] Para: ${correo.para}\nAsunto: ${correo.asunto}\n\n${correo.texto}\n`);
    return { enviado: true, modo: 'consola' };
  }

  await smtp.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: correo.para,
    subject: correo.asunto,
    text: correo.texto,
  });
  return { enviado: true, modo: 'smtp' };
}
