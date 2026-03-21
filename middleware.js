import { NextResponse } from 'next/server'

export function middleware(req) {
  const { pathname } = req.nextUrl

  // Solo proteger rutas del dashboard
  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  // El token viaja en el header Authorization desde el cliente
  // La verificación real ocurre en cada API route con getSesion()
  // Aquí solo podemos verificar que la cookie de sesión no exista (opcional)
  // La protección principal es en layout.jsx con getToken() + redirect

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
