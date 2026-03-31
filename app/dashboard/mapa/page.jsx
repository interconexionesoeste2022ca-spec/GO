'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api, getSesion, tienePermiso, alertaExito, alertaError } from '@/lib/api'

const ESTADO_COLOR = {
  Activo:     { pin: '#00ff88', bg: 'rgba(0, 255, 136, 0.15)', txt: '#00ff88', ring: 'rgba(0, 255, 136, 0.3)', glow: 'rgba(0, 255, 136, 0.5)' },
  Cortado:    { pin: '#ff4757', bg: 'rgba(255, 71, 87, 0.15)', txt: '#ff4757', ring: 'rgba(255, 71, 87, 0.3)', glow: 'rgba(255, 71, 87, 0.5)' },
  Deudor:     { pin: '#ffa502', bg: 'rgba(255, 165, 2, 0.15)', txt: '#ffa502', ring: 'rgba(255, 165, 2, 0.3)', glow: 'rgba(255, 165, 2, 0.5)' },
  Suspendido: { pin: '#747d8c', bg: 'rgba(116, 125, 140, 0.15)', txt: '#747d8c', ring: 'rgba(116, 125, 140, 0.3)', glow: 'rgba(116, 125, 140, 0.5)' },
}

// Iconos para diferentes tipos de ubicación con diseño futurista
const ICON_TYPES = {
  cliente:   { color: '#00ff88', label: 'Clientes', gradient: 'linear-gradient(135deg, #00ff88, #00d4ff)' },
  antena:    { color: '#00d4ff', label: 'Antenas', gradient: 'linear-gradient(135deg, #00d4ff, #0099ff)' },
  punto_ref: { color: '#ffa502', label: 'Puntos de Referencia', gradient: 'linear-gradient(135deg, #ffa502, #ff6348)' },
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

// ─── Iconos SVG Personalizados con Diseño Futurista ───
function makeSvgPin(color, icon = 'default', size = { width: 40, height: 50 }) {
  const icons = {
    // Cliente Normal - Diseño futurista con círculo brillante
    default: `
      <circle cx="20" cy="20" r="8" fill="white" opacity="0.9"/>
      <circle cx="20" cy="20" r="4" fill="${color}"/>
      <circle cx="20" cy="20" r="2" fill="white" opacity="0.8"/>
    `,
    
    // Cliente con Alerta - Diseño con pulso y warning
    alert: `
      <circle cx="20" cy="20" r="10" fill="white" opacity="0.8"/>
      <path d="M20 15V22M20 25H20.01" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    `,
    
    // Antena - Diseño de torre con ondas de señal
    antena: `
      <path d="M20 10V26M16 14L20 10L24 14M14 18L20 10L26 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="20" cy="10" r="2" fill="white"/>
    `,
    
    // Punto de Referencia - Diseño con anillos concéntricos
    punto: `
      <circle cx="20" cy="18" r="8" stroke="white" stroke-width="2" fill="none" opacity="0.8"/>
      <circle cx="20" cy="18" r="12" stroke="white" stroke-width="1" fill="none" opacity="0.4"/>
      <circle cx="20" cy="18" r="4" fill="white" opacity="0.9"/>
      <circle cx="20" cy="18" r="2" fill="${color}"/>
    `,
  }

  // Ajustar viewBox según el tipo de icono
  const getViewBox = () => {
    switch(icon) {
      case 'antena': return '0 0 40 50'
      case 'punto': return '0 0 40 45'
      default: return '0 0 40 50'
    }
  }

  // Path del pin con diseño futurista
  const getPinPath = () => {
    switch(icon) {
      case 'antena': return 'M20 50C20 50 40 30 40 18C40 8.05887 31.0459 0 20 0C8.9541 0 0 8.05887 0 18C0 30 20 50 20 50Z'
      case 'punto': return 'M20 45C20 45 40 26 40 16C40 6.05887 31.0459 -2 20 -2C8.9541 -2 0 6.05887 0 16C0 26 20 45 20 45Z'
      default: return 'M20 50C20 50 40 31 40 20C40 8.9543 31.0459 0 20 0C8.9541 0 0 8.9543 0 20C0 31 20 50 20 50Z'
    }
  }

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="${size.width}" height="${size.height}" viewBox="${getViewBox()}" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-4" y="-4" width="48" height="58">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
          <feOffset dx="0" dy="2" result="offsetblur"/>
          <feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.8"/>
        </linearGradient>
      </defs>
      <path d="${getPinPath()}" fill="url(#pinGrad)" filter="url(#shadow)" opacity="0.95"/>
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
  const [clientes, setClientes] = useState([])
  const [antenas, setAntenas] = useState([])
  const [puntosRef, setPuntosRef] = useState([])
  const [reportes, setReportes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showSearch, setShowSearch] = useState(false)
  const [filters, setFilters] = useState({
    clientes: true,
    antenas: true,
    puntosRef: true,
    estados: { Activo: true, Cortado: true, Deudor: true, Suspendido: true }
  })
  const [medirDistancia, setMedirDistancia] = useState(false)
  const [rutaPuntos, setRutaPuntos] = useState([])
  const [distanciaTotal, setDistanciaTotal] = useState(0)
  const [editCoord, setEditCoord] = useState(null)
  const [showModalAntena, setShowModalAntena] = useState(false)
  const [showModalPunto, setShowModalPunto] = useState(false)
  const [nuevaAntena, setNuevaAntena] = useState({
    nombre: '',
    latitud: 0,
    longitud: 0,
    banda_frecuencia: '',
    potencia_watts: '',
    alcance_approx_metros: '',
    ubicacion_descripcion: '',
    nota_tecnica: ''
  })
  const [nuevoPunto, setNuevoPunto] = useState({
    nombre: '',
    latitud: 0,
    longitud: 0,
    ubicacion_descripcion: ''
  })
  const [contextMenu, setContextMenu] = useState(null)
  const [highlightedClient, setHighlightedClient] = useState(null)

  // Cargar Leaflet dinámicamente
  useEffect(() => {
    const loadLeaflet = async () => {
      if (!window.L) {
        // Cargar CSS
        const leafletCss = document.createElement('link')
        leafletCss.rel = 'stylesheet'
        leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(leafletCss)

        // Cargar JS
        const leafletJs = document.createElement('script')
        leafletJs.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        leafletJs.onload = () => {
          leafletRef.current = true
        }
        document.head.appendChild(leafletJs)
      } else {
        leafletRef.current = true
      }
    }
    loadLeaflet()
  }, [])

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      try {
        const [clientesRes, antenasRes, puntosRes, reportesRes] = await Promise.all([
          api('/clientes'),
          api('/antenas'),
          api('/snacks'),
          api('/reportes')
        ])
        setClientes(clientesRes || [])
        setAntenas(antenasRes || [])
        setPuntosRef(puntosRes || [])
        setReportes(reportesRes || [])
      } catch (error) {
        console.error('Error cargando datos:', error)
        alertaError('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }
    if (sesion) loadData()
  }, [sesion])

  // Inicializar mapa
  useEffect(() => {
    if (!leafletRef.current || !mapRef.current || mapObj.current) return
    
    const L = window.L
    const map = L.map(mapRef.current, { 
      center: [BAR_LAT, BAR_LNG], 
      zoom: 13, 
      zoomControl: true,
      attributionControl: false
    })
    
    // Tile layer con estilo oscuro/moderno
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors © CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map)

    // Evento click para editar coordenadas
    map.on('click', (e) => {
      if (canWrite) setEditCoord({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    // Evento contextmenu para menú contextual
    map.on('contextmenu', (e) => {
      e.originalEvent.preventDefault()
      setContextMenu({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        x: e.originalEvent.clientX,
        y: e.originalEvent.clientY
      })
    })

    mapObj.current = map
  }, [leafletRef.current, canWrite])

  // Renderizar marcadores
  useEffect(() => {
    if (!mapObj.current || !leafletRef.current) return
    const L = window.L

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => mapObj.current.removeLayer(marker))
    markersRef.current = []

    // Renderizar clientes
    if (filters.clientes) {
      clientes.forEach(cliente => {
        if (!cliente.latitud || !cliente.longitud) return
        if (!filters.estados[cliente.estado_servicio]) return

        const tieneAlerta = reportes.some(r => r.cliente_id === cliente.id && r.estado === 'abierto')
        const isHighlighted = highlightedClient === cliente.id
        const colorConfig = ESTADO_COLOR[cliente.estado_servicio] || ESTADO_COLOR.Activo

        const icon = L.divIcon({
          html: `<div style="position:relative;">
            ${makeSvgPin(colorConfig.pin, tieneAlerta ? 'alert' : 'default', { width: 40, height: 50 })}
            ${isHighlighted ? `<div style="position:absolute;top:-5px;left:-5px;right:-5px;bottom:-5px;border:2px solid ${colorConfig.glow};border-radius:50%;animation:pulse 2s infinite;pointer-events:none;"></div>` : ''}
          </div>`,
          className: 'custom-marker',
          iconSize: [40, 50],
          iconAnchor: [20, 50],
          popupAnchor: [0, -50],
          zIndexOffset: isHighlighted ? 1000 : 0
        })

        const popup = L.popup()
          .setContent(`
            <div style="font-family:'Inter',sans-serif;min-width:200px;">
              <div style="font-weight:600;color:#ffffff;margin-bottom:8px;">${cliente.nombre_razon_social}</div>
              <div style="font-size:12px;color:#cccccc;margin-bottom:4px;">📍 ${cliente.direccion_ubicacion || 'Sin dirección'}</div>
              <div style="font-size:12px;color:#cccccc;margin-bottom:4px;">📞 ${cliente.telefono || 'Sin teléfono'}</div>
              <div style="font-size:12px;color:#cccccc;margin-bottom:8px;">📦 ${cliente.planes?.nombre_plan || 'Sin plan'}</div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;">
                <span style="background:${colorConfig.bg};color:${colorConfig.txt};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">${cliente.estado_servicio}</span>
                ${tieneAlerta ? '<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;">⚠️ Reporte activo</span>' : ''}
              </div>
            </div>
          `)

        const marker = L.marker([cliente.latitud, cliente.longitud], { icon })
          .addTo(mapObj.current)
          .bindPopup(popup)

        markersRef.current.push(marker)
      })
    }

    // Renderizar antenas
    if (filters.antenas) {
      antenas.forEach(antena => {
        const icon = L.divIcon({
          html: makeSvgPin(ICON_TYPES.antena.color, 'antena', { width: 40, height: 50 }),
          className: 'custom-marker',
          iconSize: [40, 50],
          iconAnchor: [20, 50],
          popupAnchor: [0, -50]
        })

        const popup = L.popup()
          .setContent(`
            <div style="font-family:'Inter',sans-serif;min-width:200px;">
              <div style="font-weight:600;color:#ffffff;margin-bottom:8px;">🗼 ${antena.nombre}</div>
              <div style="font-size:12px;color:#cccccc;margin-bottom:4px;">📍 ${antena.ubicacion_descripcion || 'Sin descripción'}</div>
              <div style="font-size:12px;color:#cccccc;margin-bottom:4px;">📡 ${antena.banda_frecuencia || 'N/A'}</div>
              <div style="font-size:12px;color:#cccccc;margin-bottom:4px;">⚡ ${antena.potencia_watts || 'N/A'}W</div>
              <div style="font-size:12px;color:#cccccc;margin-bottom:8px;">📏 ${antena.alcance_approx_metros || 'N/A'}m</div>
              <div style="background:${antena.activa ? '#dcfce7' : '#fee2e2'};color:${antena.activa ? '#166534' : '#991b1b'};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;display:inline-block;">
                ${antena.activa ? '✅ Activa' : '❌ Inactiva'}
              </div>
            </div>
          `)

        const marker = L.marker([antena.latitud, antena.longitud], { icon })
          .addTo(mapObj.current)
          .bindPopup(popup)

        markersRef.current.push(marker)
      })
    }

    // Renderizar puntos de referencia
    if (filters.puntosRef) {
      puntosRef.forEach(punto => {
        const icon = L.divIcon({
          html: makeSvgPin(ICON_TYPES.punto_ref.color, 'punto', { width: 40, height: 45 }),
          className: 'custom-marker',
          iconSize: [40, 45],
          iconAnchor: [20, 45],
          popupAnchor: [0, -45]
        })

        const popup = L.popup()
          .setContent(`
            <div style="font-family:'Inter',sans-serif;min-width:200px;">
              <div style="font-weight:600;color:#ffffff;margin-bottom:8px;">📍 ${punto.nombre}</div>
              <div style="font-size:12px;color:#cccccc;">${punto.ubicacion_descripcion || 'Sin descripción'}</div>
            </div>
          `)

        const marker = L.marker([punto.latitud, punto.longitud], { icon })
          .addTo(mapObj.current)
          .bindPopup(popup)

        markersRef.current.push(marker)
      })
    }

  }, [clientes, antenas, puntosRef, filters, reportes, highlightedClient])

  // Buscar clientes con debounce
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([])
      setShowSearch(false)
      return
    }

    const timeoutId = setTimeout(() => {
      const results = []
      
      // Buscar clientes
      clientes.forEach(cliente => {
        if (cliente.nombre_razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cliente.documento_identidad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cliente.zona_sector?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cliente.direccion_ubicacion?.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({
            type: 'cliente',
            data: cliente,
            label: cliente.nombre_razon_social,
            subtitle: cliente.zona_sector || cliente.direccion_ubicacion,
            color: ICON_TYPES.cliente.color
          })
        }
      })

      // Buscar antenas
      antenas.forEach(antena => {
        if (antena.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            antena.ubicacion_descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            antena.banda_frecuencia?.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({
            type: 'antena',
            data: antena,
            label: antena.nombre,
            subtitle: antena.ubicacion_descripcion,
            color: ICON_TYPES.antena.color
          })
        }
      })

      // Buscar puntos de referencia
      puntosRef.forEach(punto => {
        if (punto.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            punto.ubicacion_descripcion?.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({
            type: 'punto_ref',
            data: punto,
            label: punto.nombre,
            subtitle: punto.ubicacion_descripcion,
            color: ICON_TYPES.punto_ref.color
          })
        }
      })

      setSearchResults(results.slice(0, 8))
      setShowSearch(results.length > 0)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, clientes, antenas, puntosRef])

  // Verificar si hay cliente resaltado en la URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const clienteId = urlParams.get('highlight')
    if (clienteId && !highlightedClient) {
      setHighlightedClient(parseInt(clienteId))
      
      // Enfocar mapa en el cliente
      const cliente = clientes.find(c => c.id === parseInt(clienteId))
      if (cliente && cliente.latitud && cliente.longitud && mapObj.current) {
        mapObj.current.setView([cliente.latitud, cliente.longitud], 16)
        
        // Abrir popup del cliente
        setTimeout(() => {
          const marker = markersRef.current.find(m => {
            const pos = m.getLatLng()
            return Math.abs(pos.lat - cliente.latitud) < 0.0001 && Math.abs(pos.lng - cliente.longitud) < 0.0001
          })
          if (marker) marker.openPopup()
        }, 500)
      }
    }
  }, [clientes, highlightedClient])

  // Función para manejar clic en resultado de búsqueda
  const handleSearchResultClick = (result) => {
    if (!result.data.latitud || !result.data.longitud) return
    
    mapObj.current.setView([result.data.latitud, result.data.longitud], 17)
    setSearchTerm('')
    setShowSearch(false)
    
    // Abrir popup del marcador
    setTimeout(() => {
      const marker = markersRef.current.find(m => {
        const pos = m.getLatLng()
        return Math.abs(pos.lat - result.data.latitud) < 0.0001 && Math.abs(pos.lng - result.data.longitud) < 0.0001
      })
      if (marker) marker.openPopup()
    }, 300)
  }

  // Función para manejar medición de distancias
  const handleMapClickMeasure = useCallback((e) => {
    if (!medirDistancia) return
    
    const newPoint = [e.latlng.lat, e.latlng.lng]
    const newRuta = [...rutaPuntos, newPoint]
    setRutaPuntos(newRuta)
    
    // Calcular distancia total
    if (newRuta.length > 1) {
      const total = calcularDistanciaRuta(newRuta)
      setDistanciaTotal(total)
    }
    
    // Dibujar línea si hay más de un punto
    if (newRuta.length > 1 && window.L) {
      const L = window.L
      const polyline = L.polyline(newRuta, {
        color: '#00ff88',
        weight: 3,
        opacity: 0.8,
        dashArray: '10, 5'
      }).addTo(mapObj.current)
      
      // Agregar marcador en el último punto
      L.circleMarker(newPoint[newPoint.length - 1], {
        radius: 6,
        fillColor: '#00ff88',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.8
      }).addTo(mapObj.current)
    }
  }, [medirDistancia, rutaPuntos])

  // Agregar evento click para medición
  useEffect(() => {
    if (!mapObj.current) return
    
    if (medirDistancia) {
      mapObj.current.on('click', handleMapClickMeasure)
      mapObj.current.getContainer().style.cursor = 'crosshair'
    } else {
      mapObj.current.off('click', handleMapClickMeasure)
      mapObj.current.getContainer().style.cursor = ''
    }
    
    return () => {
      if (mapObj.current) {
        mapObj.current.off('click', handleMapClickMeasure)
        mapObj.current.getContainer().style.cursor = ''
      }
    }
  }, [medirDistancia, handleMapClickMeasure])

  // Función para limpiar medición
  const limpiarMedicion = useCallback(() => {
    setRutaPuntos([])
    setDistanciaTotal(0)
    setMedirDistancia(false)
    
    // Limpiar capas de medición del mapa
    if (mapObj.current && window.L) {
      mapObj.current.eachLayer((layer) => {
        if (layer instanceof window.L.Polyline || layer instanceof window.L.CircleMarker) {
          mapObj.current.removeLayer(layer)
        }
      })
    }
  }, [])

  // Función para actualizar ubicación de cliente
  const actualizarUbicacionCliente = async (clienteId, lat, lng) => {
    try {
      await api(`/clientes/${clienteId}`, {
        method: 'PATCH',
        body: JSON.stringify({ latitud: lat, longitud: lng })
      })
      
      // Actualizar estado local
      setClientes(prev => prev.map(c => 
        c.id === clienteId ? { ...c, latitud: lat, longitud: lng } : c
      ))
      
      alertaExito('Ubicación actualizada correctamente')
      setEditCoord(null)
    } catch (error) {
      console.error('Error actualizando ubicación:', error)
      alertaError('Error al actualizar la ubicación')
    }
  }

  // Función para crear antena
  const crearAntena = async () => {
    try {
      const antenaData = {
        ...nuevaAntena,
        latitud: contextMenu.lat,
        longitud: contextMenu.lng
      }
      
      await api('/antenas', {
        method: 'POST',
        body: JSON.stringify(antenaData)
      })
      
      // Actualizar estado local
      setAntenas(prev => [...prev, { ...antenaData, id: Date.now() }])
      
      alertaExito('Antena creada correctamente')
      setShowModalAntena(false)
      setNuevaAntena({
        nombre: '',
        latitud: 0,
        longitud: 0,
        banda_frecuencia: '',
        potencia_watts: '',
        alcance_approx_metros: '',
        ubicacion_descripcion: '',
        nota_tecnica: ''
      })
      setContextMenu(null)
    } catch (error) {
      console.error('Error creando antena:', error)
      alertaError('Error al crear la antena')
    }
  }

  // Función para crear punto de referencia
  const crearPuntoRef = async () => {
    try {
      const puntoData = {
        nombre: nuevoPunto.nombre,
        latitud: contextMenu.lat,
        longitud: contextMenu.lng,
        ubicacion_descripcion: nuevoPunto.ubicacion_descripcion
      }
      
      await api('/snacks', {
        method: 'POST',
        body: JSON.stringify(puntoData)
      })
      
      // Actualizar estado local
      setPuntosRef(prev => [...prev, { ...puntoData, id: Date.now() }])
      
      alertaExito('Punto de referencia creado correctamente')
      setShowModalPunto(false)
      setNuevoPunto({
        nombre: '',
        latitud: 0,
        longitud: 0,
        ubicacion_descripcion: ''
      })
      setContextMenu(null)
    } catch (error) {
      console.error('Error creando punto de referencia:', error)
      alertaError('Error al crear el punto de referencia')
    }
  }

  // Función para manejar click derecho en mapa
  const handleMapRightClick = (e) => {
    setContextMenu({
      lat: e.latlng.lat,
      lng: e.latlng.lng,
      x: e.originalEvent.clientX,
      y: e.originalEvent.clientY
    })
  }

  // Función para cerrar menú contextual
  const cerrarContextMenu = () => {
    setContextMenu(null)
  }

  // Cerrar menú contextual al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => cerrarContextMenu()
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  // Estadísticas
  const stats = {
    totalClientes: clientes.length,
    clientesConUbicacion: clientes.filter(c => c.latitud && c.longitud).length,
    clientesActivos: clientes.filter(c => c.estado_servicio === 'Activo').length,
    clientesDeudores: clientes.filter(c => c.estado_servicio === 'Deudor').length,
    totalAntenas: antenas.length,
    totalPuntosRef: puntosRef.length,
    reportesActivos: reportes.filter(r => r.estado === 'abierto').length
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: 'calc(100vh - 60px)',
        background: 'var(--surface)'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--outline-variant)',
          borderTop: '3px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}/>
      </div>
    )
  }

  return (
    <>
      <style jsx>{`
        .mapa-container {
          position: relative;
          background: var(--surface);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 8px 32px var(--shadow-color);
          border: 1px solid var(--outline-variant);
          height: calc(100vh - 140px);
          min-height: 600px;
        }

        .search-container {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 1000;
          width: 320px;
        }

        .search-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid var(--outline-variant);
          border-radius: 16px;
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          color: var(--on-surface);
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px var(--shadow-color);
        }

        .search-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 4px rgba(0, 107, 44, 0.1), 0 8px 24px var(--shadow-color);
          transform: translateY(-1px);
        }

        .search-input::placeholder {
          color: var(--on-surface-variant);
        }

        .search-results {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--outline-variant);
          border-radius: 16px;
          box-shadow: 0 8px 32px var(--shadow-color);
          max-height: 320px;
          overflow-y: auto;
          z-index: 1001;
        }

        .search-result-item {
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 1px solid var(--outline-variant);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .search-result-item:last-child {
          border-bottom: none;
        }

        .search-result-item:hover {
          background: var(--surface-container);
          transform: translateX(4px);
        }

        .search-result-icon {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .search-result-content {
          flex: 1;
          min-width: 0;
        }

        .search-result-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--on-surface);
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-result-subtitle {
          font-size: 11px;
          color: var(--on-surface-variant);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .controls-panel {
          position: absolute;
          top: 20px;
          right: 20px;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .control-group {
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--outline-variant);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 8px 32px var(--shadow-color);
          min-width: 200px;
        }

        .control-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        .control-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .control-item:last-child {
          margin-bottom: 0;
        }

        .control-label {
          font-size: 13px;
          color: var(--on-surface);
        }

        .toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
          background: var(--surface-container-high);
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.3s;
        }

        .toggle-switch.active {
          background: var(--primary);
        }

        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .toggle-switch.active::after {
          transform: translateX(20px);
        }

        .btn-control {
          padding: 8px 16px;
          border: none;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .btn-primary {
          background: var(--primary);
          color: var(--on-primary);
          box-shadow: 0 2px 8px rgba(0, 107, 44, 0.3);
        }

        .btn-primary:hover {
          background: var(--primary-container);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0, 107, 44, 0.35);
        }

        .btn-secondary {
          background: var(--surface-container);
          color: var(--on-surface);
          border: 1px solid var(--outline-variant);
        }

        .btn-secondary:hover {
          background: var(--surface-container-high);
          transform: translateY(-1px);
        }

        .btn-danger {
          background: var(--tertiary-container);
          color: var(--on-tertiary);
        }

        .btn-danger:hover {
          background: var(--tertiary);
          transform: translateY(-1px);
        }

        .stats-panel {
          position: absolute;
          bottom: 20px;
          left: 20px;
          z-index: 1000;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
          max-width: 600px;
        }

        .stat-card {
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--outline-variant);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 8px 32px var(--shadow-color);
          transition: all 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px var(--shadow-color);
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 4px;
          font-family: 'JetBrains Mono', monospace;
        }

        .stat-label {
          font-size: 11px;
          color: var(--on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .medicion-info {
          position: absolute;
          top: 80px;
          left: 20px;
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--outline-variant);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 8px 32px var(--shadow-color);
          z-index: 1000;
          min-width: 200px;
        }

        .medicion-value {
          font-size: 20px;
          font-weight: 700;
          color: var(--primary);
          margin-bottom: 8px;
          font-family: 'JetBrains Mono', monospace;
        }

        .medicion-label {
          font-size: 12px;
          color: var(--on-surface-variant);
          margin-bottom: 12px;
        }

        .coordinates-display {
          position: absolute;
          bottom: 20px;
          right: 20px;
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--outline-variant);
          border-radius: 16px;
          padding: 12px 16px;
          box-shadow: 0 8px 32px var(--shadow-color);
          z-index: 1000;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: var(--on-surface-variant);
        }

        .gn-context-menu {
          position: fixed;
          background: var(--glass-bg);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--outline-variant);
          border-radius: 16px;
          box-shadow: 0 8px 32px var(--shadow-color);
          z-index: 10000;
          min-width: 200px;
          padding: 8px;
          animation: contextMenuAppear 0.2s ease-out;
        }

        @keyframes contextMenuAppear {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .gn-context-menu-item {
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--on-surface);
          border: none;
          background: none;
          width: 100%;
          text-align: left;
        }

        .gn-context-menu-item:hover {
          background: var(--surface-container);
          transform: translateX(4px);
        }

        .gn-context-menu-icon {
          width: 16px;
          height: 16px;
          opacity: 0.7;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          z-index: 300;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal {
          background: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: 24px;
          width: 100%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px var(--shadow-color);
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          padding: 24px 28px 20px;
          border-bottom: 1px solid var(--outline-variant);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--on-surface);
          letter-spacing: -0.5px;
        }

        .modal-close {
          background: none;
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          cursor: pointer;
          color: var(--on-surface-variant);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          transition: all 0.2s;
        }

        .modal-close:hover {
          background: var(--surface-container);
          color: var(--on-surface);
        }

        .modal-body {
          padding: 24px 28px;
        }

        .modal-footer {
          padding: 20px 28px;
          border-top: 1px solid var(--outline-variant);
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.4;
          }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .search-container {
            width: 280px;
            top: 10px;
            left: 10px;
          }

          .controls-panel {
            top: 10px;
            right: 10px;
          }

          .stats-panel {
            bottom: 10px;
            left: 10px;
            right: 10px;
            grid-template-columns: repeat(2, 1fr);
          }

          .coordinates-display {
            display: none;
          }

          .medicion-info {
            top: 70px;
            left: 10px;
            right: 10px;
          }
        }
      `}</style>

      <div className="mapa-container">
        {/* Mapa */}
        <div 
          ref={mapRef} 
          style={{ width: '100%', height: '100%' }}
        />

        {/* Buscador */}
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="🔍 Buscar clientes, antenas, puntos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowSearch(searchResults.length > 0)}
          />
          
          {showSearch && (
            <div className="search-results">
              {searchResults.map((result, index) => (
                <div
                  key={index}
                  className="search-result-item"
                  onClick={() => handleSearchResultClick(result)}
                >
                  <div 
                    className="search-result-icon"
                    style={{ backgroundColor: result.color }}
                  />
                  <div className="search-result-content">
                    <div className="search-result-label">{result.label}</div>
                    <div className="search-result-subtitle">{result.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel de Controles */}
        <div className="controls-panel">
          {/* Filtros */}
          <div className="control-group">
            <div className="control-title">Filtros</div>
            
            <div className="control-item">
              <span className="control-label">Clientes</span>
              <div 
                className={`toggle-switch ${filters.clientes ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, clientes: !prev.clientes }))}
              />
            </div>
            
            <div className="control-item">
              <span className="control-label">Antenas</span>
              <div 
                className={`toggle-switch ${filters.antenas ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, antenas: !prev.antenas }))}
              />
            </div>
            
            <div className="control-item">
              <span className="control-label">Puntos Ref.</span>
              <div 
                className={`toggle-switch ${filters.puntosRef ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ ...prev, puntosRef: !prev.puntosRef }))}
              />
            </div>
          </div>

          {/* Herramientas */}
          <div className="control-group">
            <div className="control-title">Herramientas</div>
            
            <button
              className={`btn-control ${medirDistancia ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => medirDistancia ? limpiarMedicion() : setMedirDistancia(true)}
            >
              📏 {medirDistancia ? 'Limpiar' : 'Medir'} Distancia
            </button>
            
            {medirDistancia && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                Click en el mapa para medir
              </div>
            )}
          </div>
        </div>

        {/* Información de Medición */}
        {medirDistancia && rutaPuntos.length > 0 && (
          <div className="medicion-info">
            <div className="medicion-value">
              {distanciaTotal < 1000 
                ? `${distanciaTotal.toFixed(1)} m`
                : `${(distanciaTotal / 1000).toFixed(2)} km`
              }
            </div>
            <div className="medicion-label">
              {rutaPuntos.length} puntos marcados
            </div>
            <button
              className="btn-control btn-danger"
              onClick={limpiarMedicion}
            >
              🗑️ Limpiar
            </button>
          </div>
        )}

        {/* Panel de Estadísticas */}
        <div className="stats-panel">
          <div className="stat-card">
            <div className="stat-value">{stats.totalClientes}</div>
            <div className="stat-label">Clientes Totales</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.clientesConUbicacion}</div>
            <div className="stat-label">Con Ubicación</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.clientesActivos}</div>
            <div className="stat-label">Activos</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.clientesDeudores}</div>
            <div className="stat-label">Deudores</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.totalAntenas}</div>
            <div className="stat-label">Antenas</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{stats.totalPuntosRef}</div>
            <div className="stat-label">Puntos Ref.</div>
          </div>
          
          {stats.reportesActivos > 0 && (
            <div className="stat-card" style={{ border: '2px solid var(--tertiary)' }}>
              <div className="stat-value" style={{ color: 'var(--tertiary)' }}>
                {stats.reportesActivos}
              </div>
              <div className="stat-label">Reportes Activos</div>
            </div>
          )}
        </div>

        {/* Coordenadas del Mouse */}
        {editCoord && (
          <div className="coordinates-display">
            📍 {editCoord.lat.toFixed(6)}, {editCoord.lng.toFixed(6)}
          </div>
        )}

        {/* Menú Contextual */}
        {contextMenu && (
          <div 
            className="gn-context-menu"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`
            }}
          >
            <button
              className="gn-context-menu-item"
              onClick={() => {
                setNuevaAntena(prev => ({ ...prev, latitud: contextMenu.lat, longitud: contextMenu.lng }))
                setShowModalAntena(true)
                cerrarContextMenu()
              }}
            >
              <span className="gn-context-menu-icon">🗼</span>
              Agregar Antena
            </button>
            
            <button
              className="gn-context-menu-item"
              onClick={() => {
                setNuevoPunto(prev => ({ ...prev, latitud: contextMenu.lat, longitud: contextMenu.lng }))
                setShowModalPunto(true)
                cerrarContextMenu()
              }}
            >
              <span className="gn-context-menu-icon">📍</span>
              Agregar Punto Ref.
            </button>
            
            <button
              className="gn-context-menu-item"
              onClick={() => {
                navigator.clipboard.writeText(`${contextMenu.lat}, ${contextMenu.lng}`)
                alertaExito('Coordenadas copiadas')
                cerrarContextMenu()
              }}
            >
              <span className="gn-context-menu-icon">📋</span>
              Copiar Coordenadas
            </button>
            
            <button
              className="gn-context-menu-item"
              onClick={cerrarContextMenu}
            >
              <span className="gn-context-menu-icon">❌</span>
              Cancelar
            </button>
          </div>
        )}

        {/* Modal para Nueva Antena */}
        {showModalAntena && (
          <div className="modal-backdrop" onClick={() => setShowModalAntena(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">🗼 Nueva Antena</h2>
                <button className="modal-close" onClick={() => setShowModalAntena(false)}>
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-row" style={{ marginBottom: '16px' }}>
                  <div className="field-group">
                    <label className="field-label">Nombre</label>
                    <input
                      type="text"
                      className="input"
                      value={nuevaAntena.nombre}
                      onChange={(e) => setNuevaAntena(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Nombre de la antena"
                    />
                  </div>
                </div>

                <div className="form-row cols-2" style={{ marginBottom: '16px' }}>
                  <div className="field-group">
                    <label className="field-label">Banda Frecuencia</label>
                    <input
                      type="text"
                      className="input"
                      value={nuevaAntena.banda_frecuencia}
                      onChange={(e) => setNuevaAntena(prev => ({ ...prev, banda_frecuencia: e.target.value }))}
                      placeholder="Ej: 2.4 GHz"
                    />
                  </div>
                  
                  <div className="field-group">
                    <label className="field-label">Potencia (Watts)</label>
                    <input
                      type="number"
                      className="input"
                      value={nuevaAntena.potencia_watts}
                      onChange={(e) => setNuevaAntena(prev => ({ ...prev, potencia_watts: e.target.value }))}
                      placeholder="Ej: 100"
                    />
                  </div>
                </div>

                <div className="form-row cols-2" style={{ marginBottom: '16px' }}>
                  <div className="field-group">
                    <label className="field-label">Alcance (metros)</label>
                    <input
                      type="number"
                      className="input"
                      value={nuevaAntena.alcance_approx_metros}
                      onChange={(e) => setNuevaAntena(prev => ({ ...prev, alcance_approx_metros: e.target.value }))}
                      placeholder="Ej: 500"
                    />
                  </div>
                  
                  <div className="field-group">
                    <label className="field-label">Coordenadas</label>
                    <input
                      type="text"
                      className="input"
                      value={`${contextMenu.lat.toFixed(6)}, ${contextMenu.lng.toFixed(6)}`}
                      disabled
                      style={{ background: 'var(--surface-container)' }}
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: '16px' }}>
                  <div className="field-group">
                    <label className="field-label">Descripción Ubicación</label>
                    <input
                      type="text"
                      className="input"
                      value={nuevaAntena.ubicacion_descripcion}
                      onChange={(e) => setNuevaAntena(prev => ({ ...prev, ubicacion_descripcion: e.target.value }))}
                      placeholder="Descripción de la ubicación"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="field-group">
                    <label className="field-label">Nota Técnica</label>
                    <textarea
                      className="input"
                      value={nuevaAntena.nota_tecnica}
                      onChange={(e) => setNuevaAntena(prev => ({ ...prev, nota_tecnica: e.target.value }))}
                      placeholder="Notas técnicas adicionales"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowModalAntena(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={crearAntena}>
                  Crear Antena
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para Nuevo Punto de Referencia */}
        {showModalPunto && (
          <div className="modal-backdrop" onClick={() => setShowModalPunto(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">📍 Nuevo Punto de Referencia</h2>
                <button className="modal-close" onClick={() => setShowModalPunto(false)}>
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <div className="form-row" style={{ marginBottom: '16px' }}>
                  <div className="field-group">
                    <label className="field-label">Nombre</label>
                    <input
                      type="text"
                      className="input"
                      value={nuevoPunto.nombre}
                      onChange={(e) => setNuevoPunto(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Nombre del punto de referencia"
                    />
                  </div>
                </div>

                <div className="form-row" style={{ marginBottom: '16px' }}>
                  <div className="field-group">
                    <label className="field-label">Descripción</label>
                    <input
                      type="text"
                      className="input"
                      value={nuevoPunto.ubicacion_descripcion}
                      onChange={(e) => setNuevoPunto(prev => ({ ...prev, ubicacion_descripcion: e.target.value }))}
                      placeholder="Descripción de la ubicación"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="field-group">
                    <label className="field-label">Coordenadas</label>
                    <input
                      type="text"
                      className="input"
                      value={`${contextMenu.lat.toFixed(6)}, ${contextMenu.lng.toFixed(6)}`}
                      disabled
                      style={{ background: 'var(--surface-container)' }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setShowModalPunto(false)}>
                  Cancelar
                </button>
                <button className="btn btn-primary" onClick={crearPuntoRef}>
                  Crear Punto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
