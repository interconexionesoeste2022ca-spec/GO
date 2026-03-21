import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/apiHelpers'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

export async function POST(req) {
  try {
    const { usuario, password } = await req.json()
    if (!usuario || !password)
      return NextResponse.json({ ok: false, msg: 'Usuario y contraseña requeridos.' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('usuario, password_hash, rol, activo')
      .eq('usuario', usuario.trim().toLowerCase())
      .single()

    if (error || !data)
      return NextResponse.json({ ok: false, msg: 'Usuario o contraseña incorrectos.' }, { status: 401 })

    if (!data.activo)
      return NextResponse.json({ ok: false, msg: 'Cuenta desactivada.' }, { status: 403 })

    if (sha256(password.trim()) !== data.password_hash)
      return NextResponse.json({ ok: false, msg: 'Usuario o contraseña incorrectos.' }, { status: 401 })

    await supabaseAdmin.from('usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('usuario', data.usuario)

    const token = jwt.sign(
      { usuario: data.usuario, rol: data.rol },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    const response = NextResponse.json({ ok: true, token, usuario: data.usuario, rol: data.rol })
    response.cookies.set('galanet_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 8,
      path:     '/',
    })
    return response
  } catch (e) {
    console.error('[login]', e)
    return NextResponse.json({ ok: false, msg: 'Error interno.' }, { status: 500 })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.delete('galanet_token')
  return response
}
