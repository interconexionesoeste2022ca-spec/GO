'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api, getSesion, tienePermiso, alertaExito, alertaError } from '@/lib/api'

const ESTADO_COLOR = {
  Activo:    { pin:'#16a34a', bg:'#dcfce7', txt:'#166534', ring:'#bbf7d0' },
  Cortado:   { pin:'#dc2626', bg:'#fee2e2', txt:'#991b1b', ring:'#fecaca' },
  Moroso:    { pin:'#d97706', bg:'#fef9c3', txt:'#854d0e', ring:'#fde68a' },
  Suspendido:{ pin:'#6b7280', bg:'#f1f5f9', txt:'#374151', ring:'#e2e8f0' },
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

export default function MapaPage() {
  const sesion   = getSesion()
  const canWrite = tienePermiso(sesion?.rol, 'write')
  const mapRef   = useRef(null)
  const mapObj   = useRef(null)
  const markersRef = useRef([])
  const leafletRef = useRef(null)

  const [clientes, setClientes] = useState([])
  const [planes,   setPlanes]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [leafletReady, setLeafletReady] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtro,   setFiltro]   = useState('')
  const [selected, setSelected] = useState(null)
  const [editCoord, setEditCoord] = useState(null)
  const [saving,   setSaving]   = useState(false)

  // ─── Cargar datos ─────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([api.get('/api/clientes'), api.get('/api/planes')])
      setClientes(c.data || [])
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

      marker.on('click', () => setSelected(c))
      marker.addTo(mapObj.current)
      markersRef.current.push(marker)
    })

    // Ajustar bounds si hay markers
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current)
      mapObj.current.fitBounds(group.getBounds().pad(0.15))
    }
  }, [clientes, planes, leafletReady, loading])

  // ─── Guardar coordenadas ───────────────────────────────────────
  async function guardarUbicacion() {
    if (!selected || !editCoord) return
    setSaving(true)
    try {
      await api.patch('/api/clientes', {
        id: selected.id,
        latitud:  editCoord.lat,
        longitud: editCoord.lng,
      })
      await alertaExito('Ubicación guardada', `${selected.nombre_razon_social} ubicado correctamente`)
      setEditCoord(null)
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

  // Estadísticas por estado
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

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, height:'calc(100vh - 130px)', minHeight:500 }}>

        {/* ── Mapa ──────────────────────────────────────────────── */}
        <div style={{ position:'relative', borderRadius:16, overflow:'hidden', border:'1px solid #e2e8f0', boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
          <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

          {/* Banner de edición */}
          {selected && canWrite && editCoord ? (
            <div className="gn-map-selected-banner">
              📍 Nueva posición seleccionada — guarda o cancela abajo
            </div>
          ) : selected && canWrite ? (
            <div className="gn-map-selected-banner">
              🖱️ {selected.nombre_razon_social} — haz clic en el mapa para mover
            </div>
          ) : null}

          {/* Leyenda */}
          <div style={{
            position:'absolute', bottom:24, left:12, zIndex:500,
            background:'rgba(255,255,255,0.96)', borderRadius:12,
            padding:'10px 14px', boxShadow:'0 2px 12px rgba(0,0,0,0.12)',
            border:'1px solid #e2e8f0', backdropFilter:'blur(4px)',
          }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:8 }}>Estado</div>
            {Object.entries(ESTADO_COLOR).map(([estado, cfg]) => (
              <div key={estado} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, marginBottom:5, color:'#334155' }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:cfg.pin, flexShrink:0, boxShadow:`0 0 0 2px ${cfg.ring}` }} />
                <span style={{ fontWeight:500 }}>{estado}</span>
              </div>
            ))}
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

          {/* Stats por estado */}
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

          {/* Panel cliente seleccionado */}
          {selected && (
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:14, flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', lineHeight:1.3 }}>{selected.nombre_razon_social}</div>
                <button onClick={() => { setSelected(null); setEditCoord(null) }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:16, lineHeight:1, padding:0 }}>✕</button>
              </div>
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
                    <button className="btn btn-primary btn-sm" onClick={guardarUbicacion} disabled={saving}>
                      {saving ? 'Guardando…' : '💾 Guardar ubicación'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditCoord(null)}>Cancelar</button>
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
                    <button className="btn btn-ghost btn-sm" style={{ width:'100%', justifyContent:'center' }}
                      onClick={() => setEditCoord(selected.latitud ? { lat: Number(selected.latitud), lng: Number(selected.longitud) } : null)}>
                      📍 {selected.latitud ? 'Mover pin en mapa' : 'Haz clic en el mapa para ubicar'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Lista sin ubicación */}
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