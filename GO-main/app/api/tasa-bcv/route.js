import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, respError } from '@/lib/apiHelpers'

// GET /api/tasa-bcv           → tasa de hoy
// GET /api/tasa-bcv?fecha=X   → tasa de fecha específica
// POST /api/tasa-bcv          → registrar tasa del día (admin/staff)
export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const fecha = searchParams.get('fecha') || new Date().toISOString().split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('tasa_bcv')
      .select('*')
      .eq('fecha', fecha)
      .single()

    if (error || !data) {
      // Si no hay tasa de hoy, devolver la más reciente
      const { data: ultima } = await supabaseAdmin
        .from('tasa_bcv')
        .select('*')
        .order('fecha', { ascending: false })
        .limit(1)
        .single()
      return NextResponse.json({ ok: true, data: ultima || null, esHoy: false })
    }

    return NextResponse.json({ ok: true, data, esHoy: true })
  } catch (e) { return respError(e) }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const { tasa_usd_bs, fecha, fuente } = await req.json()
    if (!tasa_usd_bs || tasa_usd_bs <= 0)
      return NextResponse.json({ ok: false, msg: 'Tasa inválida.' }, { status: 400 })

    const fechaFinal = fecha || new Date().toISOString().split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('tasa_bcv')
      .upsert([{ fecha: fechaFinal, tasa_usd_bs: Number(tasa_usd_bs), fuente: fuente || 'manual', registrado_por: sesion.usuario }], { onConflict: 'fecha' })
      .select().single()

    if (error) throw error
    return NextResponse.json({ ok: true, data })
  } catch (e) { return respError(e) }
}
