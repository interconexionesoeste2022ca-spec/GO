import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, respError } from '@/lib/apiHelpers'

// GET /api/cobranza?mes=2026-03
// Devuelve todos los clientes activos con su estado de pago para el mes
export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const mes = searchParams.get('mes') || new Date().toISOString().slice(0, 7)

    // Clientes activos y morosos (los que deben cobrar)
    const { data: clientes, error: ce } = await supabaseAdmin
      .from('clientes')
      .select('id, nombre_razon_social, documento_identidad, telefono, zona_sector, plan_id, estado_servicio, dia_corte, notas_cobro, latitud, longitud, whatsapp')
      .in('estado_servicio', ['Activo', 'Moroso', 'Cortado'])
      .order('dia_corte', { ascending: true })

    if (ce) throw ce

    // Pagos del mes seleccionado
    const { data: pagos, error: pe } = await supabaseAdmin
      .from('pagos')
      .select('cliente_id, estado_verificacion, monto_usd_real, monto_facturado_usd, tipo_pago, fecha_pago, id')
      .eq('mes_cobro', mes)
      .neq('estado_verificacion', 'Rechazado')

    if (pe) throw pe

    // Planes para saber el monto
    const { data: planes } = await supabaseAdmin
      .from('planes')
      .select('id, nombre_plan, precio_usd')

    const planMap  = Object.fromEntries((planes || []).map(p => [p.id, p]))
    const pagoMap  = Object.fromEntries((pagos || []).map(p => [p.cliente_id, p]))

    const hoy = new Date()
    const [anio, mesNum] = mes.split('-').map(Number)

    const resultado = (clientes || []).map(c => {
      const pago     = pagoMap[c.id] || null
      const plan     = planMap[c.plan_id] || null
      const diaCierre = Math.min(c.dia_corte || 5, 28) // max 28 para evitar problemas en febrero
      const fechaVence = new Date(anio, mesNum - 1, diaCierre)
      const estesMes   = hoy.getFullYear() === anio && hoy.getMonth() === mesNum - 1
      const yaVencio   = hoy > fechaVence

      let estadoCobro
      if (pago) {
        estadoCobro = pago.estado_verificacion === 'Confirmado' || pago.estado_verificacion === 'Verificado'
          ? 'pagado' : 'pendiente_verificacion'
      } else if (estesMes && !yaVencio) {
        estadoCobro = 'por_vencer'
      } else if (yaVencio || !estesMes) {
        estadoCobro = 'sin_pagar'
      } else {
        estadoCobro = 'por_vencer'
      }

      return {
        ...c,
        plan_nombre:    plan?.nombre_plan || '—',
        monto_usd:      plan?.precio_usd || 0,
        pago,
        estado_cobro:   estadoCobro,
        fecha_vence:    fechaVence.toISOString().split('T')[0],
        dias_restantes: Math.ceil((fechaVence - hoy) / (1000 * 60 * 60 * 24)),
      }
    })

    // Resumen
    const resumen = {
      total:                resultado.length,
      pagados:              resultado.filter(c => c.estado_cobro === 'pagado').length,
      pendiente_verificacion: resultado.filter(c => c.estado_cobro === 'pendiente_verificacion').length,
      sin_pagar:            resultado.filter(c => c.estado_cobro === 'sin_pagar').length,
      por_vencer:           resultado.filter(c => c.estado_cobro === 'por_vencer').length,
      monto_esperado:       resultado.reduce((s, c) => s + Number(c.monto_usd || 0), 0),
      monto_cobrado:        resultado.filter(c => c.estado_cobro === 'pagado')
                              .reduce((s, c) => s + Number(c.pago?.monto_usd_real || c.pago?.monto_facturado_usd || 0), 0),
    }

    return NextResponse.json({ ok: true, data: resultado, resumen, mes })
  } catch (e) { return respError(e) }
}