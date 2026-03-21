import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, registrarAuditoria, respError } from '@/lib/apiHelpers'
import crypto from 'crypto'

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
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
  } catch (e) { return respError(e) }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin'])

    const { usuario, password, rol, activo } = await req.json()
    if (!usuario || !password || !rol)
      return NextResponse.json({ ok: false, msg: 'Usuario, contraseña y rol son requeridos.' }, { status: 400 })
    if (!ROLES_VALIDOS.includes(rol.toLowerCase()))
      return NextResponse.json({ ok: false, msg: `Rol inválido. Use: ${ROLES_VALIDOS.join(', ')}` }, { status: 400 })
    if (password.length < 6)
      return NextResponse.json({ ok: false, msg: 'La contraseña debe tener mínimo 6 caracteres.' }, { status: 400 })

    const usuarioNorm = usuario.trim().toLowerCase()
    const { data: existe } = await supabaseAdmin.from('usuarios').select('usuario').eq('usuario', usuarioNorm).single()
    if (existe) return NextResponse.json({ ok: false, msg: 'El usuario ya existe.' }, { status: 409 })

    const { data, error } = await supabaseAdmin.from('usuarios').insert([{
      usuario: usuarioNorm,
      password_hash: sha256(password.trim()),
      rol: rol.toLowerCase(),
      activo: activo ?? true,
      creado_en: new Date().toISOString(),
    }]).select('usuario, rol, activo, creado_en').single()

    if (error) throw error
    await registrarAuditoria(sesion, 'CREAR_USUARIO', 'usuarios', data.usuario, null, { usuario: data.usuario, rol: data.rol }, req)
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (e) { return respError(e) }
}

export async function PATCH(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin'])

    const { usuario, password, rol, activo } = await req.json()
    if (!usuario) return NextResponse.json({ ok: false, msg: 'Usuario requerido.' }, { status: 400 })
    if (rol && !ROLES_VALIDOS.includes(rol.toLowerCase()))
      return NextResponse.json({ ok: false, msg: 'Rol inválido.' }, { status: 400 })

    const usuarioNorm = usuario.trim().toLowerCase()
    const { data: antes } = await supabaseAdmin.from('usuarios').select('usuario, rol, activo').eq('usuario', usuarioNorm).single()

    const update = {}
    if (rol !== undefined) update.rol = rol.toLowerCase()
    if (activo !== undefined) update.activo = activo
    if (password) {
      if (password.length < 6) return NextResponse.json({ ok: false, msg: 'Contraseña muy corta.' }, { status: 400 })
      update.password_hash = sha256(password.trim())
    }
    if (!Object.keys(update).length)
      return NextResponse.json({ ok: false, msg: 'Nada que actualizar.' }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('usuarios').update(update).eq('usuario', usuarioNorm).select('usuario, rol, activo').single()
    if (error) throw error

    await registrarAuditoria(sesion, 'EDITAR_USUARIO', 'usuarios', usuarioNorm, antes, data, req)
    return NextResponse.json({ ok: true, data })
  } catch (e) { return respError(e) }
}

export async function DELETE(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin'])

    const { searchParams } = new URL(req.url)
    const usuario = searchParams.get('usuario')
    if (!usuario) return NextResponse.json({ ok: false, msg: 'Usuario requerido.' }, { status: 400 })
    if (usuario.toLowerCase() === sesion.usuario.toLowerCase())
      return NextResponse.json({ ok: false, msg: 'No puedes eliminarte a ti mismo.' }, { status: 400 })

    const { error } = await supabaseAdmin.from('usuarios').delete().eq('usuario', usuario.toLowerCase())
    if (error) throw error

    await registrarAuditoria(sesion, 'ELIMINAR_USUARIO', 'usuarios', usuario, { usuario }, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) { return respError(e) }
}
