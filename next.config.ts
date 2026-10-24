import type { NextConfig } from "next";

const esProduccion = process.env.NODE_ENV === "production";

// Política de contenido. Next inyecta scripts y estilos en línea, así que se
// permite 'unsafe-inline' (una CSP con nonce obligaría a renderizar todo el
// sitio en modo dinámico); en desarrollo además 'unsafe-eval' para React Refresh.
// - img-src https: porque las fotos de reportes ciudadanos son URLs externas.
// - connect-src incluye las teselas (OpenStreetMap, Esri y OpenTopoMap) que descarga MapLibre.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${esProduccion ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://tile.openstreetmap.org https://*.tile.openstreetmap.org https://server.arcgisonline.com https://*.tile.opentopomap.org${esProduccion ? "" : " ws: wss:"}`,
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
    return [
      { source: "/:path*", headers: cabeceras },
      // El service worker nunca debe quedar en el caché del navegador: así una versión nueva
      // se detecta al instante. `Service-Worker-Allowed` fija su alcance a todo el sitio.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
