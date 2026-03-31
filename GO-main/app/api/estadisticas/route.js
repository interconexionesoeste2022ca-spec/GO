import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, respError } from '@/lib/apiHelpers'

// GET /api/estadisticas — KPIs completos para el dashboard
export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const mesActual = new Date().toISOString().slice(0, 7)
    const mesAnterior = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)

    const [
      { data: clientes },
      { data: pagosEste },
      { data: pagosAnterior },
      { data: reportesAbiertos },
      { data: tasaHoy },
      { data: morosos },
    ] = await Promise.all([
      supabaseAdmin.from('clientes').select('id, estado_servicio, zona_sector, plan_id'),
      supabaseAdmin.from('pagos').select('monto_usd_real, monto_facturado_usd, estado_verificacion, tipo_pago').eq('mes_cobro', mesActual),
      supabaseAdmin.from('pagos').select('monto_usd_real, monto_facturado_usd, estado_verificacion').eq('mes_cobro', mesAnterior).neq('estado_verificacion', 'Rechazado'),
      supabaseAdmin.from('reportes').select('id, prioridad, estado').eq('estado', 'abierto'),
      supabaseAdmin.from('tasa_bcv').select('tasa_usd_bs').eq('fecha', new Date().toISOString().split('T')[0]).single(),
      supabaseAdmin.from('clientes').select('id').eq('estado_servicio', 'Cortado'),
    ])

    const cls = clientes || []
    const pgs = pagosEste || []
    const pgsAnt = pagosAnterior || []

    const cobradoMes = pgs
      .filter(p => p.estado_verificacion !== 'Rechazado')
      .reduce((s, p) => s + Number(p.monto_usd_real || p.monto_facturado_usd || 0), 0)

    const cobradoAnterior = pgsAnt
      .reduce((s, p) => s + Number(p.monto_usd_real || p.monto_facturado_usd || 0), 0)

    const variacionIngresos = cobradoAnterior > 0
      ? ((cobradoMes - cobradoAnterior) / cobradoAnterior * 100).toFixed(1)
      : null

    // Distribución por zona
    const porZona = cls.reduce((acc, c) => {
      const z = c.zona_sector || 'Sin zona'
      if (!acc[z]) acc[z] = { total: 0, activos: 0 }
      acc[z].total++
      if (c.estado_servicio === 'Activo') acc[z].activos++
      return acc
    }, {})

    // Distribución por tipo de pago este mes
    const porTipoPago = pgs.reduce((acc, p) => {
      if (p.estado_verificacion === 'Rechazado') return acc
      acc[p.tipo_pago] = (acc[p.tipo_pago] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({
      ok: true,
      data: {
        clientes: {
          total:    cls.length,
          activos:  cls.filter(c => c.estado_servicio === 'Activo').length,
          cortados: cls.filter(c => c.estado_servicio === 'Cortado').length,
          morosos:  cls.filter(c => c.estado_servicio === 'Moroso').length,
        },
        pagos: {
          pendientes:        pgs.filter(p => p.estado_verificacion === 'Pendiente').length,
          cobradoMes:        Number(cobradoMes.toFixed(2)),
          cobradoAnterior:   Number(cobradoAnterior.toFixed(2)),
          variacionIngresos: variacionIngresos ? Number(variacionIngresos) : null,
          totalEste:         pgs.filter(p => p.estado_verificacion !== 'Rechazado').length,
        },
        reportes: {
          abiertos:  reportesAbiertos?.length || 0,
          criticos:  reportesAbiertos?.filter(r => r.prioridad === 'critica').length || 0,
          altos:     reportesAbiertos?.filter(r => r.prioridad === 'alta').length || 0,
        },
        tasaBcv:    tasaHoy?.tasa_usd_bs || null,
        porZona,
        porTipoPago,
        mesActual,
      },
    })
  } catch (e) { return respError(e) }
}
