import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, registrarAuditoria, respError } from '@/lib/apiHelpers'

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const activo = searchParams.get('activo')

    let query = supabaseAdmin
      .from('snacks')
      .select('*')
      .order('created_at', { ascending: false })

    if (activo !== null && activo !== undefined && activo !== '') {
      query = query.eq('activo', activo === 'true')
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e) {
    return respError(e)
  }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    const { nombre, latitud, longitud, ubicacion_descripcion, contacto_telefono, horario_atencion, nota_especial } = body

    if (!nombre || latitud === undefined || longitud === undefined) {
      return NextResponse.json({ ok: false, msg: 'nombre, latitud y longitud son requeridos.' }, { status: 400 })
    }

    const payload = {
      nombre,
      latitud: Number(latitud),
      longitud: Number(longitud),
      ubicacion_descripcion: ubicacion_descripcion || '',
      contacto_telefono: contacto_telefono || '',
      horario_atencion: horario_atencion || '',
      nota_especial: nota_especial || '',
      activo: true,
    }

    const { data, error } = await supabaseAdmin.from('snacks').insert([payload]).select().single()
    if (error) throw error

    await registrarAuditoria(sesion, 'CREAR_SNACK', 'snacks', data.id, null, data, req)
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

    const { data: antes } = await supabaseAdmin.from('snacks').select('*').eq('id', id).single()
    const { data, error } = await supabaseAdmin.from('snacks').update(campos).eq('id', id).select().single()
    if (error) throw error

    await registrarAuditoria(sesion, 'EDITAR_SNACK', 'snacks', id, antes, data, req)
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

    const { data: antes } = await supabaseAdmin.from('snacks').select('*').eq('id', id).single()
    const { error } = await supabaseAdmin.from('snacks').delete().eq('id', id)
    if (error) throw error

    await registrarAuditoria(sesion, 'ELIMINAR_SNACK', 'snacks', id, antes, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) { return respError(e) }
}
