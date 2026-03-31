// app/api/auth/me/route.js
// Devuelve la sesión del usuario a partir de la cookie httpOnly
// El frontend usa este endpoint en vez de leer tokens de localStorage
import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function GET(req) {
  try {
    // Leer token desde la cookie httpOnly
    const token = req.cookies.get('galanet_token')?.value
    if (!token) {
      return NextResponse.json({ ok: false, msg: 'Sin sesión.' }, { status: 401 })
    }

    const sesion = jwt.verify(token, process.env.JWT_SECRET)
    return NextResponse.json({
      ok: true,
      usuario: sesion.usuario,
      rol: sesion.rol,
    })
  } catch {
    // Token expirado o inválido
    const response = NextResponse.json({ ok: false, msg: 'Sesión expirada.' }, { status: 401 })
    response.cookies.delete('galanet_token')
    return response
  }
}
