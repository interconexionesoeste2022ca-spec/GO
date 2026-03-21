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
  } catch (e) {
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
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

    // Obtener cliente actual
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

    // Actualizar estado_servicio según tipo de evento
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

    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion: `EVENTO_${tipo.toUpperCase()}`,
      entidad: 'clientes', entidad_id: id,
      estado_antes: JSON.stringify({ estado_servicio: cliente.estado_servicio, eventos: historialActual.length }),
      estado_despues: JSON.stringify({ estado_servicio: update.estado_servicio || cliente.estado_servicio, nuevoEvento }),
      ip_hint: req.headers.get('x-forwarded-for') || 'local'
    }])

    return NextResponse.json({ ok: true, data, evento: nuevoEvento }, { status: 201 })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}

export async function DELETE(req, { params }) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin'])

    const { id } = params
    const { searchParams } = new URL(req.url)
    const timestamp = searchParams.get('timestamp') // eliminar evento por timestamp único

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
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}
