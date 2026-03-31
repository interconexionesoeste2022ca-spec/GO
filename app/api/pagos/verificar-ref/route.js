import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, respError } from '@/lib/apiHelpers'

// GET /api/pagos/verificar-ref?ref=XXX
// Verifica si una referencia de pago ya existe
export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const ref = searchParams.get('ref')?.trim()

    if (!ref) return NextResponse.json({ ok: true, disponible: true })

    const { data } = await supabaseAdmin
      .from('pagos')
      .select('id, nombre_cliente, mes_cobro, fecha_pago, tipo_pago')
      .eq('referencia', ref)
      .neq('estado_verificacion', 'Rechazado')
      .maybeSingle()

    if (data) {
      return NextResponse.json({
        ok: true,
        disponible: false,
        pago_existente: data,
        msg: `Referencia usada por ${data.nombre_cliente} (${data.mes_cobro})`,
      })
    }

    return NextResponse.json({ ok: true, disponible: true })
  } catch (e) { return respError(e) }
}
