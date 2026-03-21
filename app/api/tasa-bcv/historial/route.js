import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, respError } from '@/lib/apiHelpers'

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { data, error } = await supabaseAdmin
      .from('tasa_bcv')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(30)

    if (error) throw error
    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e) { return respError(e) }
}
