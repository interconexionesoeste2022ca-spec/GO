import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, registrarAuditoria, respError } from '@/lib/apiHelpers'

export async function GET(req, { params }) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const cliente_id = params.id
    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo') // 'referencia' | 'documento' | undefined (all)

    let query = supabaseAdmin
      .from('cliente_fotos_drive')
      .select('*')
      .eq('cliente_id', cliente_id)
      .order('created_at', { ascending: false })

    if (tipo === 'referencia') {
      query = query.eq('es_referencia_casa', true)
    } else if (tipo === 'documento') {
      query = query.eq('es_documento', true)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e) {
    return respError(e)
  }
}

export async function POST(req, { params }) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const cliente_id = params.id
    const body = await req.json()
    const { drive_url, drive_file_id, titulo, es_referencia_casa, es_documento, notas } = body

    if (!drive_url || !drive_file_id) {
      return NextResponse.json({ ok: false, msg: 'drive_url y drive_file_id son requeridos.' }, { status: 400 })
    }

    // Verificar que el cliente existe
    const { data: cliente } = await supabaseAdmin.from('clientes').select('id').eq('id', cliente_id).single()
    if (!cliente) {
      return NextResponse.json({ ok: false, msg: 'Cliente no encontrado.' }, { status: 404 })
    }

    const payload = {
      cliente_id: Number(cliente_id),
      drive_url,
      drive_file_id,
      titulo: titulo || '',
      es_referencia_casa: es_referencia_casa ?? true,
      es_documento: es_documento ?? false,
      notas: notas || '',
      subida_por: sesion.usuario,
    }

    const { data, error } = await supabaseAdmin.from('cliente_fotos_drive').insert([payload]).select().single()
    if (error) throw error

    await registrarAuditoria(sesion, 'AGREGAR_FOTO_DRIVE', 'cliente_fotos_drive', data.id, null, data, req)
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (e) { return respError(e) }
}

export async function PATCH(req, { params }) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const cliente_id = params.id
    const body = await req.json()
    const { id, ...campos } = body

    if (!id) {
      return NextResponse.json({ ok: false, msg: 'ID de foto requerido.' }, { status: 400 })
    }

    const { data: antes } = await supabaseAdmin.from('cliente_fotos_drive').select('*').eq('id', id).single()
    if (!antes || antes.cliente_id !== Number(cliente_id)) {
      return NextResponse.json({ ok: false, msg: 'Foto no encontrada.' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin.from('cliente_fotos_drive').update(campos).eq('id', id).select().single()
    if (error) throw error

    await registrarAuditoria(sesion, 'EDITAR_FOTO_DRIVE', 'cliente_fotos_drive', id, antes, data, req)
    return NextResponse.json({ ok: true, data })
  } catch (e) { return respError(e) }
}

export async function DELETE(req, { params }) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const cliente_id = params.id
    const { searchParams } = new URL(req.url)
    const foto_id = searchParams.get('foto_id')

    if (!foto_id) {
      return NextResponse.json({ ok: false, msg: 'foto_id requerido.' }, { status: 400 })
    }

    const { data: antes } = await supabaseAdmin.from('cliente_fotos_drive').select('*').eq('id', foto_id).single()
    if (!antes || antes.cliente_id !== Number(cliente_id)) {
      return NextResponse.json({ ok: false, msg: 'Foto no encontrada.' }, { status: 404 })
    }

    const { error } = await supabaseAdmin.from('cliente_fotos_drive').delete().eq('id', foto_id)
    if (error) throw error

    await registrarAuditoria(sesion, 'ELIMINAR_FOTO_DRIVE', 'cliente_fotos_drive', foto_id, antes, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) { return respError(e) }
}
