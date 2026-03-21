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

// Calcula días de mora y penalización
function calcularMora(fechaPago, mesCobro, precioUsd) {
  if (!fechaPago || !mesCobro) return { diasMora: 0, penalizacion: 0 }
  try {
    const vencimiento = new Date(`${mesCobro}-05`)
    const pago = new Date(fechaPago)
    const diff = Math.floor((pago - vencimiento) / (1000 * 60 * 60 * 24))
    const diasMora = diff > 0 ? diff : 0
    const penalizacion = diasMora > 10 ? Number((Number(precioUsd || 0) * 0.05).toFixed(2)) : 0
    return { diasMora, penalizacion }
  } catch { return { diasMora: 0, penalizacion: 0 } }
}

async function registrarAuditoria(sesion, accion, id, antes, despues, req) {
  try {
    await supabaseAdmin.from('auditoria').insert([{
      usuario: sesion.usuario, rol: sesion.rol, accion,
      entidad: 'pagos', entidad_id: String(id),
      estado_antes: antes ? JSON.stringify(antes) : null,
      estado_despues: despues ? JSON.stringify(despues) : null,
      ip_hint: req.headers.get('x-forwarded-for') || 'local'
    }])
  } catch { /* no bloquea */ }
}

export async function GET(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const cliente_id = searchParams.get('cliente_id')
    const estado     = searchParams.get('estado')
    const mes        = searchParams.get('mes')
    const limite     = parseInt(searchParams.get('limite') || '200')

    let query = supabaseAdmin
      .from('pagos')
      .select('*')
      .order('fecha_pago', { ascending: false })
      .limit(limite)

    if (cliente_id) query = query.eq('cliente_id', cliente_id)
    if (estado)     query = query.eq('estado_verificacion', estado)
    if (mes)        query = query.eq('mes_cobro', mes)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ ok: true, data: data || [] })
  } catch (e) {
    console.error('[GET /api/pagos]', e.message)
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}

export async function POST(req) {
  try {
    const sesion = getSesion(req)
    assertRol(sesion, ['admin', 'staff'])

    const body = await req.json()
    const {
      cliente_id, mes_cobro, monto_facturado_usd, fecha_pago,
      tasa_bcv_facturacion, tasa_bcv_pago, monto_pagado_bs,
      cuenta_id, referencia, tipo_pago, nota_pago, capture_url,
      correo_del_titular, nombre_del_titular, monto_usd_real,
      cedula_cliente, nombre_cliente, tipo_cliente, nombre_plan
    } = body

    if (!cliente_id || !mes_cobro) {
      return NextResponse.json({ ok: false, msg: 'cliente_id y mes_cobro son requeridos.' }, { status: 400 })
    }

    // Obtener datos del cliente si no se pasaron
    let clienteData = { cedula_cliente, nombre_cliente, tipo_cliente }
    if (!nombre_cliente && cliente_id) {
      const { data: c } = await supabaseAdmin
        .from('clientes')
        .select('documento_identidad, nombre_razon_social, tipo_cliente, plan_id')
        .eq('id', cliente_id)
        .single()
      if (c) {
        clienteData.cedula_cliente = c.documento_identidad
        clienteData.nombre_cliente = c.nombre_razon_social
        clienteData.tipo_cliente   = c.tipo_cliente
      }
    }

    // Tipos donde la tasa es 1
    const SIN_TASA = ['Efectivo Divisas', 'Zelle', 'Binance']
    const esSinTasa = SIN_TASA.includes(tipo_pago)
    const REQUIERE_TITULAR = ['Zelle', 'Binance']
    const esTitular = REQUIERE_TITULAR.includes(tipo_pago)

    const { diasMora, penalizacion } = calcularMora(fecha_pago, mes_cobro, monto_facturado_usd)

    const payload = {
      cliente_id,
      cedula_cliente:       clienteData.cedula_cliente || '',
      nombre_cliente:       clienteData.nombre_cliente || '',
      tipo_cliente:         clienteData.tipo_cliente || '',
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
      dias_mora:            diasMora,
      penalizacion_mora:    penalizacion,
    }

    const { data, error } = await supabaseAdmin
      .from('pagos')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    await registrarAuditoria(sesion, 'CREAR_PAGO', data.id, null, data, req)
    return NextResponse.json({ ok: true, data }, { status: 201 })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    console.error('[POST /api/pagos]', e.message)
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}

export async function PATCH(req) {
  try {
    const sesion = getSesion(req)
    if (!sesion) return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })

    const body = await req.json()
    const { id, estado_verificacion, comentario_pago, ...otros } = body
    if (!id) return NextResponse.json({ ok: false, msg: 'ID requerido.' }, { status: 400 })

    // Permisos según acción
    const ESTADOS_VERIF = ['Verificado', 'Confirmado', 'Rechazado', 'Pendiente']
    if (estado_verificacion && ESTADOS_VERIF.includes(estado_verificacion)) {
      assertRol(sesion, ['admin', 'staff', 'verificador'])
    } else {
      assertRol(sesion, ['admin', 'staff'])
    }

    const { data: antes } = await supabaseAdmin.from('pagos').select('*').eq('id', id).single()

    const update = { ...otros }
    if (estado_verificacion) update.estado_verificacion = estado_verificacion
    if (comentario_pago !== undefined) update.comentario_pago = comentario_pago

    const { data, error } = await supabaseAdmin
      .from('pagos')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    await registrarAuditoria(sesion,
      estado_verificacion ? `PAGO_${estado_verificacion.toUpperCase()}` : 'EDITAR_PAGO',
      id, antes, data, req)

    return NextResponse.json({ ok: true, data })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    console.error('[PATCH /api/pagos]', e.message)
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

    const { data: antes } = await supabaseAdmin.from('pagos').select('*').eq('id', id).single()
    const { error } = await supabaseAdmin.from('pagos').delete().eq('id', id)
    if (error) throw error

    await registrarAuditoria(sesion, 'ELIMINAR_PAGO', id, antes, null, req)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e.message === 'ACCESO_DENEGADO') return NextResponse.json({ ok: false, msg: 'Sin permiso.' }, { status: 403 })
    if (e.message === 'SESION_INVALIDA') return NextResponse.json({ ok: false, msg: 'No autorizado.' }, { status: 401 })
    console.error('[DELETE /api/pagos]', e.message)
    return NextResponse.json({ ok: false, msg: e.message }, { status: 500 })
  }
}
