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

const ESTADOS_VALIDOS = ['abierto', 'en_proceso', 'resuelto', 'cerrado']
const PRIORIDADES_VALIDAS = ['baja', 'media', 'alta', 'critica']

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const cliente_id = searchParams.get('cliente_id')
    const estado = searchParams.get('estado')
    const limite = parseInt(searchParams.get('limite') || '100')

    let query = supabaseAdmin
      .from('reportes')
      .select(`*, clientes(nombre_razon_social, documento_identidad)`)
      .order('fecha_reporte', { ascending: false })
      .limit(limite)

    if (cliente_id) query = query.eq('cliente_id', cliente_id)
    if (estado) query = query.eq('estado', estado)

    const { data, error } = await query
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
    const { cliente_id, tipo, prioridad, titulo, descripcion, tecnico } = body

    if (!cliente_id || !tipo || !titulo) {
      return NextResponse.json({ ok: false, msg: 'cliente_id, tipo y titulo son requeridos.' }, { status: 400 })
    }
    if (prioridad && !PRIORIDADES_VALIDAS.includes(prioridad.toLowerCase())) {
      return NextResponse.json({ ok: false, msg: `Prioridad inválida. Use: ${PRIORIDADES_VALIDAS.join(', ')}` }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('reportes')
      .insert([{
        cliente_id,
        fecha_reporte: new Date().toISOString().split('T')[0],
        tipo,
        prioridad: prioridad || 'media',
        titulo,
        descripcion,
        tecnico,
        estado: 'abierto',
        usuario_registro: sesion.usuario
      }])
      .select()
      .single()

    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion: 'CREAR_REPORTE',
      entidad: 'reportes', entidad_id: data.id,
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
    const { id, estado, solucion, tecnico, prioridad, titulo, descripcion } = body
    if (!id) return NextResponse.json({ ok: false, msg: 'ID requerido.' }, { status: 400 })

    if (estado && !ESTADOS_VALIDOS.includes(estado.toLowerCase())) {
      return NextResponse.json({ ok: false, msg: `Estado inválido. Use: ${ESTADOS_VALIDOS.join(', ')}` }, { status: 400 })
    }

    const { data: antes } = await supabaseAdmin.from('reportes').select('*').eq('id', id).single()

    const update = {}
    if (estado) update.estado = estado.toLowerCase()
    if (solucion !== undefined) update.solucion = solucion
    if (tecnico !== undefined) update.tecnico = tecnico
    if (prioridad !== undefined) update.prioridad = prioridad
    if (titulo !== undefined) update.titulo = titulo
    if (descripcion !== undefined) update.descripcion = descripcion

    // Si se resuelve o cierra, registrar fecha_resolucion
    if (estado && ['resuelto', 'cerrado'].includes(estado.toLowerCase())) {
      update.fecha_resolucion = new Date().toISOString().split('T')[0]
    }

    const { data, error } = await supabaseAdmin
      .from('reportes')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion: 'EDITAR_REPORTE',
      entidad: 'reportes', entidad_id: id,
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

    const { data: antes } = await supabaseAdmin.from('reportes').select('*').eq('id', id).single()
    const { error } = await supabaseAdmin.from('reportes').delete().eq('id', id)
    if (error) throw error

    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion: 'ELIMINAR_REPORTE',
      entidad: 'reportes', entidad_id: id,
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
