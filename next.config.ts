import type { NextConfig } from "next";

const esProduccion = process.env.NODE_ENV === "production";

// Política de contenido. Next inyecta scripts y estilos en línea, así que se
// permite 'unsafe-inline' (una CSP con nonce obligaría a renderizar todo el
// sitio en modo dinámico); en desarrollo además 'unsafe-eval' para React Refresh.
// - img-src https: porque las fotos de reportes ciudadanos son URLs externas.
// - connect-src incluye las teselas de OpenStreetMap que descarga MapLibre.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esProduccion ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://tile.openstreetmap.org https://*.tile.openstreetmap.org${esProduccion ? "" : " ws: wss:"}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const cabeceras = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  ...(esProduccion
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: cabeceras }];
  },
};

export default nextConfig;
