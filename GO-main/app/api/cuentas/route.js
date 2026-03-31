// app/api/cuentas/route.js
// v8.1 — Refactorizado: usa apiHelpers centralizado (sin duplicación)
import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, registrarAuditoria, respError } from '@/lib/apiHelpers'

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
  } catch (e) { return respError(e) }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    const { banco, numero_cuenta, titular, tipo_cuenta, telefono_pago_movil, cedula_rif, activa } = body

    if (!banco || !titular)
      return NextResponse.json({ ok: false, msg: 'Banco y titular son requeridos.' }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('cuentas')
      .insert([{ banco, numero_cuenta, titular, tipo_cuenta, telefono_pago_movil, cedula_rif, activa: activa ?? true }])
      .select()
      .single()

    if (error) throw error
    await registrarAuditoria(sesion, 'CREAR', 'cuentas', data.id, null, data, req)
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

    const { data: antes } = await supabaseAdmin.from('cuentas').select('*').eq('id', id).single()
    const { data, error } = await supabaseAdmin.from('cuentas').update(campos).eq('id', id).select().single()
    if (error) throw error

    await registrarAuditoria(sesion, 'EDITAR', 'cuentas', id, antes, data, req)
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

    const { data: antes } = await supabaseAdmin.from('cuentas').select('*').eq('id', id).single()
    const { error } = await supabaseAdmin.from('cuentas').delete().eq('id', id)
    if (error) throw error

    await registrarAuditoria(sesion, 'ELIMINAR', 'cuentas', id, antes, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) { return respError(e) }
}
