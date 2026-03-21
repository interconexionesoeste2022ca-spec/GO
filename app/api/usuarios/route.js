import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

function getSesion(req) {
  try {
    const header = req.headers.get('authorization') || ''
    const token = header.replace('Bearer ', '').trim()
    if (!token) return null
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch { return null }
}

function assertRol(sesion, roles) {
  if (!sesion) throw new Error('SESION_INVALIDA')
  if (!roles.map(r => r.toLowerCase()).includes((sesion.rol || '').toLowerCase()))
    throw new Error('ACCESO_DENEGADO')
}

async function auditoria(sesion, accion, entidad, id, antes, despues, req) {
  try {
    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion, entidad,
      entidad_id: String(id),
      estado_antes: antes ? JSON.stringify(antes) : null,
      estado_despues: despues ? JSON.stringify(despues) : null,
      ip_hint: req.headers.get('x-forwarded-for') || 'local'
    }])
  } catch {}
}

const ROLES_VALIDOS = ['admin', 'staff', 'verificador', 'espectador']

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin'])

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .select('usuario, rol, activo, creado_en, ultimo_login')
      .order('creado_en', { ascending: false })

    if (error) throw error
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin'])

    const body = await req.json()
    const { usuario, password, rol, activo } = body

    if (!usuario || !password || !rol) {
      return NextResponse.json({ ok: false, msg: 'Usuario, contraseña y rol son requeridos.' }, { status: 400 })
    }
    if (!ROLES_VALIDOS.includes(rol.toLowerCase())) {
      return NextResponse.json({ ok: false, msg: `Rol inválido. Use: ${ROLES_VALIDOS.join(', ')}` }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ ok: false, msg: 'La contraseña debe tener mínimo 6 caracteres.' }, { status: 400 })
    }

    const usuarioNorm = usuario.trim().toLowerCase()
    const { data: existe } = await supabaseAdmin.from('usuarios').select('usuario').eq('usuario', usuarioNorm).single()
    if (existe) return NextResponse.json({ ok: false, msg: 'El usuario ya existe.' }, { status: 409 })

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .insert([{
        usuario: usuarioNorm,
        password_hash: sha256(password.trim()),
        rol: rol.toLowerCase(),
        activo: activo ?? true,
        creado_en: new Date().toISOString()
      }])
      .select('usuario, rol, activo, creado_en')
      .single()

    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion: 'CREAR_USUARIO',
      entidad: 'usuarios', entidad_id: data.usuario,
      estado_antes: null, estado_despues: JSON.stringify({ usuario: data.usuario, rol: data.rol }),
      ip_hint: req.headers.get('x-forwarded-for') || 'local'
    }])

    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin'])

    const body = await req.json()
    const { usuario, password, rol, activo } = body

    if (!usuario) return NextResponse.json({ ok: false, msg: 'Usuario requerido.' }, { status: 400 })
    if (rol && !ROLES_VALIDOS.includes(rol.toLowerCase())) {
      return NextResponse.json({ ok: false, msg: `Rol inválido.` }, { status: 400 })
    }

    const usuarioNorm = usuario.trim().toLowerCase()
    const { data: antes } = await supabaseAdmin.from('usuarios').select('usuario, rol, activo').eq('usuario', usuarioNorm).single()

    const update = {}
    if (rol !== undefined) update.rol = rol.toLowerCase()
    if (activo !== undefined) update.activo = activo
    if (password) {
      if (password.length < 6) return NextResponse.json({ ok: false, msg: 'Contraseña muy corta.' }, { status: 400 })
      update.password_hash = sha256(password.trim())
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ ok: false, msg: 'Nada que actualizar.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('usuarios')
      .update(update)
      .eq('usuario', usuarioNorm)
      .select('usuario, rol, activo')
      .single()

    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion: 'EDITAR_USUARIO',
      entidad: 'usuarios', entidad_id: usuarioNorm,
      estado_antes: JSON.stringify(antes), estado_despues: JSON.stringify(data),
      ip_hint: req.headers.get('x-forwarded-for') || 'local'
    }])

    return NextResponse.json({ ok: true, data })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}

export async function DELETE(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin'])

    const { searchParams } = new URL(req.url)
    const usuario = searchParams.get('usuario')
    if (!usuario) return NextResponse.json({ ok: false, msg: 'Usuario requerido.' }, { status: 400 })
    if (usuario.toLowerCase() === sesion.usuario.toLowerCase()) {
      return NextResponse.json({ ok: false, msg: 'No puedes eliminarte a ti mismo.' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('usuarios').delete().eq('usuario', usuario.toLowerCase())
    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion: 'ELIMINAR_USUARIO',
      entidad: 'usuarios', entidad_id: usuario,
      estado_antes: JSON.stringify({ usuario }), estado_despues: null,
      ip_hint: req.headers.get('x-forwarded-for') || 'local'
    }])

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}
