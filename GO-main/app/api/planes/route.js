// app/api/planes/route.js
// v8.1 — Refactorizado: usa apiHelpers centralizado + auditoría añadida
import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, registrarAuditoria, respError } from '@/lib/apiHelpers'

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })
    const { data, error } = await supabaseAdmin.from('planes').select('*').order('precio_usd', { ascending: true })
    if (error) throw error
    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e) { return respError(e) }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])
    const body = await req.json()
    if (!body.nombre_plan) return NextResponse.json({ ok: false, msg: 'nombre_plan requerido.' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('planes').insert([body]).select().single()
    if (error) throw error
    await registrarAuditoria(sesion, 'CREAR', 'planes', data.id, null, data, req)
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
    const { data: antes } = await supabaseAdmin.from('planes').select('*').eq('id', id).single()
    const { data, error } = await supabaseAdmin.from('planes').update(campos).eq('id', id).select().single()
    if (error) throw error
    await registrarAuditoria(sesion, 'EDITAR', 'planes', id, antes, data, req)
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
    const { data: antes } = await supabaseAdmin.from('planes').select('*').eq('id', id).single()
    const { error } = await supabaseAdmin.from('planes').delete().eq('id', id)
    if (error) throw error
    await registrarAuditoria(sesion, 'ELIMINAR', 'planes', id, antes, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) { return respError(e) }
}
