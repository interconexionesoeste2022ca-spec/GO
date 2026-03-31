// lib/apiHelpers.js
// Helper compartido para TODAS las API routes
// Centraliza auth, respuestas, auditoría y lógica de negocio
// v8.1 — Mejorado: soporte dual header+cookie, import limpio, fidelidad compartida

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { createClient } from '@supabase/supabase-js'

// Re-exportar fidelidad desde módulo compartido
export { calcularFidelidad } from './fidelidad'

// ─── Cliente Supabase (server-side only) ─────────────────────────────────────
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Auth — soporte dual: header Authorization + cookie httpOnly ─────────────
export function getSesion(req) {
  try {
    // 1. Intentar desde header Authorization (API clients, legacy)
    const header = req.headers.get('authorization') || ''
    let token = header.replace('Bearer ', '').trim()

    // 2. Fallback: cookie httpOnly (frontend con cookies automáticas)
    if (!token) {
      token = req.cookies.get('galanet_token')?.value || ''
    }

    if (!token) return null
    return jwt.verify(token, process.env.JWT_SECRET)
  } catch { return null }
}

export function assertRol(sesion, roles) {
  if (!sesion) throw new Error('SESION_INVALIDA')
  const rolActual = (sesion.rol || '').toLowerCase()
  if (!roles.map(r => r.toLowerCase()).includes(rolActual))
    throw new Error('ACCESO_DENEGADO')
}

// ─── Respuestas estándar ──────────────────────────────────────────────────────
export function respError(e, status = 500) {
  if (e.message === 'ACCESO_DENEGADO') return resp({ ok: false, msg: 'Sin permiso.' }, 403)
  if (e.message === 'SESION_INVALIDA')  return resp({ ok: false, msg: 'No autorizado.' }, 401)
  console.error('[API Error]', e.message)
  return resp({ ok: false, msg: e.message }, status)
}

export function resp(body, status = 200) {
  return NextResponse.json(body, { status })
}

// ─── Auditoría ────────────────────────────────────────────────────────────────
export async function registrarAuditoria(sesion, accion, entidad, id, antes, despues, req) {
  try {
    await supabaseAdmin.from('auditoria').insert([{
      usuario:        sesion.usuario,
      rol:            sesion.rol,
      accion,
      entidad,
      entidad_id:     String(id),
      estado_antes:   antes   ? JSON.stringify(antes)   : null,
      estado_despues: despues ? JSON.stringify(despues) : null,
      ip_hint:        req.headers.get('x-forwarded-for') || 'local',
    }])
  } catch { /* auditoría nunca bloquea la operación principal */ }
}

// ─── Tasa BCV ─────────────────────────────────────────────────────────────────
export async function getTasaBcvHoy() {
  const hoy = new Date().toISOString().split('T')[0]
  const { data } = await supabaseAdmin
    .from('tasa_bcv')
    .select('tasa_usd_bs')
    .eq('fecha', hoy)
    .single()
  return data?.tasa_usd_bs ?? null
}

// ─── Mora ─────────────────────────────────────────────────────────────────────
export function calcularMora(fechaPago, mesCobro, precioUsd) {
  if (!fechaPago || !mesCobro) return { diasMora: 0, penalizacion: 0 }
  try {
    const vencimiento = new Date(`${mesCobro}-05`)
    const pago        = new Date(fechaPago)
    const diff        = Math.floor((pago - vencimiento) / (1000 * 60 * 60 * 24))
    const diasMora    = diff > 0 ? diff : 0
    const penalizacion = diasMora > 10
      ? Number((Number(precioUsd || 0) * 0.05).toFixed(2))
      : 0
    return { diasMora, penalizacion }
  } catch { return { diasMora: 0, penalizacion: 0 } }
}

// ─── Número de factura correlativo ───────────────────────────────────────────
export async function generarNumeroFactura() {
  const año = new Date().getFullYear()
  const { count } = await supabaseAdmin
    .from('pagos')
    .select('id', { count: 'exact', head: true })
  const numero = String((count || 0) + 1).padStart(4, '0')
  return `FAC-${año}-${numero}`
}
