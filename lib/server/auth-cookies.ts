import type { NextResponse } from 'next/server';

// Debe calzar con JWT_ACCESS_EXPIRES_IN / JWT_REFRESH_EXPIRES_IN (.env.example).
const ACCESS_MAXAGE_SEG = 15 * 60; // 15 minutos
const REFRESH_MAXAGE_SEG = 7 * 24 * 60 * 60; // 7 días

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
};

export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string }
) {
  response.cookies.set('accessToken', tokens.accessToken, {
    ...base,
    path: '/',
    maxAge: ACCESS_MAXAGE_SEG,
  });

  // El refresh token solo viaja hacia /api/auth/*, para no exponerlo en cada
  // request como el access token.
  response.cookies.set('refreshToken', tokens.refreshToken, {
    ...base,
    path: '/api/auth',
    maxAge: REFRESH_MAXAGE_SEG,
  });
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set('accessToken', '', { ...base, path: '/', maxAge: 0 });
  response.cookies.set('refreshToken', '', { ...base, path: '/api/auth', maxAge: 0 });
}
