import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, registrarAuditoria, respError } from '@/lib/apiHelpers'

const ESTADOS_VALIDOS    = ['abierto', 'en_proceso', 'resuelto', 'cerrado']
const PRIORIDADES_VALIDAS = ['baja', 'media', 'alta', 'critica']

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const cliente_id = searchParams.get('cliente_id')
    const estado     = searchParams.get('estado')
    const categoria  = searchParams.get('categoria')
    const page       = parseInt(searchParams.get('page') || '1')
    const per        = Math.min(parseInt(searchParams.get('per') || '100'), 500)
    const from       = (page - 1) * per

    let query = supabaseAdmin
      .from('reportes')
      .select('*, clientes(nombre_razon_social, documento_identidad)', { count: 'exact' })
      .order('fecha_reporte', { ascending: false })
      .range(from, from + per - 1)

    if (cliente_id) query = query.eq('cliente_id', cliente_id)
    if (estado)     query = query.eq('estado', estado.toLowerCase())
    if (categoria)  query = query.eq('categoria', categoria)

    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({ ok: true, data: data || [], total: count })
  } catch (e) { return respError(e) }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    const { cliente_id, tipo, prioridad, titulo, descripcion, tecnico, categoria } = body

    if (!cliente_id || !tipo || !titulo)
      return NextResponse.json({ ok: false, msg: 'cliente_id, tipo y titulo son requeridos.' }, { status: 400 })

    const prio = (prioridad || 'media').toLowerCase()
    if (!PRIORIDADES_VALIDAS.includes(prio))
      return NextResponse.json({ ok: false, msg: `Prioridad inválida. Use: ${PRIORIDADES_VALIDAS.join(', ')}` }, { status: 400 })

    const { data, error } = await supabaseAdmin.from('reportes').insert([{
      cliente_id, tipo, titulo, descripcion, tecnico, categoria,
      prioridad: prio,
      estado: 'abierto',
      fecha_reporte: new Date().toISOString().split('T')[0],
      usuario_registro: sesion.usuario,
    }]).select().single()

    if (error) throw error
    await registrarAuditoria(sesion, 'CREAR_REPORTE', 'reportes', data.id, null, data, req)
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (e) { return respError(e) }
}

export async function PATCH(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    const { id, estado, solucion, tecnico, prioridad, titulo, descripcion, categoria, costo_material_usd } = body
    if (!id) return NextResponse.json({ ok: false, msg: 'ID requerido.' }, { status: 400 })

    if (estado && !ESTADOS_VALIDOS.includes(estado.toLowerCase()))
      return NextResponse.json({ ok: false, msg: `Estado inválido. Use: ${ESTADOS_VALIDOS.join(', ')}` }, { status: 400 })

    const { data: antes } = await supabaseAdmin.from('reportes').select('*').eq('id', id).single()

    const update = {}
    if (estado)                 update.estado = estado.toLowerCase()
    if (solucion !== undefined) update.solucion = solucion
    if (tecnico !== undefined)  update.tecnico = tecnico
    if (prioridad !== undefined) update.prioridad = prioridad.toLowerCase()
    if (titulo !== undefined)   update.titulo = titulo
    if (descripcion !== undefined) update.descripcion = descripcion
    if (categoria !== undefined) update.categoria = categoria
    if (costo_material_usd !== undefined) update.costo_material_usd = costo_material_usd

    if (estado && ['resuelto', 'cerrado'].includes(estado.toLowerCase())) {
      update.fecha_resolucion = new Date().toISOString().split('T')[0]
      // Calcular tiempo de respuesta
      if (antes?.fecha_reporte) {
        const inicio = new Date(antes.fecha_reporte)
        const fin    = new Date()
        update.tiempo_respuesta_horas = Math.round((fin - inicio) / (1000 * 60 * 60))
      }
    }

    const { data, error } = await supabaseAdmin.from('reportes').update(update).eq('id', id).select().single()
    if (error) throw error

    await registrarAuditoria(sesion, 'EDITAR_REPORTE', 'reportes', id, antes, data, req)
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

    const { data: antes } = await supabaseAdmin.from('reportes').select('*').eq('id', id).single()
    const { error } = await supabaseAdmin.from('reportes').delete().eq('id', id)
    if (error) throw error

    await registrarAuditoria(sesion, 'ELIMINAR_REPORTE', 'reportes', id, antes, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) { return respError(e) }
}
