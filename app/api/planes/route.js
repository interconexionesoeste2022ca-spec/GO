import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

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

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })
    const { data, error } = await supabaseAdmin.from('planes').select('*').order('precio_usd', { ascending: true })
    if (error) throw error
    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e) {
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])
    const body = await req.json()
    if (!body.nombre_plan) return NextResponse.json({ ok: false, msg: 'nombre_plan requerido.' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('planes').insert([body]).select().single()
    if (error) throw error
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
    const { id, ...campos } = body
    if (!id) return NextResponse.json({ ok: false, msg: 'ID requerido.' }, { status: 400 })
    const { data, error } = await supabaseAdmin.from('planes').update(campos).eq('id', id).select().single()
    if (error) throw error
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
    const { error } = await supabaseAdmin.from('planes').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}
