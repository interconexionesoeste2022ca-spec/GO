'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api, getSesion, tienePermiso, alertaExito, alertaError } from '@/lib/api'

const ESTADO_COLOR = {
  Activo:    { pin:'#16a34a', bg:'#dcfce7', txt:'#166534', ring:'#bbf7d0' },
  Cortado:   { pin:'#dc2626', bg:'#fee2e2', txt:'#991b1b', ring:'#fecaca' },
  Moroso:    { pin:'#d97706', bg:'#fef9c3', txt:'#854d0e', ring:'#fde68a' },
  Suspendido:{ pin:'#6b7280', bg:'#f1f5f9', txt:'#374151', ring:'#e2e8f0' },
}

// Iconos para diferentes tipos de ubicación
const ICON_TYPES = {
  cliente:   { color: '#16a34a', label: 'Cliente' },
  antena:    { color: '#2563eb', label: 'Antena 📡' },
  snack:     { color: '#f59e0b', label: 'Snack 🍔' },
}

// Barquisimeto, Venezuela
const BAR_LAT = 10.067
const BAR_LNG = -69.347

function makeSvgPin(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <filter id="sh" x="-30%" y="-10%" width="160%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000040"/>
      </filter>
      <path d="M16 1C7.715 1 1 7.715 1 16c0 11.25 15 25 15 25S31 27.25 31 16C31 7.715 24.285 1 16 1z"
        fill="${color}" stroke="white" stroke-width="2" filter="url(#sh)"/>
      <circle cx="16" cy="16" r="5.5" fill="white" opacity="0.95"/>
    </svg>
  `)}`
}

// Ícono de antena (torre)
function makeSvgAntena(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
      <filter id="sh" x="-30%" y="-10%" width="160%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000040"/>
      </filter>
      <rect x="14" y="6" width="4" height="20" fill="${color}" filter="url(#sh)"/>
      <circle cx="16" cy="4" r="3" fill="${color}"/>
      <line x1="16" y1="8" x2="9" y2="12" stroke="${color}" stroke-width="1" opacity="0.7"/>
      <line x1="16" y1="12" x2="9" y2="16" stroke="${color}" stroke-width="1" opacity="0.7"/>
      <line x1="16" y1="8" x2="23" y2="12" stroke="${color}" stroke-width="1" opacity="0.7"/>
      <line x1="16" y1="12" x2="23" y2="16" stroke="${color}" stroke-width="1" opacity="0.7"/>
      <rect x="10" y="28" width="12" height="8" rx="1" fill="${color}" opacity="0.9"/>
    </svg>
  `)}`
}

// Ícono de snack (comida)
function makeSvgSnack(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="36" viewBox="0 0 32 36">
      <filter id="sh" x="-30%" y="-10%" width="160%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000040"/>
      </filter>
      <path d="M6 12 L8 4 L24 4 L26 12 Z" fill="${color}" stroke="white" stroke-width="1.5" filter="url(#sh)"/>
      <rect x="4" y="12" width="24" height="14" rx="2" fill="${color}" stroke="white" stroke-width="1.5"/>
      <line x1="10" y1="12" x2="10" y2="26" stroke="white" stroke-width="1" opacity="0.5"/>
      <line x1="16" y1="12" x2="16" y2="26" stroke="white" stroke-width="1" opacity="0.5"/>
      <line x1="22" y1="12" x2="22" y2="26" stroke="white" stroke-width="1" opacity="0.5"/>
    </svg>
  `)}`
}

