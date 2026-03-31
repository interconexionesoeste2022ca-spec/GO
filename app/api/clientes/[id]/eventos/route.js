// app/api/clientes/[id]/eventos/route.js
// v8.1 — Refactorizado: usa apiHelpers centralizado
import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, registrarAuditoria, respError } from '@/lib/apiHelpers'

// POST  /api/clientes/[id]/eventos  → registrar corte, reconexión o nota
// GET   /api/clientes/[id]/eventos  → listar historial_cortes del cliente

export async function GET(req, { params }) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { id } = params
    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('historial_cortes, nombre_razon_social')
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ ok: false, msg: 'Cliente no encontrado.' }, { status: 404 })

    return NextResponse.json({ ok: true, historial: data.historial_cortes || [], cliente: data.nombre_razon_social })
  } catch (e) { return respError(e) }
}

export async function POST(req, { params }) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const { id } = params
    const body = await req.json()
    const { tipo, motivo, fecha } = body

    const TIPOS_VALIDOS = ['Corte', 'Reconexión', 'Nota']
    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ ok: false, msg: `Tipo inválido. Use: ${TIPOS_VALIDOS.join(', ')}` }, { status: 400 })
    }

    const { data: cliente, error: errCliente } = await supabaseAdmin
      .from('clientes')
      .select('historial_cortes, estado_servicio, nombre_razon_social')
      .eq('id', id)
      .single()

    if (errCliente || !cliente) return NextResponse.json({ ok: false, msg: 'Cliente no encontrado.' }, { status: 404 })

    const historialActual = Array.isArray(cliente.historial_cortes) ? cliente.historial_cortes : []

    const nuevoEvento = {
      tipo,
      fecha: fecha || new Date().toISOString().split('T')[0],
      motivo: motivo || '',
      registrado_por: sesion.usuario,
      timestamp: new Date().toISOString()
    }

    const nuevoHistorial = [...historialActual, nuevoEvento]

    const update = { historial_cortes: nuevoHistorial }
    if (tipo === 'Corte') update.estado_servicio = 'Cortado'
    if (tipo === 'Reconexión') update.estado_servicio = 'Activo'

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .update(update)
      .eq('id', id)
      .select('id, historial_cortes, estado_servicio')
      .single()

    if (error) throw error

    await registrarAuditoria(sesion, `EVENTO_${tipo.toUpperCase()}`, 'clientes', id,
      { estado_servicio: cliente.estado_servicio, eventos: historialActual.length },
      { estado_servicio: update.estado_servicio || cliente.estado_servicio, nuevoEvento },
      req
    )

    return NextResponse.json({ ok: true, data, evento: nuevoEvento }, { status: 201 })
  } catch (e) { return respError(e) }
}

export async function DELETE(req, { params }) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin'])

    const { id } = params
    const { searchParams } = new URL(req.url)
    const timestamp = searchParams.get('timestamp')

    if (!timestamp) return NextResponse.json({ ok: false, msg: 'Timestamp del evento requerido.' }, { status: 400 })

    const { data: cliente } = await supabaseAdmin
      .from('clientes')
      .select('historial_cortes')
      .eq('id', id)
      .single()

    if (!cliente) return NextResponse.json({ ok: false, msg: 'Cliente no encontrado.' }, { status: 404 })

    const historialFiltrado = (cliente.historial_cortes || []).filter(e => e.timestamp !== timestamp)

    const { error } = await supabaseAdmin
      .from('clientes')
      .update({ historial_cortes: historialFiltrado })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true, eliminados: (cliente.historial_cortes?.length || 0) - historialFiltrado.length })
  } catch (e) { return respError(e) }
}
