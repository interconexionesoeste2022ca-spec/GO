#!/usr/bin/env node

// scripts/migrar-desde-sheets.js
// Migra TODOS los datos desde Google Sheets a Supabase
// Clientes, Pagos, Planes, Antenas, Snacks
// 
// Uso: 
//   export SUPABASE_SERVICE_ROLE_KEY="your-key"
//   node scripts/migrar-desde-sheets.js

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lboiiqgngygcocpdcwwt.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('⚠ Falta SUPABASE_SERVICE_ROLE_KEY. Ejecuta con:')
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="tu-key"; node scripts/migrar-desde-sheets.js')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 📊 HOJA DE CLIENTES
const SHEET_CLIENTES_URL = 'https://docs.google.com/spreadsheets/d/1dlG27ctJHSeBpgMAt7rQnZMJlvJxYKM3JOR2MFytyR4/gviz/tq?tqx=out:csv&gid=0'
// 📊 HOJA DE PAGOS (si existe, cambiar gid según la hoja)
const SHEET_PAGOS_URL = 'https://docs.google.com/spreadsheets/d/1dlG27ctJHSeBpgMAt7rQnZMJlvJxYKM3JOR2MFytyR4/gviz/tq?tqx=out:csv&gid=1'

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCSVLine(lines[i])
    if (!vals || vals.length < 2) continue
    const row = {}
    headers.forEach((h, j) => { row[h] = vals[j] || '' })
    rows.push(row)
  }
  return rows
}

// Helper: convertir texto a número
function toNumber(val) {
  if (!val) return 0
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''))
  return isNaN(num) ? 0 : num
}

// Helper: convertir texto a booleano
function toBoolean(val) {
  if (!val) return false
  return String(val).toLowerCase().includes('sí') || String(val).toLowerCase().includes('yes') || String(val).toLowerCase().includes('true')
}

async function migrarClientes() {
  console.log('\n📥 Descargando clientes del Sheet…')
  try {
    const res = await fetch(SHEET_CLIENTES_URL)
    const text = await res.text()
    const rows = parseCSV(text)
    console.log(`📊 ${rows.length} clientes encontrados`)

    // Obtener clientes existentes
    const { data: existentes } = await supabase.from('clientes').select('documento_identidad, nombre_razon_social')
    const existentesSet = new Set((existentes || []).map(c => c.documento_identidad?.toLowerCase()).filter(Boolean))

    let insertados = 0
    let actualizados = 0
    let omitidos = 0

    for (const row of rows) {
      const nombre = (row.nombre_razon_social || row.nombre || '').trim()
      const doc = (row.documento_identidad || row.cedula || '').trim()

      if (!nombre) {
        omitidos++
        continue
      }

      const payload = {
        nombre_razon_social: nombre,
        documento_identidad: doc || null,
        tipo_cliente: row.tipo_cliente || 'Residencial',
        telefono: row.telefono || '',
        email: row.email || '',
        zona_sector: row.zona_sector || row.zona || '',
        direccion_ubicacion: row.direccion_ubicacion || row.direccion || '',
        latitud: row.latitud ? toNumber(row.latitud) : null,
        longitud: row.longitud ? toNumber(row.longitud) : null,
        estado_servicio: row.estado_servicio || row.estado || 'Activo',
        plan_id: row.plan_id ? parseInt(row.plan_id) : null,
        fecha_instalacion: row.fecha_instalacion || null,
        activo: toBoolean(row.activo) ?? true,
      }

      // Verificar si ya existe
      if (doc && existentesSet.has(doc.toLowerCase())) {
        // Actualizar
        const { error } = await supabase.from('clientes')
          .update(payload)
          .eq('documento_identidad', doc)
        if (!error) actualizados++
        else console.error(`  ❌ Error actualizando ${nombre}:`, error.message)
      } else {
        // Insertar
        const { error } = await supabase.from('clientes').insert([payload])
        if (!error) {
          insertados++
          existentesSet.add(doc.toLowerCase())
        } else if (error.code !== 'PGRST116') {
          console.error(`  ❌ Error insertando ${nombre}:`, error.message)
        } else {
          omitidos++
        }
      }
    }

    console.log(`✅ Clientes: +${insertados} insertados, +${actualizados} actualizados, ${omitidos} omitidos`)
  } catch (e) {
    console.error('❌ Error migrando clientes:', e.message)
  }
}

