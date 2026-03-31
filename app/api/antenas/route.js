import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, registrarAuditoria, respError } from '@/lib/apiHelpers'

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const activo = searchParams.get('activo') // undefined, 'true', 'false'

    let query = supabaseAdmin
      .from('antenas')
      .select('*')
      .order('created_at', { ascending: false })

    if (activo !== null && activo !== undefined && activo !== '') {
      query = query.eq('activa', activo === 'true')
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
    const { nombre, latitud, longitud, ubicacion_descripcion, banda_frecuencia, potencia_watts, alcance_approx_metros, nota_tecnica } = body

    if (!nombre || latitud === undefined || longitud === undefined) {
      return NextResponse.json({ ok: false, msg: 'nombre, latitud y longitud son requeridos.' }, { status: 400 })
    }

    const payload = {
      nombre,
      latitud: Number(latitud),
      longitud: Number(longitud),
      ubicacion_descripcion: ubicacion_descripcion || '',
      banda_frecuencia: banda_frecuencia || '',
      potencia_watts: potencia_watts ? Number(potencia_watts) : null,
      alcance_approx_metros: alcance_approx_metros ? Number(alcance_approx_metros) : null,
      nota_tecnica: nota_tecnica || '',
      activa: true,
    }

    const { data, error } = await supabaseAdmin.from('antenas').insert([payload]).select().single()
    if (error) throw error

    await registrarAuditoria(sesion, 'CREAR_ANTENA', 'antenas', data.id, null, data, req)
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

    const { data: antes } = await supabaseAdmin.from('antenas').select('*').eq('id', id).single()
    const { data, error } = await supabaseAdmin.from('antenas').update(campos).eq('id', id).select().single()
    if (error) throw error

    await registrarAuditoria(sesion, 'EDITAR_ANTENA', 'antenas', id, antes, data, req)
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

    const { data: antes } = await supabaseAdmin.from('antenas').select('*').eq('id', id).single()
    const { error } = await supabaseAdmin.from('antenas').delete().eq('id', id)
    if (error) throw error

    await registrarAuditoria(sesion, 'ELIMINAR_ANTENA', 'antenas', id, antes, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) { return respError(e) }
}
