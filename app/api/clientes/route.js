import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

// Inline clients para evitar problemas de importación
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

async function registrarAuditoria(sesion, accion, entidad, id, antes, despues, req) {
  try {
    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion,
      entidad, entidad_id: String(id),
      estado_antes: antes ? JSON.stringify(antes) : null,
      estado_despues: despues ? JSON.stringify(despues) : null,
      ip_hint: req.headers.get('x-forwarded-for') || 'local'
    }])
  } catch (e) { /* auditoría no bloquea la operación */ }
}

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id       = searchParams.get('id')
    const zona     = searchParams.get('zona')
    const estado   = searchParams.get('estado')
    const plan_id  = searchParams.get('plan_id')
    const limite   = parseInt(searchParams.get('limite') || '1000')

    let query = supabaseAdmin
      .from('clientes')
      .select('*')
      .order('nombre_razon_social', { ascending: true })
      .limit(limite)

    if (id)      query = query.eq('id', id)
    if (zona)    query = query.eq('zona_sector', zona)
    if (estado)  query = query.eq('estado_servicio', estado)
    if (plan_id) query = query.eq('plan_id', plan_id)

    const { data, error } = await query
    if (error) throw error

    // Si se pidió un cliente específico, retornar objeto en vez de array
    if (id && data.length === 1) return NextResponse.json({ ok: true, data: data[0] })
    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e) {
    console.error('[GET /api/clientes]', e.message)
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    const { nombre_razon_social, documento_identidad } = body

    if (!nombre_razon_social) {
      return NextResponse.json({ ok: false, msg: 'nombre_razon_social es requerido.' }, { status: 400 })
    }

    // Limpiar campos vacíos para no guardar strings vacíos en FK
    const payload = { ...body }
    if (!payload.plan_id) delete payload.plan_id

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    await registrarAuditoria(sesion, 'CREAR', 'clientes', data.id, null, data, req)
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    console.error('[POST /api/clientes]', e.message)
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

    // Limpiar plan_id vacío
    if (campos.plan_id === '' || campos.plan_id === null) delete campos.plan_id

    const { data: antes } = await supabaseAdmin.from('clientes').select('*').eq('id', id).single()

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .update(campos)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await registrarAuditoria(sesion, 'EDITAR', 'clientes', id, antes, data, req)
    return NextResponse.json({ ok: true, data })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    console.error('[PATCH /api/clientes]', e.message)
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

    const { data: antes } = await supabaseAdmin.from('clientes').select('*').eq('id', id).single()
    const { error } = await supabaseAdmin.from('clientes').delete().eq('id', id)
    if (error) throw error

    await registrarAuditoria(sesion, 'ELIMINAR', 'clientes', id, antes, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    console.error('[DELETE /api/clientes]', e.message)
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}
