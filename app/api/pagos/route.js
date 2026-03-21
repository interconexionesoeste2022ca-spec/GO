import { NextResponse } from 'next/server'
import { supabaseAdmin, getSesion, assertRol, registrarAuditoria, calcularMora, generarNumeroFactura, respError } from '@/lib/apiHelpers'

const SIN_TASA         = ['Efectivo Divisas', 'Zelle', 'Binance']
const REQUIERE_TITULAR = ['Zelle', 'Binance']
const ESTADOS_VERIF    = ['Verificado', 'Confirmado', 'Rechazado', 'Pendiente']

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const cliente_id = searchParams.get('cliente_id')
    const estado     = searchParams.get('estado')
    const mes        = searchParams.get('mes')
    const page       = parseInt(searchParams.get('page') || '1')
    const per        = Math.min(parseInt(searchParams.get('per') || '200'), 500)
    const from       = (page - 1) * per

    let query = supabaseAdmin
      .from('pagos')
      .select('*', { count: 'exact' })
      .order('fecha_pago', { ascending: false })
      .range(from, from + per - 1)

    if (cliente_id) query = query.eq('cliente_id', cliente_id)
    if (estado)     query = query.eq('estado_verificacion', estado)
    if (mes)        query = query.eq('mes_cobro', mes)

    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({ ok: true, data: data || [], total: count, page, per })
  } catch (e) { return respError(e) }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    const { cliente_id, mes_cobro, monto_facturado_usd, fecha_pago,
      tasa_bcv_facturacion, tasa_bcv_pago, monto_pagado_bs,
      cuenta_id, referencia, tipo_pago, nota_pago, capture_url,
      correo_del_titular, nombre_del_titular, monto_usd_real,
      cedula_cliente, nombre_cliente, tipo_cliente, nombre_plan, descuento_usd } = body

    if (!cliente_id || !mes_cobro)
      return NextResponse.json({ ok: false, msg: 'cliente_id y mes_cobro son requeridos.' }, { status: 400 })

    // Verificar duplicado (mismo cliente, mismo mes, no rechazado)
    const { data: existe } = await supabaseAdmin
      .from('pagos').select('id')
      .eq('cliente_id', cliente_id)
      .eq('mes_cobro', mes_cobro)
      .neq('estado_verificacion', 'Rechazado')
      .single()
    if (existe)
      return NextResponse.json({ ok: false, msg: `Ya existe un pago registrado para ${mes_cobro}.` }, { status: 409 })

    // Datos del cliente si no vienen
    let cliData = { cedula_cliente, nombre_cliente, tipo_cliente }
    if (!nombre_cliente) {
      const { data: c } = await supabaseAdmin.from('clientes')
        .select('documento_identidad, nombre_razon_social, tipo_cliente')
        .eq('id', cliente_id).single()
      if (c) { cliData = { cedula_cliente: c.documento_identidad, nombre_cliente: c.nombre_razon_social, tipo_cliente: c.tipo_cliente } }
    }

    const esSinTasa   = SIN_TASA.includes(tipo_pago)
    const esTitular   = REQUIERE_TITULAR.includes(tipo_pago)
    const { diasMora, penalizacion } = calcularMora(fecha_pago, mes_cobro, monto_facturado_usd)
    const numero_factura = await generarNumeroFactura()

    const payload = {
      cliente_id,
      cedula_cliente:       cliData.cedula_cliente || '',
      nombre_cliente:       cliData.nombre_cliente || '',
      tipo_cliente:         cliData.tipo_cliente || '',
      nombre_plan:          nombre_plan || '',
      mes_cobro,
      monto_facturado_usd:  Number(monto_facturado_usd || 0),
      tasa_bcv_facturacion: esSinTasa ? 1 : Number(tasa_bcv_facturacion || 0),
      fecha_pago:           fecha_pago || new Date().toISOString().split('T')[0],
      tasa_bcv_pago:        esSinTasa ? 1 : Number(tasa_bcv_pago || 0),
      monto_pagado_bs:      esSinTasa ? 0 : Number(monto_pagado_bs || 0),
      cuenta_id:            (!esTitular && cuenta_id) ? cuenta_id : null,
      referencia:           referencia || '',
      estado_verificacion:  'Pendiente',
      capture_url:          capture_url || '',
      nota_pago:            nota_pago || '',
      tipo_pago:            tipo_pago || 'Transferencia',
      usuario_registro:     sesion.usuario,
      correo_del_titular:   esTitular ? (correo_del_titular || '') : '',
      nombre_del_titular:   esTitular ? (nombre_del_titular || '') : '',
      monto_usd_real:       Number(monto_usd_real || monto_facturado_usd || 0),
      descuento_usd:        Number(descuento_usd || 0),
      dias_mora:            diasMora,
      penalizacion_mora:    penalizacion,
      numero_factura,
    }

    const { data, error } = await supabaseAdmin.from('pagos').insert([payload]).select().single()
    if (error) throw error

    // Actualizar ultima_facturacion del cliente
    await supabaseAdmin.from('clientes')
      .update({ ultima_facturacion: payload.fecha_pago })
      .eq('id', cliente_id)

    await registrarAuditoria(sesion, 'CREAR_PAGO', 'pagos', data.id, null, data, req)
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (e) { return respError(e) }
}

export async function PATCH(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })

    const body = await req.json()
    const { id, estado_verificacion, comentario_pago, ...otros } = body
    if (!id) return NextResponse.json({ ok: false, msg: 'ID requerido.' }, { status: 400 })

    if (estado_verificacion && ESTADOS_VERIF.includes(estado_verificacion)) {
      assertRol(sesion, ['admin', 'staff', 'verificador'])
    } else {
      assertRol(sesion, ['admin', 'staff'])
    }

    const { data: antes } = await supabaseAdmin.from('pagos').select('*').eq('id', id).single()

    const update = { ...otros }
    if (estado_verificacion) {
      update.estado_verificacion = estado_verificacion
      // Registrar quién y cuándo verificó
      if (['Verificado', 'Confirmado', 'Rechazado'].includes(estado_verificacion)) {
        update.verificado_por = sesion.usuario
        update.verificado_en  = new Date().toISOString()
      }
    }
    if (comentario_pago !== undefined) update.comentario_pago = comentario_pago

    const { data, error } = await supabaseAdmin.from('pagos').update(update).eq('id', id).select().single()
    if (error) throw error

    const accion = estado_verificacion ? `PAGO_${estado_verificacion.toUpperCase()}` : 'EDITAR_PAGO'
    await registrarAuditoria(sesion, accion, 'pagos', id, antes, data, req)
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

    const { data: antes } = await supabaseAdmin.from('pagos').select('*').eq('id', id).single()
    const { error } = await supabaseAdmin.from('pagos').delete().eq('id', id)
    if (error) throw error

    await registrarAuditoria(sesion, 'ELIMINAR_PAGO', 'pagos', id, antes, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) { return respError(e) }
}
