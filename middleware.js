// middleware.js — Protección de rutas /dashboard
// v8.1 — Mejorado: verificación JWT criptográfica con jose (compatible con Edge Runtime)
import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

export async function middleware(req) {
  const { pathname } = req.nextUrl

  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  const tokenCookie = req.cookies.get('galanet_token')?.value

  if (!tokenCookie) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verificación criptográfica completa del JWT
    await jwtVerify(tokenCookie, JWT_SECRET)
    return NextResponse.next()
  } catch {
    // Token inválido o expirado — limpiar cookie y redirigir
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('galanet_token')
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}