import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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
      return NextResponse.json({ ok: false, msg: 'Contraseña incorrecta.' }, { status: 401 })

    await supabaseAdmin
      .from('usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('usuario', data.usuario)

    const token = jwt.sign(
      { usuario: data.usuario, rol: data.rol },
      process.env.JWT_SECRET,
      { expiresIn: '5h' }
    )

    return NextResponse.json({ ok: true, token, usuario: data.usuario, rol: data.rol })

  } catch (e) {
    console.error('login error:', e)
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}