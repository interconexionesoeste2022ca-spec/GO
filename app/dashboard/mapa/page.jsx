'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api, getSesion, tienePermiso, alertaExito, alertaError } from '@/lib/api'

const ESTADO_COLOR = {
  Activo:    { pin:'#16a34a', bg:'#dcfce7', txt:'#166534' },
  Cortado:   { pin:'#dc2626', bg:'#fee2e2', txt:'#991b1b' },
  Moroso:    { pin:'#d97706', bg:'#fef9c3', txt:'#854d0e' },
  Suspendido:{ pin:'#6b7280', bg:'#f1f5f9', txt:'#374151' },
}

export default function MapaPage() {
  const sesion    = getSesion()
  const canWrite  = tienePermiso(sesion?.rol, 'write')
  const mapRef    = useRef(null)
  const mapObj    = useRef(null)
  const markers   = useRef([])
  const infoWin   = useRef(null)

  const [clientes, setClientes]   = useState([])
  const [planes,   setPlanes]     = useState([])
  const [loading,  setLoading]    = useState(true)
  const [filtro,   setFiltro]     = useState('')
  const [busqueda, setBusqueda]   = useState('')
  const [selected, setSelected]   = useState(null)
  const [editCoord, setEditCoord] = useState(null) // { lat, lng }
  const [saving,   setSaving]     = useState(false)
  const [mapsReady, setMapsReady] = useState(false)
  const [apiKey,   setApiKey]     = useState('')

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

  // Cargar Google Maps
  function loadMap(key) {
    if (!key.trim()) { alertaError('Clave requerida', 'Ingresa tu Google Maps API Key'); return }
    setApiKey(key.trim())
    if (window.google?.maps) { setMapsReady(true); return }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key.trim()}&language=es`
    script.async = true
    script.onload = () => setMapsReady(true)
    script.onerror = () => alertaError('Error', 'No se pudo cargar Google Maps. Verifica la API key.')
    document.head.appendChild(script)
  }

  // Inicializar mapa
  useEffect(() => {
    if (!mapsReady || !mapRef.current || mapObj.current) return
    mapObj.current = new window.google.maps.Map(mapRef.current, {
      zoom: 13,
      center: { lat: 10.48, lng: -66.87 }, // Venezuela por defecto
      mapTypeId: 'roadmap',
      styles: [
        { featureType:'poi', elementType:'labels', stylers:[{visibility:'off'}] },
        { featureType:'transit', elementType:'labels', stylers:[{visibility:'off'}] },
      ],
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: false,
    })

    infoWin.current = new window.google.maps.InfoWindow()

    // Click en mapa para reubicar cliente seleccionado
    mapObj.current.addListener('click', (e) => {
      if (selected && canWrite) {
        setEditCoord({ lat: e.latLng.lat(), lng: e.latLng.lng() })
      }
    })
  }, [mapsReady])

  // Dibujar markers cuando cambian clientes o mapa está listo
  useEffect(() => {
    if (!mapObj.current || !mapsReady) return

    // Limpiar markers anteriores
    markers.current.forEach(m => m.setMap(null))
    markers.current = []

    const conCoordenadas = clientes.filter(c => c.latitud && c.longitud)
    const cfg = ESTADO_COLOR

    conCoordenadas.forEach(c => {
      const col = cfg[c.estado_servicio]?.pin || '#6b7280'
      const plan = planes.find(p => p.id === c.plan_id)

      // SVG pin personalizado
      const svgPin = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.163 0 0 7.163 0 16c0 10 16 24 16 24S32 26 32 16C32 7.163 24.837 0 16 0z"
            fill="${col}" stroke="white" stroke-width="2"/>
          <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
        </svg>`

      const marker = new window.google.maps.Marker({
        position: { lat: Number(c.latitud), lng: Number(c.longitud) },
        map: mapObj.current,
        title: c.nombre_razon_social,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgPin)}`,
          scaledSize: new window.google.maps.Size(32, 40),
          anchor: new window.google.maps.Point(16, 40),
        }
      })

      marker.addListener('click', () => {
        setSelected(c)
        setEditCoord(null)
        infoWin.current.setContent(`
          <div style="font-family:Inter,sans-serif;padding:4px;min-width:200px;">
            <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px">${c.nombre_razon_social}</div>
            <div style="font-size:12px;color:#64748b;margin-bottom:8px">${c.documento_identidad || ''}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <span style="background:${cfg[c.estado_servicio]?.bg};color:${cfg[c.estado_servicio]?.txt};padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${c.estado_servicio}</span>
              ${plan ? `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600">${plan.nombre_plan}</span>` : ''}
            </div>
            ${c.telefono ? `<div style="font-size:12px;color:#374151;margin-top:8px">📞 ${c.telefono}</div>` : ''}
            ${c.zona_sector ? `<div style="font-size:12px;color:#94a3b8">📍 ${c.zona_sector}</div>` : ''}
          </div>
        `)
        infoWin.current.open(mapObj.current, marker)
      })

      markers.current.push(marker)
    })

    // Si hay markers, centrar el mapa en ellos
    if (markers.current.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      conCoordenadas.forEach(c => bounds.extend({ lat: Number(c.latitud), lng: Number(c.longitud) }))
      mapObj.current.fitBounds(bounds)
    }
  }, [clientes, planes, mapsReady])

  // Guardar coordenadas del cliente seleccionado
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

  // Clientes sin ubicación
  const sinUbicacion   = clientes.filter(c => !c.latitud || !c.longitud)
  const conUbicacion   = clientes.filter(c => c.latitud && c.longitud)
  const filtradosSin   = sinUbicacion.filter(c => {
    const q = busqueda.toLowerCase()
    return (!q || c.nombre_razon_social?.toLowerCase().includes(q)) &&
           (!filtro || c.estado_servicio === filtro)
  })

  const [localKey, setLocalKey] = useState('')

  if (!mapsReady) return (
    <div>
      <div className="card" style={{ maxWidth:480, margin:'40px auto', textAlign:'center', padding:'40px 36px' }}>
        <div style={{ fontSize:36, marginBottom:16 }}>🗺️</div>
        <div style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:8 }}>Mapa de clientes</div>
        <div style={{ fontSize:13, color:'#94a3b8', marginBottom:24, lineHeight:1.6 }}>
          Para usar el mapa necesitas una <strong>Google Maps API Key</strong> gratuita.<br/>
          Ve a <a href="https://console.cloud.google.com/apis/credentials" target="_blank"
            rel="noopener noreferrer" style={{ color:'#16a34a' }}>console.cloud.google.com</a>,
          crea una clave con acceso a Maps JavaScript API y pégala aquí.
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <input className="input" placeholder="AIzaSy..." value={localKey}
            onChange={e => setLocalKey(e.target.value)}
            onKeyDown={e => e.key==='Enter' && loadMap(localKey)} />
          <button className="btn btn-primary" onClick={() => loadMap(localKey)}>
            Cargar mapa
          </button>
        </div>
        <div style={{ fontSize:11, color:'#cbd5e1', marginTop:12 }}>
          La clave se usa solo en tu navegador y no se almacena en el servidor.
        </div>
        {/* Stats sin mapa */}
        {!loading && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:28 }}>
            <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.8px', marginBottom:6 }}>Con ubicación</div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:26, color:'#16a34a', fontWeight:600 }}>{conUbicacion.length}</div>
            </div>
            <div style={{ background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.8px', marginBottom:6 }}>Sin ubicación</div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:26, color:'#d97706', fontWeight:600 }}>{sinUbicacion.length}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, height:'calc(100vh - 130px)', minHeight:500 }}>

        {/* Mapa */}
        <div style={{ position:'relative', borderRadius:16, overflow:'hidden', border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

          {/* Leyenda */}
          <div style={{
            position:'absolute', bottom:16, left:16,
            background:'#fff', borderRadius:12, padding:'10px 14px',
            boxShadow:'0 2px 12px rgba(0,0,0,0.15)', border:'1px solid #e2e8f0',
            display:'flex', flexDirection:'column', gap:6,
          }}>
            {Object.entries(ESTADO_COLOR).map(([estado, cfg]) => (
              <div key={estado} style={{ display:'flex', alignItems:'center', gap:7, fontSize:12 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:cfg.pin, flexShrink:0 }} />
                <span style={{ color:'#334155', fontWeight:500 }}>{estado}</span>
              </div>
            ))}
          </div>

          {/* Banner editar coordenada */}
          {selected && canWrite && (
            <div style={{
              position:'absolute', top:12, left:'50%', transform:'translateX(-50%)',
              background:'#0f172a', color:'#fff', borderRadius:10,
              padding:'8px 16px', fontSize:12, fontWeight:500,
              boxShadow:'0 4px 16px rgba(0,0,0,0.3)', whiteSpace:'nowrap',
            }}>
              {editCoord
                ? `📍 Click en "${selected.nombre_razon_social}" para reubicar`
                : `Seleccionado: ${selected.nombre_razon_social} — haz clic en el mapa para mover`}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div style={{ display:'flex', flexDirection:'column', gap:14, overflow:'hidden' }}>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.8px', marginBottom:4 }}>Con ubicación</div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:20, color:'#16a34a', fontWeight:600 }}>{conUbicacion.length}</div>
            </div>
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ fontSize:10, color:'#94a3b8', fontWeight:600, textTransform:'uppercase', letterSpacing:'.8px', marginBottom:4 }}>Sin ubicar</div>
              <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:20, color:'#d97706', fontWeight:600 }}>{sinUbicacion.length}</div>
            </div>
          </div>

          {/* Cliente seleccionado / editar coord */}
          {selected && (
            <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', marginBottom:4 }}>{selected.nombre_razon_social}</div>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:10 }}>{selected.documento_identidad} · {selected.estado_servicio}</div>
              {editCoord ? (
                <div>
                  <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#16a34a', marginBottom:10 }}>
                    Lat: {editCoord.lat.toFixed(6)}<br/>
                    Lon: {editCoord.lng.toFixed(6)}
                  </div>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-primary btn-sm" onClick={guardarUbicacion} disabled={saving}>
                      {saving ? 'Guardando…' : '💾 Guardar'}
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
                  <div style={{ display:'flex', gap:6 }}>
                    {canWrite && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditCoord(null)}>
                        📍 {selected.latitud ? 'Mover pin' : 'Haz clic en el mapa'}
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(null); infoWin.current?.close() }}>✕</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Lista clientes sin ubicación */}
          <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'12px 14px', borderBottom:'1px solid #f1f5f9' }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#0f172a', marginBottom:8 }}>Sin ubicar ({sinUbicacion.length})</div>
              <input className="input" style={{ fontSize:12 }} placeholder="Buscar…"
                value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              {loading ? (
                <div style={{ padding:24, textAlign:'center', color:'#94a3b8' }}>Cargando…</div>
              ) : filtradosSin.length === 0 ? (
                <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:13 }}>
                  {sinUbicacion.length === 0 ? '✓ Todos los clientes tienen ubicación' : 'Sin resultados'}
                </div>
              ) : (
                filtradosSin.map(c => {
                  const cfg = ESTADO_COLOR[c.estado_servicio] || ESTADO_COLOR.Activo
                  return (
                    <div key={c.id}
                      style={{
                        padding:'10px 14px', borderBottom:'1px solid #f8fafc',
                        cursor: canWrite ? 'pointer' : 'default',
                        background: selected?.id === c.id ? '#f0fdf4' : 'transparent',
                        transition:'background .15s',
                      }}
                      onClick={() => canWrite && setSelected(c)}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'#0f172a' }}>{c.nombre_razon_social}</div>
                        <span style={{ fontSize:10, fontWeight:600, padding:'1px 7px', borderRadius:10, background:cfg.bg, color:cfg.txt }}>
                          {c.estado_servicio}
                        </span>
                      </div>
                      <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{c.zona_sector || 'Sin zona'}</div>
                      {canWrite && selected?.id === c.id && !editCoord && (
                        <div style={{ fontSize:11, color:'#16a34a', marginTop:4, fontWeight:500 }}>
                          → Haz clic en el mapa para fijar ubicación
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}