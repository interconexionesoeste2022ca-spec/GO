// scripts/importar-clientes.js
// Importa clientes desde Google Sheets a Supabase
// Uso: node scripts/importar-clientes.js

const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lboiiqgngygcocpdcwwt.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_KEY) {
  console.error('⚠ Falta SUPABASE_SERVICE_ROLE_KEY. Ejecuta con:')
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="tu-key"; node scripts/importar-clientes.js')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1dlG27ctJHSeBpgMAt7rQnZMJlvJxYKM3JOR2MFytyR4/gviz/tq?tqx=out:csv'

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  // Parse header
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

function parseHistorial(raw) {
  if (!raw || raw === '[]') return []
  try {
    // El CSV de Google escapa las comillas dobles como ""
    const fixed = raw.replace(/""/g, '"')
    return JSON.parse(fixed)
  } catch {
    return []
  }
}

async function main() {
  console.log('📥 Descargando datos del Sheet…')
  const res = await fetch(SHEET_CSV_URL)
  const text = await res.text()
  const rows = parseCSV(text)
  console.log(`📊 ${rows.length} filas encontradas`)

  // Obtener clientes existentes para evitar duplicados
  const { data: existentes } = await supabase.from('clientes').select('documento_identidad, nombre_razon_social')
  const existentesSet = new Set((existentes || []).map(c => c.documento_identidad?.toLowerCase()).filter(Boolean))
  const nombreSet = new Set((existentes || []).map(c => c.nombre_razon_social?.toLowerCase()).filter(Boolean))

  let insertados = 0
  let omitidos = 0
  let errores = 0

  for (const row of rows) {
    const nombre = (row.nombre_razon_social || '').trim()
    const doc = (row.documento_identidad || '').trim()
    
    if (!nombre) { omitidos++; continue }

    // Verificar duplicado por documento o nombre
    if (doc && existentesSet.has(doc.toLowerCase())) {
      console.log(`  ⏭ Omitido (doc duplicado): ${nombre} [${doc}]`)
      omitidos++
      continue
    }
    if (nombreSet.has(nombre.toLowerCase())) {
      console.log(`  ⏭ Omitido (nombre duplicado): ${nombre}`)
      omitidos++
      continue
    }

    const historial = parseHistorial(row.historial_cortes)

    const payload = {
      tipo_cliente:        row.tipo_cliente || 'No Fiscal',
      documento_identidad: doc || null,
      nombre_razon_social: nombre,
      direccion_ubicacion: row.direccion_ubicacion || null,
      telefono:            row.telefono || null,
      ip_mac_equipo:       row.ip_mac_equipo || null,
      plan_id:             row.plan_id ? parseInt(row.plan_id) : null,
      estado_servicio:     row.estado_servicio || 'Activo',
      fecha_instalacion:   row.fecha_instalacion || null,
      historial_cortes:    historial,
      equipo_propiedad:    row.equipo_propiedad || null,
      nro_contrato:        row.nro_contrato || null,
      observaciones:       row.observaciones || null,
      correo_electronico:  row.correo_electronico || null,
      zona_sector:         row.zona_sector || null,
      fecha_nacimiento:    row.fecha_nacimiento || null,
      referido_por:        row.referido_por || null,
    }

    const { error } = await supabase.from('clientes').insert([payload])
    if (error) {
      console.error(`  ❌ Error insertando ${nombre}: ${error.message}`)
      errores++
    } else {
      console.log(`  ✅ ${nombre} [${doc || 'sin doc'}]`)
      insertados++
      // Marcar como existente para no duplicar dentro del mismo batch
      if (doc) existentesSet.add(doc.toLowerCase())
      nombreSet.add(nombre.toLowerCase())
    }
  }

  console.log('\n' + '═'.repeat(50))
  console.log(`✅ Insertados: ${insertados}`)
  console.log(`⏭ Omitidos:   ${omitidos}`)
  console.log(`❌ Errores:    ${errores}`)
  console.log(`📊 Total:      ${rows.length}`)
}

main().catch(console.error)
