// middleware.js — Protección de rutas /dashboard
// Versión sin dependencias externas (compatible con Next.js 14 sin instalar jose)
import { NextResponse } from 'next/server'

export function middleware(req) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  // Verificar cookie httpOnly que pone el login
  const tokenCookie = req.cookies.get('galanet_token')?.value

  // También aceptar el token que ya tenían en localStorage
  // (el layout.jsx lo redirige si no hay sesión — doble protección)
  if (!tokenCookie) {
    // Si no hay cookie, redirigir al login
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // El token existe — la verificación criptográfica la hace cada API route
  // con getSesion() que sí tiene acceso a jsonwebtoken (Node.js runtime)
  // El middleware solo actúa como primera barrera
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}