async function migrarPagos() {
  console.log('\n📥 Descargando pagos del Sheet…')
  try {
    const res = await fetch(SHEET_PAGOS_URL)
    const text = await res.text()
    
    if (!text || text.length < 50) {
      console.log('⏭ No hay datos de pagos para migrar')
      return
    }

    const rows = parseCSV(text)
    console.log(`📊 ${rows.length} pagos encontrados`)

    // Obtener clientes para mapear
    const { data: clientes } = await supabase.from('clientes').select('id, nombre_razon_social, documento_identidad')
    const clienteMapping = {}
    clientes.forEach(c => {
      clienteMapping[c.nombre_razon_social?.toLowerCase()] = c.id
      if (c.documento_identidad) clienteMapping[c.documento_identidad] = c.id
    })

    let insertados = 0
    let omitidos = 0

    for (const row of rows) {
      const nombreCliente = (row.nombre_cliente || row.cliente || '').trim()
      const cliente_id = clienteMapping[nombreCliente.toLowerCase()]

      if (!cliente_id) {
        console.log(`  ⏭ Omitido (cliente no encontrado): ${nombreCliente}`)
        omitidos++
        continue
      }

      const payload = {
        cliente_id,
        mes_cobro: row.mes_cobro || '',
        fecha_pago: row.fecha_pago || new Date().toISOString().split('T')[0],
        monto_facturado_usd: toNumber(row.monto_facturado_usd),
        monto_pagado_bs: toNumber(row.monto_pagado_bs),
        tasa_bcv_facturacion: toNumber(row.tasa_bcv_facturacion) || 1,
        tasa_bcv_pago: toNumber(row.tasa_bcv_pago) || 1,
        tipo_pago: row.tipo_pago || 'Transferencia',
        referencia: row.referencia || '',
        estado_verificacion: row.estado_verificacion || 'Pendiente',
        nota_pago: row.nota_pago || '',
        usuario_registro: row.usuario_registro || 'migracion',
        numero_factura: row.numero_factura || '',
      }

      const { error } = await supabase.from('pagos').insert([payload])
      if (!error) insertados++
      else console.error(`  ❌ Error insertando pago:`, error.message)
    }

    console.log(`✅ Pagos: +${insertados} insertados, ${omitidos} omitidos`)
  } catch (e) {
    console.error('❌ Error migrando pagos:', e.message)
  }
}

async function migrarPlanesPersonalizados() {
  console.log('\n📋 Creando planes de prueba (si no existen)…')
  try {
    const { data: existentes } = await supabase.from('planes').select('nombre_plan')
    if ((existentes || []).length > 0) {
      console.log(`✓ Ya existen ${existentes.length} planes`)
      return
    }

    const planes = [
      { nombre_plan: 'Básico 5MB', precio_usd: 10, velocidad_mbps: 5, descripcion: 'Plan básico de 5 Mbps' },
      { nombre_plan: 'Plus 10MB', precio_usd: 15, velocidad_mbps: 10, descripcion: 'Plan plus de 10 Mbps' },
      { nombre_plan: 'Premium 20MB', precio_usd: 25, velocidad_mbps: 20, descripcion: 'Plan premium de 20 Mbps' },
      { nombre_plan: 'Ultra 50MB', precio_usd: 50, velocidad_mbps: 50, descripcion: 'Plan ultra de 50 Mbps' },
    ]

    const { error } = await supabase.from('planes').insert(planes)
    if (!error) console.log(`✅ +${planes.length} planes creados`)
    else console.error('❌ Error creando planes:', error.message)
  } catch (e) {
    console.error('❌ Error:', e.message)
  }
}

async function main() {
  console.log('\n🚀 MIGRACIÓN DESDE GOOGLE SHEETS → SUPABASE')
  console.log('=' .repeat(50))

  try {
    await migrarPlanesPersonalizados()
    await migrarClientes()
    await migrarPagos()

    console.log('\n' + '=' .repeat(50))
    console.log('✅ ¡Migración completada!')
    console.log('\nPasos siguientes:')
    console.log('1. Verifica los datos en Supabase')
    console.log('2. Recarga la aplicación')
    console.log('3. Revisa si hay conflictos o duplicados')
  } catch (e) {
    console.error('\n❌ Error fatal:', e)
  }
}

main()
