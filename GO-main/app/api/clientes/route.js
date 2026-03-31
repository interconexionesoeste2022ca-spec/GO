import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, registrarAuditoria, respError } from '@/lib/apiHelpers'

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const id      = searchParams.get('id')
    const zona    = searchParams.get('zona')
    const estado  = searchParams.get('estado')
    const plan_id = searchParams.get('plan_id')
    const q       = searchParams.get('q')
    const page    = parseInt(searchParams.get('page') || '1')
    const per     = Math.min(parseInt(searchParams.get('per') || '500'), 1000)
    const from    = (page - 1) * per

    let query = supabaseAdmin
      .from('clientes')
      .select('*', { count: 'exact' })
      .order('nombre_razon_social', { ascending: true })
      .range(from, from + per - 1)

    if (id)      query = query.eq('id', id)
    if (zona)    query = query.eq('zona_sector', zona)
    if (estado)  query = query.eq('estado_servicio', estado)
    if (plan_id) query = query.eq('plan_id', plan_id)
    if (q)       query = query.ilike('nombre_razon_social', `%${q}%`)

    const { data, error, count } = await query
    if (error) throw error

    if (id && data?.length === 1) return NextResponse.json({ ok: true, data: data[0] })
    return NextResponse.json({ ok: true, data: data || [], total: count, page, per })
  } catch (e) {
    return respError(e)
  }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    if (!body.nombre_razon_social)
      return NextResponse.json({ ok: false, msg: 'nombre_razon_social es requerido.' }, { status: 400 })

    const payload = { ...body }
    if (!payload.plan_id) delete payload.plan_id

    const { data, error } = await supabaseAdmin.from('clientes').insert([payload]).select().single()
    if (error) throw error

    await registrarAuditoria(sesion, 'CREAR', 'clientes', data.id, null, data, req)
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (e) { return respError(e) }
}

export async function PATCH(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    const { id, ...campos } = body
    if (!id) return NextResponse.json({ ok: false, msg: 'ID requerido.' }, { status: 400 })

    if (campos.plan_id === '' || campos.plan_id === null) delete campos.plan_id

    const { data: antes } = await supabaseAdmin.from('clientes').select('*').eq('id', id).single()
    const { data, error } = await supabaseAdmin.from('clientes').update(campos).eq('id', id).select().single()
    if (error) throw error

    await registrarAuditoria(sesion, 'EDITAR', 'clientes', id, antes, data, req)
    return NextResponse.json({ ok: true, data })
  } catch (e) { return respError(e) }
}

export async function DELETE(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin'])

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ ok: false, msg: 'ID requerido.' }, { status: 400 })

    // Verificar si tiene pagos o reportes asociados
    const { count: pagosCount } = await supabaseAdmin
      .from('pagos').select('id', { count: 'exact', head: true }).eq('cliente_id', id)
    if (pagosCount > 0)
      return NextResponse.json({ ok: false, msg: `No se puede eliminar: tiene ${pagosCount} pago(s) registrado(s).` }, { status: 409 })

    const { data: antes } = await supabaseAdmin.from('clientes').select('*').eq('id', id).single()
    const { error } = await supabaseAdmin.from('clientes').delete().eq('id', id)
    if (error) throw error

    await registrarAuditoria(sesion, 'ELIMINAR', 'clientes', id, antes, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) { return respError(e) }
}
