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

// ─── Iconos SVG Personalizados por ISTICH ───
function makeSvgPin(color, icon = 'default', size = { width: 32, height: 42 }) {
  const icons = {
    // Cliente Normal - Pin verde con círculo blanco
    default: `<circle cx="16" cy="16" r="6" fill="white"/>`,
    
    // Cliente con Alerta - Pin rojo con exclamación
    alert: `<circle cx="16" cy="16" r="7" fill="white"/><path d="M16 11V18M16 21H16.01" stroke="#dc2626" stroke-width="2" stroke-linecap="round"/>`,
    
    // Antena - Pin azul con diseño de torre
    antena: `<path d="M16 8V22M12 12L16 8L20 12M10 16L16 8L22 16" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="8" r="1.5" fill="white"/>`,
    
    // Punto de Referencia - Pin ámbar con círculos concéntricos
    punto: `<circle cx="16" cy="14" r="6" stroke="white" stroke-width="2"/><circle cx="16" cy="14" r="2" fill="white"/>`,
  }

  // Ajustar viewBox según el tipo de icono
  const getViewBox = () => {
    switch(icon) {
      case 'antena': return '0 0 32 40'
      case 'punto': return '0 0 32 36'
      default: return '0 0 32 42'
    }
  }

  // Ajustar path del pin según el tamaño
  const getPinPath = () => {
    switch(icon) {
      case 'antena': return 'M16 40C16 40 32 24.5 32 15C32 6.16344 24.8366 -1 16 -1C7.16344 -1 0 6.16344 0 15C0 24.5 16 40 16 40Z'
      case 'punto': return 'M16 36C16 36 32 22 32 14C32 5.16344 24.8366 -2 16 -2C7.16344 -2 0 5.16344 0 14C0 22 16 36 16 36Z'
      default: return 'M16 42C16 42 32 25.5 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 25.5 16 42 16 42Z'
    }
  }

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="${size.width}" height="${size.height}" viewBox="${getViewBox()}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <filter id="shadow" x="-2" y="-2" width="36" height="46">
        <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
        <feOffset dx="0" dy="1" result="offsetblur"/>
        <feComponentTransfer><feFuncA type="linear" slope="0.2"/></feComponentTransfer>
        <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <path d="${getPinPath()}" fill="${color}" filter="url(#shadow)"/>
      ${icons[icon] || icons.default}
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
  const medidorActivoRef = useRef(false)
  const polylineRef = useRef(null)

  const [clientes, setClientes] = useState([])
  const [antenas,  setAntenas]  = useState([])
  const [puntosRef, setPuntosRef] = useState([])
  const [planes,   setPlanes]   = useState([])
  const [reportes, setReportes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [leafletReady, setLeafletReady] = useState(false)
  
  // ─── Estados para el buscador avanzado ───────────────────────
  const [busquedaGlobal, setBusquedaGlobal] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState([])
  const [mostrarResultados, setMostrarResultados] = useState(false)
  const [busquedaActiva, setBusquedaActiva] = useState(false)
  
  const [busqueda, setBusqueda] = useState('')
  const [filtro,   setFiltro]   = useState('')
  const [selected, setSelected] = useState(null)
  const [selectedType, setSelectedType] = useState('cliente')
  const [editCoord, setEditCoord] = useState(null)
  const [saving,   setSaving]   = useState(false)
  const [showMode, setShowMode] = useState('clientes')
  const [modalForm, setModalForm] = useState(null)
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

  // ─── Sincronizar ref con state del medidor ───
  useEffect(() => {
    medidorActivoRef.current = medidor.activo
  }, [medidor.activo])

  // ─── Buscador avanzado ─────────────────────────────────────────
  const buscarGlobal = useCallback((query) => {
    if (!query || query.length < 2) {
      setResultadosBusqueda([])
      setMostrarResultados(false)
      return
    }

    const q = query.toLowerCase()
    const resultados = []

    // Buscar en clientes
    clientes.forEach(c => {
      if (c.nombre_razon_social?.toLowerCase().includes(q) ||
          c.documento_identidad?.toLowerCase().includes(q) ||
          c.zona_sector?.toLowerCase().includes(q) ||
          c.direccion_ubicacion?.toLowerCase().includes(q)) {
        resultados.push({
          tipo: 'cliente',
          id: c.id,
          nombre: c.nombre_razon_social,
          subtitulo: c.zona_sector || c.documento_identidad || '',
          estado: c.estado_servicio,
          lat: c.latitud,
          lng: c.longitud,
          color: ESTADO_COLOR[c.estado_servicio]?.pin || '#16a34a'
        })
      }
    })

    // Buscar en antenas
    antenas.forEach(a => {
      if (a.nombre?.toLowerCase().includes(q) ||
          a.ubicacion_descripcion?.toLowerCase().includes(q) ||
          a.banda_frecuencia?.toLowerCase().includes(q)) {
        resultados.push({
          tipo: 'antena',
          id: a.id,
          nombre: a.nombre,
          subtitulo: a.ubicacion_descripcion || a.banda_frecuencia || '',
          estado: 'Activa',
          lat: a.latitud,
          lng: a.longitud,
          color: '#2563eb'
        })
      }
    })

    // Buscar en puntos de referencia
    puntosRef.forEach(p => {
      if (p.nombre?.toLowerCase().includes(q) ||
          p.ubicacion_descripcion?.toLowerCase().includes(q) ||
          p.contacto_telefono?.toLowerCase().includes(q)) {
        resultados.push({
          tipo: 'punto_ref',
          id: p.id,
          nombre: p.nombre,
          subtitulo: p.ubicacion_descripcion || p.contacto_telefono || '',
          estado: 'Activo',
          lat: p.latitud,
          lng: p.longitud,
          color: '#f59e0b'
        })
      }
    })

    setResultadosBusqueda(resultados.slice(0, 8)) // Limitar a 8 resultados
    setMostrarResultados(true)
  }, [clientes, antenas, puntosRef])

  useEffect(() => {
    const timer = setTimeout(() => {
      buscarGlobal(busquedaGlobal)
    }, 300)

    return () => clearTimeout(timer)
  }, [busquedaGlobal, buscarGlobal])

  // ─── Función para ir a un resultado de búsqueda ─────────────────
  const irAResultado = (resultado) => {
    if (!mapObj.current) return
    
    // Cambiar al modo correspondiente
    setShowMode(resultado.tipo === 'cliente' ? 'clientes' : resultado.tipo === 'antena' ? 'antenas' : 'puntos_ref')
    
    // Mover el mapa
    if (resultado.lat && resultado.lng) {
      mapObj.current.flyTo([Number(resultado.lat), Number(resultado.lng)], 17, { duration: 1.5 })
    }
    
    // Seleccionar el elemento
    if (resultado.tipo === 'cliente') {
      const cliente = clientes.find(c => c.id === resultado.id)
      if (cliente) {
        setSelected(cliente)
        setSelectedType('cliente')
      }
    } else if (resultado.tipo === 'antena') {
      const antena = antenas.find(a => a.id === resultado.id)
      if (antena) {
        setSelected(antena)
        setSelectedType('antena')
      }
    } else if (resultado.tipo === 'punto_ref') {
      const punto = puntosRef.find(p => p.id === resultado.id)
      if (punto) {
        setSelected(punto)
        setSelectedType('punto_ref')
      }
    }
    
    // Cerrar resultados de búsqueda
    setMostrarResultados(false)
    setBusquedaGlobal('')
  }

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

    map.on('click', (e) => {
      if (medidorActivoRef.current) {
        setMedidor(prev => {
          const nuevosPuntos = [...prev.puntos, [e.latlng.lat, e.latlng.lng]]
          const distanciaTotal = calcularDistanciaRuta(nuevosPuntos)
          return { ...prev, puntos: nuevosPuntos, distanciaTotal }
        })
        return
      }
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
      const tieneAlerta = reportes.some(r => r.cliente_id === c.id && r.estado === 'abierto')
      
      const icon = L.icon({
        iconUrl:    tieneAlerta ? makeSvgPin('#dc2626', 'alert', { width: 32, height: 42 }) : makeSvgPin(cfg.pin, 'default'),
        iconSize:   tieneAlerta ? [32, 42] : [32, 42],
        iconAnchor: tieneAlerta ? [16, 42] : [16, 42],
        popupAnchor:tieneAlerta ? [0, -44] : [0, -44],
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
        iconUrl:    makeSvgPin(ICON_TYPES.antena.color, 'antena', { width: 32, height: 40 }),
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
        iconUrl:    makeSvgPin(ICON_TYPES.punto_ref.color, 'punto', { width: 32, height: 36 }),
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

  // ─── Renderizar polilínea del medidor ────
  useEffect(() => {
    if (!mapObj.current || !leafletReady) return
    const L = window.L

    if (polylineRef.current) {
      polylineRef.current.forEach(layer => layer.remove())
      polylineRef.current = null
    }

    if (medidor.puntos.length < 1) return

    const layers = []

    if (medidor.puntos.length > 1) {
      const poly = L.polyline(medidor.puntos, {
        color: '#16a34a',
        weight: 3,
        opacity: 0.85,
        dashArray: '8, 5',
      }).addTo(mapObj.current)
      layers.push(poly)
    }

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

  function volarA(c) {
    if (!mapObj.current || !c.latitud) return
    mapObj.current.flyTo([Number(c.latitud), Number(c.longitud)], 16, { duration: 1 })
    setSelected(c)
  }

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
        .gn-search-container {
          position: absolute; top: 14px; right: 14px; z-index: 500;
          width: 320px;
        }
        .gn-search-input {
          width: 100%; padding: 10px 14px; font-size: 13px;
          border: 2px solid #e2e8f0; border-radius: 12px;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          transition: all 0.2s;
        }
        .gn-search-input:focus {
          outline: none; border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }
        .gn-search-results {
          position: absolute; top: calc(100% + 8px); left: 0; right: 0;
          background: #fff; border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          border: 1px solid #e2e8f0; max-height: 320px; overflow-y: auto;
          z-index: 600;
        }
        .gn-search-result-item {
          padding: 12px 14px; border-bottom: 1px solid #f1f5f9;
          cursor: pointer; transition: background 0.15s;
          display: flex; align-items: center; gap: 10px;
        }
        .gn-search-result-item:hover {
          background: #f8fafc;
        }
        .gn-search-result-item:last-child {
          border-bottom: none;
        }
        .gn-search-result-icon {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
        }
        .gn-search-result-content {
          flex: 1; min-width: 0;
        }
        .gn-search-result-title {
          font-size: 13px; font-weight: 600; color: #0f172a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .gn-search-result-subtitle {
          font-size: 11px; color: #64748b;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .gn-search-result-badge {
          font-size: 10px; padding: 2px 8px; border-radius: 10px;
          font-weight: 600; text-transform: uppercase;
          flex-shrink: 0;
        }
      `}</style>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16, height:'calc(100vh - 130px)', minHeight:500 }}>

        {/* ── Mapa ──────────────────────────────────────────────── */}
        <div style={{ position:'relative', borderRadius:16, overflow:'hidden', border:'1px solid #e2e8f0', boxShadow:'0 1px 8px rgba(0,0,0,0.07)' }}>
          <div ref={mapRef} style={{ width:'100%', height:'100%' }} />

          {/* ─── BUSCADOR AVANZADO ───────────────────────────────── */}
          <div className="gn-search-container">
            <input
              type="text"
              className="gn-search-input"
              placeholder="🔍 Buscar clientes, antenas o puntos..."
              value={busquedaGlobal}
              onChange={(e) => setBusquedaGlobal(e.target.value)}
              onFocus={() => setBusquedaActiva(true)}
              onBlur={() => setTimeout(() => setBusquedaActiva(false), 200)}
            />
            
            {mostrarResultados && resultadosBusqueda.length > 0 && (
              <div className="gn-search-results">
                {resultadosBusqueda.map((resultado, idx) => (
                  <div
                    key={`${resultado.tipo}-${resultado.id}-${idx}`}
                    className="gn-search-result-item"
                    onClick={() => irAResultado(resultado)}
                  >
                    <div 
                      className="gn-search-result-icon"
                      style={{ background: resultado.color }}
                    />
                    <div className="gn-search-result-content">
                      <div className="gn-search-result-title">{resultado.nombre}</div>
                      <div className="gn-search-result-subtitle">{resultado.subtitulo}</div>
                    </div>
                    <span 
                      className="gn-search-result-badge"
                      style={{
                        background: resultado.tipo === 'cliente' ? '#dcfce7' : 
                                   resultado.tipo === 'antena' ? '#dbeafe' : '#fef3c7',
                        color: resultado.tipo === 'cliente' ? '#166534' : 
                               resultado.tipo === 'antena' ? '#1e40af' : '#92400e'
                      }}
                    >
                      {resultado.tipo === 'cliente' ? 'Cliente' : 
                       resultado.tipo === 'antena' ? 'Antena' : 'Punto'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {mostrarResultados && resultadosBusqueda.length === 0 && busquedaGlobal.length >= 2 && (
              <div className="gn-search-results">
                <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  No se encontraron resultados
                </div>
              </div>
            )}
          </div>

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

          {/* Leyenda — oculta cuando el medidor está activo */}
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

          {/* Panel MEDIDOR activo */}
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