export default function MapaPage() {
  const sesion   = getSesion()
  const canWrite = tienePermiso(sesion?.rol, 'write')
  const mapRef   = useRef(null)
  const mapObj   = useRef(null)
  const markersRef = useRef([])
  const leafletRef = useRef(null)

  const [clientes, setClientes] = useState([])
  const [antenas,  setAntenas]  = useState([])
  const [snacks,   setSnacks]   = useState([])
  const [planes,   setPlanes]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [leafletReady, setLeafletReady] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtro,   setFiltro]   = useState('')
  const [selected, setSelected] = useState(null)
  const [selectedType, setSelectedType] = useState('cliente') // 'cliente' | 'antena' | 'snack'
  const [editCoord, setEditCoord] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [showMode, setShowMode] = useState('clientes') // 'clientes' | 'antenas' | 'snacks'

  // ─── Cargar datos ─────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [c, a, s, p] = await Promise.all([
        api.get('/api/clientes'),
        api.get('/api/antenas'),
        api.get('/api/snacks'),
        api.get('/api/planes')
      ])
      setClientes(c.data || [])
      setAntenas(a.data || [])
      setSnacks(s.data || [])
      setPlanes(p.data || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ─── Cargar Leaflet CSS+JS dinámicamente ───────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.L) { setLeafletReady(true); return }

    const link = document.createElement('link')
    link.rel  = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.onload = () => {
      leafletRef.current = window.L
      setLeafletReady(true)
    }
    document.head.appendChild(script)
  }, [])

  // ─── Inicializar mapa ──────────────────────────────────────────
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapObj.current) return
    const L = window.L

    const map = L.map(mapRef.current, {
      center: [BAR_LAT, BAR_LNG],
      zoom: 13,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // Click en mapa para reubicar cliente seleccionado
    map.on('click', (e) => {
      if (canWrite) {
        setEditCoord({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    })

    mapObj.current = map
  }, [leafletReady, canWrite])

  // ─── Dibujar markers ──────────────────────────────────────────
  useEffect(() => {
    if (!mapObj.current || !leafletReady || loading) return
    const L = window.L

    // Limpiar markers previos
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []

    // ─── CLIENTES ────────────────
    const conCoords = clientes.filter(c => c.latitud && c.longitud)
    conCoords.forEach(c => {
      const cfg  = ESTADO_COLOR[c.estado_servicio] || ESTADO_COLOR.Activo
      const plan = planes.find(p => p.id === c.plan_id)

      const icon = L.icon({
        iconUrl:    makeSvgPin(cfg.pin),
        iconSize:   [32, 42],
        iconAnchor: [16, 42],
        popupAnchor:[0, -44],
      })

      const marker = L.marker([Number(c.latitud), Number(c.longitud)], { icon, title: c.nombre_razon_social })

      marker.bindPopup(`
        <div style="font-family:Inter,system-ui,sans-serif;min-width:200px;padding:4px">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px">${c.nombre_razon_social}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:8px">${c.documento_identidad || ''}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
            <span style="background:${cfg.bg};color:${cfg.txt};padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${cfg.ring}">${c.estado_servicio}</span>
            ${plan ? `<span style="background:#dbeafe;color:#1e40af;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600">${plan.nombre_plan}</span>` : ''}
          </div>
          ${c.telefono ? `<div style="font-size:12px;color:#374151;margin-top:4px">📞 ${c.telefono}</div>` : ''}
          ${c.zona_sector ? `<div style="font-size:12px;color:#94a3b8">📍 ${c.zona_sector}</div>` : ''}
          ${c.direccion_ubicacion ? `<div style="font-size:11px;color:#64748b;margin-top:4px;font-style:italic">${c.direccion_ubicacion}</div>` : ''}
        </div>
      `, { maxWidth: 280 })

      marker.on('click', () => { setSelected(c); setSelectedType('cliente') })
      if (showMode === 'clientes') marker.addTo(mapObj.current)
      markersRef.current.push(marker)
    })

    // ─── ANTENAS ────────────────
    antenas.forEach(a => {
      const iconAddr = L.icon({
        iconUrl:    makeSvgAntena(ICON_TYPES.antena.color),
        iconSize:   [32, 40],
        iconAnchor: [16, 40],
        popupAnchor:[0, -42],
      })

      const marker = L.marker([Number(a.latitud), Number(a.longitud)], { 
        icon: iconAddr, 
        title: a.nombre,
        zIndexOffset: 100,
      })

      marker.bindPopup(`
        <div style="font-family:Inter,system-ui,sans-serif;min-width:200px;padding:4px">
          <div style="font-weight:700;font-size:13px;color:#2563eb;margin-bottom:4px">📡 ${a.nombre}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:6px">${a.ubicacion_descripcion || ''}</div>
          ${a.banda_frecuencia ? `<div style="font-size:11px;color:#334151">Banda: ${a.banda_frecuencia}</div>` : ''}
          ${a.alcance_approx_metros ? `<div style="font-size:11px;color:#334151">Alcance: ${a.alcance_approx_metros}m</div>` : ''}
          ${a.nota_tecnica ? `<div style="font-size:10px;color:#64748b;margin-top:4px;font-style:italic">${a.nota_tecnica}</div>` : ''}
        </div>
      `, { maxWidth: 260 })

      marker.on('click', () => { setSelected(a); setSelectedType('antena') })
      if (showMode === 'antenas') marker.addTo(mapObj.current)
      markersRef.current.push(marker)
    })

    // ─── SNACKS ────────────────
    snacks.forEach(s => {
      const iconAddr = L.icon({
        iconUrl:    makeSvgSnack(ICON_TYPES.snack.color),
        iconSize:   [32, 36],
        iconAnchor: [16, 36],
        popupAnchor:[0, -38],
      })

      const marker = L.marker([Number(s.latitud), Number(s.longitud)], { 
        icon: iconAddr, 
        title: s.nombre,
        zIndexOffset: 100,
      })

      marker.bindPopup(`
        <div style="font-family:Inter,system-ui,sans-serif;min-width:200px;padding:4px">
          <div style="font-weight:700;font-size:13px;color:#f59e0b;margin-bottom:4px">🍔 ${s.nombre}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:6px">${s.ubicacion_descripcion || ''}</div>
          ${s.contacto_telefono ? `<div style="font-size:11px;color:#334151">📞 ${s.contacto_telefono}</div>` : ''}
          ${s.horario_atencion ? `<div style="font-size:11px;color:#334151">⏰ ${s.horario_atencion}</div>` : ''}
          ${s.nota_especial ? `<div style="font-size:10px;color:#64748b;margin-top:4px">${s.nota_especial}</div>` : ''}
        </div>
      `, { maxWidth: 260 })

      marker.on('click', () => { setSelected(s); setSelectedType('snack') })
      if (showMode === 'snacks') marker.addTo(mapObj.current)
      markersRef.current.push(marker)
    })

    // Ajustar bounds si hay markers visibles
    const markersVisibles = markersRef.current.filter(m => m._map === mapObj.current)
    if (markersVisibles.length > 0) {
      const group = L.featureGroup(markersVisibles)
      mapObj.current.fitBounds(group.getBounds().pad(0.15))
    }
  }, [clientes, antenas, snacks, planes, leafletReady, loading, showMode])

  // ─── Guardar coordenadas ───────────────────────────────────────
  async function guardarUbicacion() {
    if (!selected || !editCoord) return
    setSaving(true)
    try {
      if (selectedType === 'cliente') {
        await api.patch('/api/clientes', {
          id: selected.id,
          latitud:  editCoord.lat,
          longitud: editCoord.lng,
        })
        await alertaExito('Ubicación guardada', `${selected.nombre_razon_social} ubicado correctamente`)
      } else if (selectedType === 'antena') {
        await api.patch('/api/antenas', {
          id: selected.id,
          latitud:  editCoord.lat,
          longitud: editCoord.lng,
        })
        await alertaExito('Antena reubicada', `${selected.nombre} movida correctamente`)
      } else if (selectedType === 'snack') {
        await api.patch('/api/snacks', {
          id: selected.id,
          latitud:  editCoord.lat,
          longitud: editCoord.lng,
        })
        await alertaExito('Snack reubicado', `${selected.nombre} movido correctamente`)
      }
      setEditCoord(null)
      setSelected(null)
      await cargar()
    } catch(e) { await alertaError('Error', e.message) }
    finally { setSaving(false) }
  }

  // Eliminar ubicación
  async function eliminarUbicacion() {
    if (!selected || !confirm('¿Estás seguro de que deseas eliminar esta ubicación?')) return
    setSaving(true)
    try {
      if (selectedType === 'antena') {
        await api.delete(`/api/antenas?id=${selected.id}`)
        await alertaExito('Antena eliminada')
      } else if (selectedType === 'snack') {
        await api.delete(`/api/snacks?id=${selected.id}`)
        await alertaExito('Snack eliminado')
      }
      setSelected(null)
      await cargar()
    } catch(e) { await alertaError('Error', e.message) }
    finally { setSaving(false) }
  }

  // Mover mapa a un cliente de la lista
  function volarA(c) {
    if (!mapObj.current || !c.latitud) return
    mapObj.current.flyTo([Number(c.latitud), Number(c.longitud)], 16, { duration: 1 })
    setSelected(c)
  }

  const sinUbicacion  = clientes.filter(c => !c.latitud || !c.longitud)
  const conUbicacion  = clientes.filter(c => c.latitud && c.longitud)
  const filtradosSin  = sinUbicacion.filter(c => {
    const q = busqueda.toLowerCase()
    return (!q || c.nombre_razon_social?.toLowerCase().includes(q)) &&
           (!filtro || c.estado_servicio === filtro)
  })

  // Estadísticas por estado (solo clientes)
  const statsPorEstado = Object.entries(ESTADO_COLOR).map(([estado, cfg]) => ({
    estado, cfg,
    total: clientes.filter(c => c.estado_servicio === estado).length
  })).filter(s => s.total > 0)

  return (
    <div>
      {/* ── Estilos Leaflet override ─────────────────────────────── */}
      <style>{`
        .leaflet-container { font-family: Inter, system-ui, sans-serif; border-radius: 16px; }
        .leaflet-popup-content-wrapper { border-radius: 14px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important; border: 1px solid #e2e8f0; }
        .leaflet-popup-tip-container { display: none; }
        .leaflet-control-attribution { font-size: 10px !important; }
        .leaflet-control-zoom a { border-radius: 8px !important; }
        .gn-map-selected-banner {
          position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
          background: #0f172a; color: #fff; border-radius: 10px;
          padding: 8px 18px; font-size: 12px; font-weight: 500;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3); white-space: nowrap;
          z-index: 800; pointer-events: none;
        }
      `}</style>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, height:'calc(100vh - 130px)', minHeight:500 }}>

        {/* ── Mapa ──────────────────────────────────────────────── */}
        <div style={{ position:'relative', borderRadius:16, overflow:'hidden', border:'1px solid #e2e8f0', boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
          <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

          {/* Banner de edición/modo */}
          {selected && canWrite && editCoord ? (
            <div className="gn-map-selected-banner">
              📍 Nueva posición seleccionada — guarda o cancela abajo
            </div>
          ) : selected && canWrite && selectedType === 'cliente' ? (
            <div className="gn-map-selected-banner">
              🖱️ {selected.nombre_razon_social} — haz clic en el mapa para mover
            </div>
          ) : null}

          {/* Botones de modo (arriba) */}
          <div style={{
            position:'absolute', top:14, left:12, zIndex:500,
            display:'flex', gap:6, flexDirection: 'row',
            background:'rgba(255,255,255,0.96)', borderRadius:10,
            padding:'6px', boxShadow:'0 2px 12px rgba(0,0,0,0.12)',
            border:'1px solid #e2e8f0', backdropFilter:'blur(4px)',
          }}>
            <button 
              onClick={() => { setShowMode('clientes'); setSelected(null) }}
              style={{
                padding:'6px 12px', fontSize:11, fontWeight:600, borderRadius:8, border: 'none',
                background: showMode === 'clientes' ? '#16a34a' : '#e2e8f0',
                color: showMode === 'clientes' ? '#fff' : '#334155',
                cursor: 'pointer', transition: 'all .2s'
              }}>
              👥 Clientes
            </button>
            <button 
              onClick={() => { setShowMode('antenas'); setSelected(null) }}
              style={{
                padding:'6px 12px', fontSize:11, fontWeight:600, borderRadius:8, border: 'none',
                background: showMode === 'antenas' ? '#2563eb' : '#e2e8f0',
                color: showMode === 'antenas' ? '#fff' : '#334155',
                cursor: 'pointer', transition: 'all .2s'
              }}>
              📡 Antenas
            </button>
            <button 
              onClick={() => { setShowMode('snacks'); setSelected(null) }}
              style={{
                padding:'6px 12px', fontSize:11, fontWeight:600, borderRadius:8, border: 'none',
                background: showMode === 'snacks' ? '#f59e0b' : '#e2e8f0',
                color: showMode === 'snacks' ? '#fff' : '#334155',
                cursor: 'pointer', transition: 'all .2s'
              }}>
              🍔 Snacks
            </button>
          </div>

          {/* Leyenda */}
          <div style={{
            position:'absolute', bottom:24, left:12, zIndex:500,
            background:'rgba(255,255,255,0.96)', borderRadius:12,
            padding:'10px 14px', boxShadow:'0 2px 12px rgba(0,0,0,0.12)',
            border:'1px solid #e2e8f0', backdropFilter:'blur(4px)',
          }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>
              Leyenda {showMode === 'clientes' ? '(Estado)' : ''}
            </div>
            {showMode === 'clientes' ? (
              Object.entries(ESTADO_COLOR).map(([estado, cfg]) => (
                <div key={estado} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginBottom:5, color:'#334155' }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:cfg.pin, flexShrink:0, boxShadow:`0 0 0 2px ${cfg.ring}` }} />
                  <span style={{ fontWeight:500 }}>{estado}</span>
                </div>
              ))
            ) : showMode === 'antenas' ? (
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#334155' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#2563eb', flexShrink:0 }} />
                <span style={{ fontWeight:500 }}>Torres de transmisión</span>
              </div>
            ) : (
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#334155' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:'#f59e0b', flexShrink:0 }} />
                <span style={{ fontWeight:500 }}>Puntos de venta</span>
              </div>
            )}
          </div>

          {/* Cargando overlay */}
          {!leafletReady && (
            <div style={{
              position:'absolute', inset:0, display:'flex', alignItems:'center',
              justifyContent:'center', background:'#f6f8fa', zIndex:600,
            }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ width:36, height:36, border:'3px solid #e2e8f0', borderTop:'3px solid #16a34a', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto 16px' }} />
                <div style={{ fontSize:14, color:'#64748b' }}>Cargando mapa…</div>
              </div>
            </div>
          )}
        </div>

        {/* ── Panel lateral ─────────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:12, overflow:'hidden' }}>

          {/* Stats por estado (solo para clientes) */}
          {showMode === 'clientes' && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Resumen</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'.7px', marginBottom:4 }}>En mapa</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:22, color:'#16a34a', fontWeight:700 }}>{conUbicacion.length}</div>
                </div>
                <div style={{ background:'#fef9c3', border:'1px solid #fde68a', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ fontSize:10, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:'.7px', marginBottom:4 }}>Sin ubicar</div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:22, color:'#d97706', fontWeight:700 }}>{sinUbicacion.length}</div>
                </div>
              </div>
              {statsPorEstado.map(({ estado, cfg, total }) => (
                <div key={estado} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 0' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, color:'#334155' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.pin }} />
                    {estado}
                  </div>
                  <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:700, color:cfg.txt, background:cfg.bg, padding:'1px 8px', borderRadius:10 }}>{total}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stats para antenas */}
          {showMode === 'antenas' && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Antenas</div>
              <div style={{ fontSize:12, color:'#334155' }}>
                <div style={{ fontWeight:600, marginBottom:4 }}>Total en mapa: <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'#2563eb' }}>{antenas.length}</span></div>
                <div style={{ fontSize:11, color:'#64748b' }}>Haz clic en una antena para ver detalles</div>
              </div>
            </div>
          )}

          {/* Stats para snacks */}
          {showMode === 'snacks' && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Snacks</div>
              <div style={{ fontSize:12, color:'#334155' }}>
                <div style={{ fontWeight:600, marginBottom:4 }}>Total en mapa: <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'#f59e0b' }}>{snacks.length}</span></div>
                <div style={{ fontSize:11, color:'#64748b' }}>Haz clic en un snack para ver detalles</div>
              </div>
            </div>
          )}

          {/* Panel elemento seleccionado */}
          {selected && (
            <div style={{ 
              background: selectedType === 'cliente' ? '#f0fdf4' : selectedType === 'antena' ? '#eff6ff' : '#fef7ec', 
              border: selectedType === 'cliente' ? '1px solid #bbf7d0' : selectedType === 'antena' ? '1px solid #bfdbfe' : '1px solid #fedba8', 
              borderRadius:12, padding:14, flexShrink:0 
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', lineHeight:1.3 }}>
                  {selectedType === 'cliente' ? selected.nombre_razon_social : selected.nombre}
                </div>
                <button onClick={() => { setSelected(null); setEditCoord(null) }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:16, lineHeight:1, padding:0 }}>✕</button>
              </div>
              
              {selectedType === 'cliente' && (
                <>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:10 }}>
                    {selected.documento_identidad && <span>{selected.documento_identidad} · </span>}
                    <span style={{ color: ESTADO_COLOR[selected.estado_servicio]?.txt || '#64748b', fontWeight:600 }}>{selected.estado_servicio}</span>
                  </div>
                  {editCoord ? (
                    <div>
                      <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#16a34a', marginBottom:10, background:'#fff', borderRadius:8, padding:'6px 10px', border:'1px solid #bbf7d0' }}>
                        Lat: {editCoord.lat.toFixed(6)}<br/>
                        Lon: {editCoord.lng.toFixed(6)}
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-primary btn-sm" onClick={guardarUbicacion} disabled={saving} style={{ fontSize:11, flex:1 }}>
                          {saving ? 'Guardando…' : '💾 Guardar'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditCoord(null)} style={{ fontSize:11, flex:1 }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {selected.latitud && (
                        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'#64748b', marginBottom:8 }}>
                          {Number(selected.latitud).toFixed(5)}, {Number(selected.longitud).toFixed(5)}
                        </div>
                      )}
                      {canWrite && (
                        <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center', fontSize:11 }}
                          onClick={() => setEditCoord(selected.latitud ? { lat: Number(selected.latitud), lng: Number(selected.longitud) } : null)}>
                          📍 {selected.latitud ? 'Mover pin' : 'Ubicar'}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {selectedType === 'antena' && (
                <>
                  {selected.ubicacion_descripcion && (
                    <div style={{ fontSize:11, color:'#64748b', marginBottom:6 }}>{selected.ubicacion_descripcion}</div>
                  )}
                  {selected.banda_frecuencia && (
                    <div style={{ fontSize:11, color:'#334151', marginBottom:4 }}>📡 Banda: {selected.banda_frecuencia}</div>
                  )}
                  {selected.alcance_approx_metros && (
                    <div style={{ fontSize:11, color:'#334151', marginBottom:4 }}>📏 Alcance: {selected.alcance_approx_metros}m</div>
                  )}
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'#64748b', marginBottom:8 }}>
                    {Number(selected.latitud).toFixed(5)}, {Number(selected.longitud).toFixed(5)}
                  </div>
                  {canWrite && (
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize:11, flex:1 }} onClick={() => setEditCoord({ lat: Number(selected.latitud), lng: Number(selected.longitud) })}>
                        📍 Mover
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize:11, flex:1, color:'#dc2626' }} onClick={eliminarUbicacion} disabled={saving}>
                        🗑️ Eliminar
                      </button>
                    </div>
                  )}
                </>
              )}

              {selectedType === 'snack' && (
                <>
                  {selected.ubicacion_descripcion && (
                    <div style={{ fontSize:11, color:'#64748b', marginBottom:6 }}>{selected.ubicacion_descripcion}</div>
                  )}
                  {selected.contacto_telefono && (
                    <div style={{ fontSize:11, color:'#334151', marginBottom:4 }}>📞 {selected.contacto_telefono}</div>
                  )}
                  {selected.horario_atencion && (
                    <div style={{ fontSize:11, color:'#334151', marginBottom:4 }}>⏰ {selected.horario_atencion}</div>
                  )}
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'#64748b', marginBottom:8 }}>
                    {Number(selected.latitud).toFixed(5)}, {Number(selected.longitud).toFixed(5)}
                  </div>
                  {canWrite && (
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize:11, flex:1 }} onClick={() => setEditCoord({ lat: Number(selected.latitud), lng: Number(selected.longitud) })}>
                        📍 Mover
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize:11, flex:1, color:'#dc2626' }} onClick={eliminarUbicacion} disabled={saving}>
                        🗑️ Eliminar
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Lista sin ubicación (solo clientes) */}
          {showMode === 'clientes' && (
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, flex:1, overflow:'hidden', display:'flex', flexDirection:'column', minHeight:0 }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid #f1f5f9', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>Sin ubicar</div>
                <span style={{ fontSize:11, color:'#d97706', fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{sinUbicacion.length}</span>
              </div>
              <div style={{ display:'flex', gap:6, flexDirection:'column' }}>
                <input className="input" style={{ fontSize:12, padding:'7px 10px' }} placeholder="Buscar…"
                  value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                <select className="select" style={{ fontSize:12, padding:'7px 10px' }}
                  value={filtro} onChange={e => setFiltro(e.target.value)}>
                  <option value="">Todos los estados</option>
                  {Object.keys(ESTADO_COLOR).map(e => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              {loading ? (
                <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Cargando…</div>
              ) : filtradosSin.length === 0 ? (
                <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>
                  {sinUbicacion.length === 0 ? '✓ Todos los clientes están en el mapa' : 'Sin resultados'}
                </div>
              ) : filtradosSin.map(c => {
                const cfg = ESTADO_COLOR[c.estado_servicio] || ESTADO_COLOR.Activo
                return (
                  <div key={c.id}
                    style={{
                      padding:'10px 14px', borderBottom:'1px solid #f8fafc',
                      cursor: canWrite ? 'pointer' : 'default',
                      background: selected?.id === c.id ? '#f0fdf4' : 'transparent',
                      transition:'background .15s',
                    }}
                    onClick={() => { if (canWrite) { setSelected(c); setEditCoord(null) } }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:6 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#0f172a', lineHeight:1.3 }}>{c.nombre_razon_social}</div>
                      <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:10, background:cfg.bg, color:cfg.txt, flexShrink:0 }}>
                        {c.estado_servicio}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{c.zona_sector || 'Sin zona'}</div>
                    {canWrite && selected?.id === c.id && !editCoord && (
                      <div style={{ fontSize:11, color:'#16a34a', marginTop:4, fontWeight:600 }}>
                        → Haz clic en el mapa para fijar ubicación
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Botón centrar en Barquisimeto */}
          <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', fontSize:12 }}
            onClick={() => mapObj.current?.flyTo([BAR_LAT, BAR_LNG], 13, { duration: 1.2 })}>
            🏙️ Centrar en Barquisimeto
          </button>
        </div>
      </div>
    </div>
  )
}