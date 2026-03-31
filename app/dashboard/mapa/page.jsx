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
  cliente:   { color: '#16a34a', label: 'Clientes' },
  antena:    { color: '#2563eb', label: 'Antenas' },
  punto_ref: { color: '#f59e0b', label: 'Puntos de Referencia' },
}

// Barquisimeto, Venezuela
const BAR_LAT = 10.067
const BAR_LNG = -69.347

// ─── Función para calcular distancia entre 2 puntos (Haversine) ───
function calcularDistancia(lat1, lon1, lat2, lon2) {
  const R = 6371000 // Radio de la Tierra en metros
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c // Distancia en metros
}

// ─── Función para calcular distancia total de una ruta ───
function calcularDistanciaRuta(puntos) {
  let total = 0
  for (let i = 0; i < puntos.length - 1; i++) {
    const [lat1, lon1] = puntos[i]
    const [lat2, lon2] = puntos[i + 1]
    total += calcularDistancia(lat1, lon1, lat2, lon2)
  }
  return total
}

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

// Ícono de cliente CON ALERTA (tiene reportes abiertos)
function makeSvgPinAlerta(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
      <filter id="sh" x="-30%" y="-10%" width="160%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000040"/>
      </filter>
      <path d="M18 1C8.715 1 2 7.715 2 16c0 11.25 16 25 16 25S34 27.25 34 16C34 7.715 27.285 1 18 1z"
        fill="${color}" stroke="white" stroke-width="2" filter="url(#sh)"/>
      <circle cx="18" cy="16" r="5.5" fill="white" opacity="0.95"/>
      <!-- Alerta roja -->
      <circle cx="28" cy="6" r="6.5" fill="#dc2626" stroke="white" stroke-width="2"/>
      <text x="28" y="10" font-size="12" font-weight="bold" text-anchor="middle" fill="white" font-family="Arial">!</text>
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

// Ícono de punto de referencia (marcador personalizado)
function makeSvgPuntoReferencia(color) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <filter id="sh" x="-30%" y="-10%" width="160%" height="150%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000040"/>
      </filter>
      <path d="M16 1C7.715 1 1 7.715 1 16c0 11.25 15 25 15 25S31 27.25 31 16C31 7.715 24.285 1 16 1z"
        fill="${color}" stroke="white" stroke-width="2" filter="url(#sh)"/>
      <circle cx="16" cy="16" r="6" fill="white" opacity="0.2"/>
      <circle cx="16" cy="16" r="3" fill="white" opacity="0.9"/>
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
  // ─── Ref para que el click del mapa siempre vea el estado real del medidor ───
  const medidorActivoRef = useRef(false)
  // ─── Ref para la polilínea del medidor (evita re-renders infinitos) ───
  const polylineRef = useRef(null)

  const [clientes, setClientes] = useState([])
  const [antenas,  setAntenas]  = useState([])
  const [puntosRef, setPuntosRef] = useState([])
  const [planes,   setPlanes]   = useState([])
  const [reportes, setReportes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [leafletReady, setLeafletReady] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtro,   setFiltro]   = useState('')
  const [selected, setSelected] = useState(null)
  const [selectedType, setSelectedType] = useState('cliente') // 'cliente' | 'antena' | 'punto_ref'
  const [editCoord, setEditCoord] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [showMode, setShowMode] = useState('clientes') // 'clientes' | 'antenas' | 'puntos_ref'
  const [modalForm, setModalForm] = useState(null) // null | 'nueva_antena' | 'nuevo_punto_ref'
  const [formData, setFormData] = useState({})
  const [formSaving, setFormSaving] = useState(false)
  const [medidor, setMedidor] = useState({ activo: false, puntos: [], distanciaTotal: 0 })

  // ─── Cargar datos ─────────────────────────────────────────────
  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [c, a, s, p, rep] = await Promise.all([
        api.get('/api/clientes'),
        api.get('/api/antenas'),
        api.get('/api/snacks'),
        api.get('/api/planes'),
        api.get('/api/reportes')
      ])
      setClientes(c.data || [])
      setAntenas(a.data || [])
      setPuntosRef(s.data || [])
      setPlanes(p.data || [])
      setReportes(rep.data || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ─── Sincronizar ref con state del medidor para uso en closures ───
  useEffect(() => {
    medidorActivoRef.current = medidor.activo
  }, [medidor.activo])

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

    // Click en mapa: leer ref en vez de closure para ver estado live
    map.on('click', (e) => {
      if (medidorActivoRef.current) {
        // Medidor activo → agregar punto usando función de actualización
        setMedidor(prev => {
          const nuevosPuntos = [...prev.puntos, [e.latlng.lat, e.latlng.lng]]
          const distanciaTotal = calcularDistanciaRuta(nuevosPuntos)
          return { ...prev, puntos: nuevosPuntos, distanciaTotal }
        })
        return
      }
      // Comportamiento normal: reubicar
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
      
      // Verificar si el cliente tiene reportes abiertos
      const tieneAlerta = reportes.some(r => r.cliente_id === c.id && r.estado === 'abierto')
      
      const icon = L.icon({
        iconUrl:    tieneAlerta ? makeSvgPinAlerta(cfg.pin) : makeSvgPin(cfg.pin),
        iconSize:   tieneAlerta ? [36, 46] : [32, 42],
        iconAnchor: tieneAlerta ? [18, 46] : [16, 42],
        popupAnchor:tieneAlerta ? [0, -48] : [0, -44],
      })

      const marker = L.marker([Number(c.latitud), Number(c.longitud)], { icon, title: c.nombre_razon_social })

      marker.bindPopup(`
        <div style="font-family:Inter,system-ui,sans-serif;min-width:200px;padding:4px">
          <div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:4px">${c.nombre_razon_social}</div>
          <div style="font-size:11px;color:#64748b;margin-bottom:8px">${c.documento_identidad || ''}</div>
          ${tieneAlerta ? `<div style="background:#fef2f2;border-left:3px solid #dc2626;padding:8px;border-radius:4px;margin-bottom:8px"><span style="font-size:12px;font-weight:600;color:#dc2626">⚠️ CLIENTE CON ALERTA</span><div style="font-size:10px;color:#7f1d1d;margin-top:4px">${reportes.filter(r => r.cliente_id === c.id && r.estado === 'abierto').length} reporte(s) abierto(s)</div></div>` : ''}
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
            <span style="background:${cfg.bg};color:${cfg.txt};padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid ${cfg.ring}">${c.estado_servicio}</span>
            ${plan ? `<span style="background:#dbeafe;color:#1e40af;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600">${plan.nombre_plan}</span>` : ''}
          </div>
          ${c.telefono ? `<div style="font-size:12px;color:#374151;margin-top:4px">📞 ${c.telefono}</div>` : ''}
          ${c.zona_sector ? `<div style="font-size:12px;color:#94a3b8">📍 ${c.zona_sector}</div>` : ''}
          ${c.direccion_ubicacion ? `<div style="font-size:11px;color:#64748b;margin-top:4px;font-style:italic">${c.direccion_ubicacion}</div>` : ''}
        </div>
      `, { maxWidth: 300 })

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

    // ─── PUNTOS DE REFERENCIA ────────────────
    puntosRef.forEach(s => {
      const iconAddr = L.icon({
        iconUrl:    makeSvgPuntoReferencia(ICON_TYPES.punto_ref.color),
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

      marker.on('click', () => { setSelected(s); setSelectedType('punto_ref') })
      if (showMode === 'puntos_ref') marker.addTo(mapObj.current)
      markersRef.current.push(marker)
    })

    // Ajustar bounds si hay markers visibles
    const markersVisibles = markersRef.current.filter(m => m._map === mapObj.current)
    if (markersVisibles.length > 0) {
      const group = L.featureGroup(markersVisibles)
      mapObj.current.fitBounds(group.getBounds().pad(0.15))
    }
  }, [clientes, antenas, puntosRef, planes, reportes, leafletReady, loading, showMode])

  // ─── Renderizar polilínea del medidor (usa ref para no generar loop) ────
  useEffect(() => {
    if (!mapObj.current || !leafletReady) return
    const L = window.L

    // Limpiar polilínea y círculos anteriores
    if (polylineRef.current) {
      polylineRef.current.forEach(layer => layer.remove())
      polylineRef.current = null
    }

    if (medidor.puntos.length < 1) return

    const layers = []

    // Polilínea entre todos los puntos
    if (medidor.puntos.length > 1) {
      const poly = L.polyline(medidor.puntos, {
        color: '#16a34a',
        weight: 3,
        opacity: 0.85,
        dashArray: '8, 5',
      }).addTo(mapObj.current)
      layers.push(poly)
    }

    // Círculo en cada punto
    medidor.puntos.forEach((punto, idx) => {
      const circle = L.circleMarker(punto, {
        radius: 6,
        fillColor: '#16a34a',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9,
        zIndexOffset: 500,
      }).addTo(mapObj.current)
       .bindTooltip(`Punto ${idx + 1}`, { permanent: false, direction: 'top' })
      layers.push(circle)
    })

    polylineRef.current = layers
  }, [medidor.puntos, leafletReady])

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
      } else if (selectedType === 'punto_ref') {
        await api.patch('/api/snacks', {
          id: selected.id,
          latitud:  editCoord.lat,
          longitud: editCoord.lng,
        })
        await alertaExito('Punto reubicado', `${selected.nombre} movido correctamente`)
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
      } else if (selectedType === 'punto_ref') {
        await api.delete(`/api/snacks?id=${selected.id}`)
        await alertaExito('Punto de referencia eliminado')
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

  // ─── Crear nueva ANTENA ───────────────────────
  async function crearAntena() {
    if (!formData.nombre || formData.nombre.trim() === '') {
      await alertaError('Error', 'El nombre es requerido')
      return
    }
    setFormSaving(true)
    try {
      const res = await api.post('/api/antenas', {
        nombre: formData.nombre,
        latitud: formData.latitud || BAR_LAT,
        longitud: formData.longitud || BAR_LNG,
        ubicacion_descripcion: formData.ubicacion_descripcion || '',
        banda_frecuencia: formData.banda_frecuencia || '',
        potencia_watts: formData.potencia_watts || null,
        alcance_approx_metros: formData.alcance_approx_metros || null,
        nota_tecnica: formData.nota_tecnica || '',
      })
      await alertaExito('¡Listo!', 'Antena creada correctamente')
      setModalForm(null)
      setFormData({})
      await cargar()
    } catch(e) { await alertaError('Error', e.message) }
    finally { setFormSaving(false) }
  }

  // ─── Crear nuevo PUNTO DE REFERENCIA ───────────────────────
  async function crearPuntoRef() {
    if (!formData.nombre || formData.nombre.trim() === '') {
      await alertaError('Error', 'El nombre es requerido')
      return
    }
    setFormSaving(true)
    try {
      const res = await api.post('/api/snacks', {
        nombre: formData.nombre,
        latitud: formData.latitud || BAR_LAT,
        longitud: formData.longitud || BAR_LNG,
        ubicacion_descripcion: formData.ubicacion_descripcion || '',
        contacto_telefono: formData.contacto_telefono || '',
        horario_atencion: formData.horario_atencion || '',
        nota_especial: formData.nota_especial || '',
      })
      await alertaExito('¡Listo!', 'Punto de referencia creado correctamente')
      setModalForm(null)
      setFormData({})
      await cargar()
    } catch(e) { await alertaError('Error', e.message) }
    finally { setFormSaving(false) }
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
            background:'rgba(247,249,251,0.96)', borderRadius:10,
            padding:'6px', boxShadow:'0 2px 12px rgba(0,0,0,0.12)',
            border:'1px solid #e2e8f0', backdropFilter:'blur(20px)',
          }}>
            <button 
              onClick={() => { setShowMode('clientes'); setSelected(null) }}
              style={{
                padding:'8px 14px', fontSize:11, fontWeight:600, borderRadius:8, border: 'none',
                background: showMode === 'clientes' ? '#16a34a' : '#fff',
                color: showMode === 'clientes' ? '#fff' : '#334155',
                cursor: 'pointer', transition: 'all .2s'
              }}>
              👥 Clientes
            </button>
            <button 
              onClick={() => { setShowMode('antenas'); setSelected(null) }}
              style={{
                padding:'8px 14px', fontSize:11, fontWeight:600, borderRadius:8, border: 'none',
                background: showMode === 'antenas' ? '#2563eb' : '#fff',
                color: showMode === 'antenas' ? '#fff' : '#334155',
                cursor: 'pointer', transition: 'all .2s'
              }}>
              📡 Antenas
            </button>
            <button 
              onClick={() => { setShowMode('puntos_ref'); setSelected(null) }}
              style={{
                padding:'8px 14px', fontSize:11, fontWeight:600, borderRadius:8, border: 'none',
                background: showMode === 'puntos_ref' ? '#f59e0b' : '#fff',
                color: showMode === 'puntos_ref' ? '#fff' : '#334155',
                cursor: 'pointer', transition: 'all .2s'
              }}>
              📍 Puntos
            </button>
            <div style={{ width:1, background:'#e2e8f0', opacity:0.3 }}></div>
            <button
              onClick={() => {
                const nuevaActivo = !medidor.activo
                medidorActivoRef.current = nuevaActivo
                setMedidor(p => ({ ...p, activo: nuevaActivo, puntos: nuevaActivo ? p.puntos : [], distanciaTotal: nuevaActivo ? p.distanciaTotal : 0 }))
              }}
              style={{
                padding:'8px 14px', fontSize:11, fontWeight:600, borderRadius:8, border: medidor.activo ? '1px solid #bbf7d0' : 'none',
                background: medidor.activo ? '#16a34a' : '#fff',
                color: medidor.activo ? '#fff' : '#334155',
                cursor: 'pointer', transition: 'all .2s'
              }}>
              📏 {medidor.activo ? 'Midiendo…' : 'Medir'}
            </button>
          </div>

          {/* Leyenda — oculta cuando el medidor está activo para no solaparse */}
          {!medidor.activo && (
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
          )}

          {/* Panel MEDIDOR activo — reemplaza a la leyenda cuando está visible */}
          {medidor.activo && (
            <div style={{
              position:'absolute', bottom:24, left:12, zIndex:500,
              background:'rgba(15,23,42,0.93)',
              borderRadius:14,
              padding:'14px 16px',
              boxShadow:'0 8px 24px rgba(0,0,0,0.3)',
              border:'1px solid rgba(255,255,255,0.08)',
              backdropFilter:'blur(20px)',
              minWidth:300,
            }}>
              <div style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>📏 Medidor de Distancia</div>
              <div style={{ fontSize:24, color:'#bbf7d0', fontFamily:'JetBrains Mono,monospace', fontWeight:700, marginBottom:4 }}>
                {(medidor.distanciaTotal / 1000).toFixed(3)} km
              </div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,0.5)', marginBottom:14 }}>
                {medidor.distanciaTotal.toFixed(0)} m · {medidor.puntos.length} punto{medidor.puntos.length !== 1 ? 's' : ''}
              </div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:14 }}>
                Haz clic en el mapa para agregar puntos de medición
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button
                  onClick={() => setMedidor(p => ({ ...p, puntos: [], distanciaTotal: 0 }))}
                  style={{ flex:1, padding:'8px 12px', fontSize:11, background:'rgba(254,137,131,0.2)', color:'#fca5a5', border:'1px solid rgba(254,137,131,0.3)', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
                  Limpiar
                </button>
                <button
                  onClick={() => {
                    alertaExito('Medición completada', `${medidor.distanciaTotal.toFixed(0)}m (${medidor.puntos.length} puntos)`)
                    setMedidor({ activo: false, puntos: [], distanciaTotal: 0 })
                    medidorActivoRef.current = false
                  }}
                  style={{ flex:1, padding:'8px 12px', fontSize:11, background:'#16a34a', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
                  Finalizar
                </button>
              </div>
            </div>
          )}

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
              {canWrite && (
                <button 
                  onClick={() => setModalForm('nueva_antena')}
                  style={{ width:'100%', marginTop:8, padding:'8px 12px', fontSize:11, background:'#2563eb', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
                  + Nueva Antena
                </button>
              )}
            </div>
          )}

          {/* Stats para puntos de referencia */}
          {showMode === 'puntos_ref' && (
            <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:14, padding:'14px 16px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px', marginBottom:12 }}>Puntos de Referencia</div>
              <div style={{ fontSize:12, color:'#334155' }}>
                <div style={{ fontWeight:600, marginBottom:4 }}>Total en mapa: <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'#f59e0b' }}>{puntosRef.length}</span></div>
                <div style={{ fontSize:11, color:'#64748b' }}>Haz clic en un punto para ver detalles</div>
              </div>
              {canWrite && (
                <button 
                  onClick={() => setModalForm('nuevo_punto_ref')}
                  style={{ width:'100%', marginTop:8, padding:'8px 12px', fontSize:11, background:'#f59e0b', color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontWeight:600 }}>
                  + Nuevo Punto
                </button>
              )}
            </div>
          )}

          {/* Panel elemento seleccionado */}
          {selected && (
            <div style={{ 
              background: selectedType === 'cliente' ? '#f0fdf4' : selectedType === 'antena' ? '#eff6ff' : '#fef3c7', 
              border: selectedType === 'cliente' ? '1px solid #bbf7d0' : selectedType === 'antena' ? '1px solid #dbeafe' : '1px solid #fde68a', 
              borderRadius:14, padding:16, flexShrink:0 
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', lineHeight:1.3 }}>
                  {selectedType === 'cliente' ? selected.nombre_razon_social : selected.nombre}
                </div>
                <button onClick={() => { setSelected(null); setEditCoord(null) }}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:18, lineHeight:1, padding:0, width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
              
              {selectedType === 'cliente' && (
                <>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:10 }}>
                    {selected.documento_identidad && <span>{selected.documento_identidad} · </span>}
                    <span style={{ color: ESTADO_COLOR[selected.estado_servicio]?.txt || '#64748b', fontWeight:600 }}>{selected.estado_servicio}</span>
                  </div>
                  {editCoord ? (
                    <div>
                      <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#16a34a', marginBottom:10, background:'#fff', borderRadius:8, padding:'8px 12px', border:'1px solid #bbf7d0' }}>
                        Lat: {editCoord.lat.toFixed(6)}<br/>
                        Lon: {editCoord.lng.toFixed(6)}
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-primary btn-sm" onClick={guardarUbicacion} disabled={saving} style={{ fontSize:11, flex:1 }}>
                          {saving ? 'Guardando…' : '💾 Guardar'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditCoord(null)} style={{ fontSize:11 }}>Cancelar</button>
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
                          📍 {selected.latitud ? 'Mover pin en mapa' : 'Haz clic en el mapa para ubicar'}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {selectedType === 'antena' && (
                <>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:10 }}>
                    {selected.ubicacion_descripcion || 'Sin descripción'}
                  </div>
                  {selected.banda_frecuencia && (
                    <div style={{ fontSize:11, color:'#334155', marginBottom:4 }}>📡 Banda: {selected.banda_frecuencia}</div>
                  )}
                  {selected.alcance_approx_metros && (
                    <div style={{ fontSize:11, color:'#334155', marginBottom:4 }}>📏 Alcance: {selected.alcance_approx_metros}m</div>
                  )}
                  {selected.potencia_watts && (
                    <div style={{ fontSize:11, color:'#334155', marginBottom:4 }}>⚡ Potencia: {selected.potencia_watts}W</div>
                  )}
                  {editCoord ? (
                    <div>
                      <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#2563eb', marginBottom:10, background:'#fff', borderRadius:8, padding:'8px 12px', border:'1px solid #dbeafe' }}>
                        Lat: {editCoord.lat.toFixed(6)}<br/>
                        Lon: {editCoord.lng.toFixed(6)}
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-primary btn-sm" onClick={guardarUbicacion} disabled={saving} style={{ fontSize:11, flex:1 }}>
                          {saving ? 'Guardando…' : '💾 Guardar'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditCoord(null)} style={{ fontSize:11 }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      {canWrite && (
                        <>
                          <button className="btn btn-ghost btn-sm" style={{ flex:1, fontSize:11 }}
                            onClick={() => setEditCoord({ lat: Number(selected.latitud), lng: Number(selected.longitud) })}>
                            📍 Mover
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={eliminarUbicacion} style={{ fontSize:11, color:'#dc2626' }}>
                            🗑️ Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {selectedType === 'punto_ref' && (
                <>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:10 }}>
                    {selected.ubicacion_descripcion || 'Sin descripción'}
                  </div>
                  {selected.contacto_telefono && (
                    <div style={{ fontSize:11, color:'#334155', marginBottom:4 }}>📞 {selected.contacto_telefono}</div>
                  )}
                  {selected.horario_atencion && (
                    <div style={{ fontSize:11, color:'#334155', marginBottom:4 }}>⏰ {selected.horario_atencion}</div>
                  )}
                  {editCoord ? (
                    <div>
                      <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#f59e0b', marginBottom:10, background:'#fff', borderRadius:8, padding:'8px 12px', border:'1px solid #fde68a' }}>
                        Lat: {editCoord.lat.toFixed(6)}<br/>
                        Lon: {editCoord.lng.toFixed(6)}
                      </div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-primary btn-sm" onClick={guardarUbicacion} disabled={saving} style={{ fontSize:11, flex:1 }}>
                          {saving ? 'Guardando…' : '💾 Guardar'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditCoord(null)} style={{ fontSize:11 }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', gap:8, marginTop:8 }}>
                      {canWrite && (
                        <>
                          <button className="btn btn-ghost btn-sm" style={{ flex:1, fontSize:11 }}
                            onClick={() => setEditCoord({ lat: Number(selected.latitud), lng: Number(selected.longitud) })}>
                            📍 Mover
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={eliminarUbicacion} style={{ fontSize:11, color:'#dc2626' }}>
                            🗑️ Eliminar
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Lista sin ubicación (solo para clientes) */}
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
                      onClick={() => { if (canWrite) { setSelected(c); setSelectedType('cliente'); setEditCoord(null) } }}>
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
          )}

          {/* Botón centrar en Barquisimeto */}
          <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'center', fontSize:12 }}
            onClick={() => mapObj.current?.flyTo([BAR_LAT, BAR_LNG], 13, { duration: 1.2 })}>
            🏙️ Centrar en Barquisimeto
          </button>
        </div>
      </div>

      {/* ── MODAL FORMULARIO NUEVA ANTENA ─────────────────────────── */}
      {modalForm === 'nueva_antena' && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20
        }}>
          <div style={{ background:'#fff', borderRadius:16, padding:24, maxWidth:400, width:'100%' }}>
            <div style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:16 }}>📡 Nueva Antena</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Nombre *</label>
                <input className="input" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Antena Principal" />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Descripción</label>
                <input className="input" value={formData.ubicacion_descripcion || ''} onChange={e => setFormData({...formData, ubicacion_descripcion: e.target.value})} placeholder="Ubicación o referencia" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Latitud</label>
                  <input className="input" type="number" step="0.000001" value={formData.latitud || ''} onChange={e => setFormData({...formData, latitud: parseFloat(e.target.value)})} placeholder="10.067" />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Longitud</label>
                  <input className="input" type="number" step="0.000001" value={formData.longitud || ''} onChange={e => setFormData({...formData, longitud: parseFloat(e.target.value)})} placeholder="-69.347" />
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Banda</label>
                  <select className="select" value={formData.banda_frecuencia || ''} onChange={e => setFormData({...formData, banda_frecuencia: e.target.value})}>
                    <option value="">Seleccionar</option>
                    <option value="2.4GHz">2.4GHz</option>
                    <option value="5GHz">5GHz</option>
                    <option value="60GHz">60GHz</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Alcance (m)</label>
                  <input className="input" type="number" value={formData.alcance_approx_metros || ''} onChange={e => setFormData({...formData, alcance_approx_metros: parseInt(e.target.value)})} placeholder="5000" />
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Potencia (W)</label>
                <input className="input" type="number" step="0.1" value={formData.potencia_watts || ''} onChange={e => setFormData({...formData, potencia_watts: parseFloat(e.target.value)})} placeholder="100" />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Notas técnicas</label>
                <textarea className="input" rows={2} value={formData.nota_tecnica || ''} onChange={e => setFormData({...formData, nota_tecnica: e.target.value})} placeholder="Configuración especial, equipo, etc." />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button className="btn btn-primary" onClick={crearAntena} disabled={formSaving} style={{ flex:1 }}>
                {formSaving ? 'Guardando…' : 'Crear Antena'}
              </button>
              <button className="btn btn-ghost" onClick={() => { setModalForm(null); setFormData({}) }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FORMULARIO NUEVO PUNTO DE REFERENCIA ─────────────── */}
      {modalForm === 'nuevo_punto_ref' && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center', padding:20
        }}>
          <div style={{ background:'#fff', borderRadius:16, padding:24, maxWidth:400, width:'100%' }}>
            <div style={{ fontSize:18, fontWeight:700, color:'#0f172a', marginBottom:16 }}>📍 Nuevo Punto de Referencia</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Nombre *</label>
                <input className="input" value={formData.nombre || ''} onChange={e => setFormData({...formData, nombre: e.target.value})} placeholder="Ej: Snack Central" />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Descripción</label>
                <input className="input" value={formData.ubicacion_descripcion || ''} onChange={e => setFormData({...formData, ubicacion_descripcion: e.target.value})} placeholder="Dirección o referencia" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Latitud</label>
                  <input className="input" type="number" step="0.000001" value={formData.latitud || ''} onChange={e => setFormData({...formData, latitud: parseFloat(e.target.value)})} placeholder="10.067" />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Longitud</label>
                  <input className="input" type="number" step="0.000001" value={formData.longitud || ''} onChange={e => setFormData({...formData, longitud: parseFloat(e.target.value)})} placeholder="-69.347" />
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Teléfono</label>
                <input className="input" value={formData.contacto_telefono || ''} onChange={e => setFormData({...formData, contacto_telefono: e.target.value})} placeholder="0414-1234567" />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Horario</label>
                <input className="input" value={formData.horario_atencion || ''} onChange={e => setFormData({...formData, horario_atencion: e.target.value})} placeholder="8:00-20:00 L-V" />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:4, display:'block' }}>Nota especial</label>
                <textarea className="input" rows={2} value={formData.nota_especial || ''} onChange={e => setFormData({...formData, nota_especial: e.target.value})} placeholder="Información adicional" />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:16 }}>
              <button className="btn btn-primary" onClick={crearPuntoRef} disabled={formSaving} style={{ flex:1 }}>
                {formSaving ? 'Guardando…' : 'Crear Punto'}
              </button>
              <button className="btn btn-ghost" onClick={() => { setModalForm(null); setFormData({}) }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
