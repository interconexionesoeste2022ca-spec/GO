// app/api/auth/login/route.js
// v8.1 — Mejorado: bcryptjs con migración gradual desde SHA-256
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/apiHelpers'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const JWT_TTL   = '8h'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8 horas en segundos

// SHA-256 legacy — solo para migración
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

// Detectar si un hash es SHA-256 legacy (64 chars hex) o bcrypt ($2a$/$2b$)
function esHashLegacy(hash) {
  return hash && hash.length === 64 && /^[a-f0-9]+$/.test(hash)
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

    // ── Verificación de contraseña con migración gradual ──
    let passwordValida = false

    if (esHashLegacy(data.password_hash)) {
      // Hash legacy SHA-256: verificar y migrar a bcrypt
      if (sha256(password.trim()) === data.password_hash) {
        passwordValida = true
        // Migrar automáticamente a bcrypt
        const nuevoHash = await bcrypt.hash(password.trim(), 12)
        await supabaseAdmin.from('usuarios')
          .update({ password_hash: nuevoHash })
          .eq('usuario', data.usuario)
        console.log(`[Auth] Migrado a bcrypt: ${data.usuario}`)
      }
    } else {
      // Hash bcrypt moderno
      passwordValida = await bcrypt.compare(password.trim(), data.password_hash)
    }

    if (!passwordValida)
      return NextResponse.json({ ok: false, msg: 'Usuario o contraseña incorrectos.' }, { status: 401 })

    // ── Login exitoso ──
    await supabaseAdmin.from('usuarios')
      .update({ ultimo_login: new Date().toISOString() })
      .eq('usuario', data.usuario)

    const token = jwt.sign(
      { usuario: data.usuario, rol: data.rol },
      process.env.JWT_SECRET,
      { expiresIn: JWT_TTL }
    )

    const response = NextResponse.json({
      ok: true,
      usuario: data.usuario,
      rol: data.rol,
    })

    response.cookies.set('galanet_token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   COOKIE_MAX_AGE,
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
