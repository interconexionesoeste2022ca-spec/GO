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

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('cuentas')
      .select('*')
      .order('banco', { ascending: true })

    if (error) throw error
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    const { banco, numero_cuenta, titular, tipo_cuenta, telefono_pago_movil, cedula_rif, activa } = body

    if (!banco || !titular) {
      return NextResponse.json({ ok: false, msg: 'Banco y titular son requeridos.' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('cuentas')
      .insert([{ banco, numero_cuenta, titular, tipo_cuenta, telefono_pago_movil, cedula_rif, activa: activa ?? true }])
      .select()
      .single()

    if (error) throw error

    // Auditoría
    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion: 'CREAR',
      entidad: 'cuentas', entidad_id: data.id,
      estado_antes: null, estado_despues: JSON.stringify(data),
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
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    const { id, ...campos } = body
    if (!id) return NextResponse.json({ ok: false, msg: 'ID requerido.' }, { status: 400 })

    const { data: antes } = await supabaseAdmin.from('cuentas').select('*').eq('id', id).single()

    const { data, error } = await supabaseAdmin
      .from('cuentas')
      .update(campos)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion: 'EDITAR',
      entidad: 'cuentas', entidad_id: id,
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
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ ok: false, msg: 'ID requerido.' }, { status: 400 })

    const { data: antes } = await supabaseAdmin.from('cuentas').select('*').eq('id', id).single()

    const { error } = await supabaseAdmin.from('cuentas').delete().eq('id', id)
    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion: 'ELIMINAR',
      entidad: 'cuentas', entidad_id: id,
      estado_antes: JSON.stringify(antes), estado_despues: null,
      ip_hint: req.headers.get('x-forwarded-for') || 'local'
    }])

    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}
