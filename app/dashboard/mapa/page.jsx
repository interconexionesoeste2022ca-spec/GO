'use client'
import { useEffect, useState, useRef } from 'react'
import { api, getSesion, tienePermiso, alertaExito, alertaError } from '@/lib/api'

const ESTADO_COLOR = {
  Activo: '#16a34a',
  Cortado: '#dc2626',
  Deudor: '#d97706',
  Suspendido: '#6b7280',
}

function makeIcon(estado) {
  const color = ESTADO_COLOR[estado] || ESTADO_COLOR.Activo
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 40C16 40 32 25.5 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 25.5 16 40 16 40Z" fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="16" cy="16" r="8" fill="white" opacity="0.9"/>
      <circle cx="16" cy="16" r="4" fill="${color}"/>
    </svg>
  `)}`
}

export default function MapaPage() {
  const sesion = getSesion()
  const canWrite = tienePermiso(sesion?.rol, 'write')
  const mapRef = useRef(null)
  const mapObj = useRef(null)
  const markersRef = useRef([])
  const [leafletLoaded, setLeafletLoaded] = useState(false)
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
  const [contextMenu, setContextMenu] = useState(null)

  // Cargar Leaflet
  useEffect(() => {
    const loadLeaflet = () => {
      if (window.L) {
        setLeafletLoaded(true)
        return
      }

      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => {
        setLeafletLoaded(true)
      }
      document.head.appendChild(script)
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
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Inicializar mapa
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapObj.current) return

    const L = window.L
    const map = L.map(mapRef.current, {
      center: [10.067, -69.347], // Barquisimeto
      zoom: 13,
      zoomControl: true
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map)

    // Eventos del mapa
    map.on('click', (e) => {
      if (medirDistancia) {
        handleMapClickMeasure(e)
      }
    })

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
  }, [leafletLoaded])

  // Renderizar marcadores
  useEffect(() => {
    if (!mapObj.current || !leafletLoaded) return
    const L = window.L

    // Limpiar marcadores existentes
    markersRef.current.forEach(marker => {
      mapObj.current.removeLayer(marker)
    })
    markersRef.current = []

    // Clientes
    if (filters.clientes) {
      clientes.forEach(cliente => {
        if (!cliente.latitud || !cliente.longitud) return
        if (!filters.estados[cliente.estado_servicio]) return

        const tieneAlerta = reportes.some(r => r.cliente_id === cliente.id && r.estado === 'abierto')
        const icon = L.divIcon({
          html: `<div style="position:relative;">
            <img src="${makeIcon(cliente.estado_servicio)}" style="width:32px;height:40px;"/>
            ${tieneAlerta ? '<div style="position:absolute;top:0;right:0;background:red;color:white;border-radius:50%;width:16px;height:16px;font-size:10px;display:flex;align-items:center;justify-content:center;">!</div>' : ''}
          </div>`,
          className: 'custom-marker',
          iconSize: [32, 40],
          iconAnchor: [16, 40]
        })

        const popup = L.popup().setContent(`
          <div style="min-width:200px;font-family:sans-serif;">
            <strong>${cliente.nombre_razon_social}</strong><br>
            📍 ${cliente.direccion_ubicacion || 'Sin dirección'}<br>
            📞 ${cliente.telefono || 'Sin teléfono'}<br>
            📦 ${cliente.planes?.nombre_plan || 'Sin plan'}<br>
            <span style="background:${ESTADO_COLOR[cliente.estado_servicio]};color:white;padding:2px 8px;border-radius:12px;font-size:11px;">${cliente.estado_servicio}</span>
            ${tieneAlerta ? '<span style="background:red;color:white;padding:2px 8px;border-radius:12px;font-size:11px;margin-left:4px;">⚠️ Reporte activo</span>' : ''}
          </div>
        `)

        const marker = L.marker([cliente.latitud, cliente.longitud], { icon })
          .addTo(mapObj.current)
          .bindPopup(popup)

        markersRef.current.push(marker)
      })
    }

    // Antenas
    if (filters.antenas) {
      antenas.forEach(antena => {
        const icon = L.divIcon({
          html: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 40C16 40 32 25.5 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 25.5 16 40 16 40Z" fill="#2563eb" stroke="white" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">🗼</text>
            </svg>
          `)}" style="width:32px;height:40px;"/>`,
          className: 'custom-marker',
          iconSize: [32, 40],
          iconAnchor: [16, 40]
        })

        const popup = L.popup().setContent(`
          <div style="min-width:200px;font-family:sans-serif;">
            <strong>🗼 ${antena.nombre}</strong><br>
            📍 ${antena.ubicacion_descripcion || 'Sin descripción'}<br>
            📡 ${antena.banda_frecuencia || 'N/A'}<br>
            ⚡ ${antena.potencia_watts || 'N/A'}W<br>
            📏 ${antena.alcance_approx_metros || 'N/A'}m<br>
            <span style="background:${antena.activa ? '#dcfce7' : '#fee2e2'};color:${antena.activa ? '#166534' : '#991b1b'};padding:2px 8px;border-radius:12px;font-size:11px;">
              ${antena.activa ? '✅ Activa' : '❌ Inactiva'}
            </span>
          </div>
        `)

        const marker = L.marker([antena.latitud, antena.longitud], { icon })
          .addTo(mapObj.current)
          .bindPopup(popup)

        markersRef.current.push(marker)
      })
    }

    // Puntos de referencia
    if (filters.puntosRef) {
      puntosRef.forEach(punto => {
        const icon = L.divIcon({
          html: `<img src="data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 40C16 40 32 25.5 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 25.5 16 40 16 40Z" fill="#f59e0b" stroke="white" stroke-width="2"/>
              <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">📍</text>
            </svg>
          `)}" style="width:32px;height:40px;"/>`,
          className: 'custom-marker',
          iconSize: [32, 40],
          iconAnchor: [16, 40]
        })

        const popup = L.popup().setContent(`
          <div style="min-width:200px;font-family:sans-serif;">
            <strong>📍 ${punto.nombre}</strong><br>
            ${punto.ubicacion_descripcion || 'Sin descripción'}
          </div>
        `)

        const marker = L.marker([punto.latitud, punto.longitud], { icon })
          .addTo(mapObj.current)
          .bindPopup(popup)

        markersRef.current.push(marker)
      })
    }

  }, [clientes, antenas, puntosRef, filters, reportes, leafletLoaded])

  // Búsqueda
  useEffect(() => {
    if (!searchTerm) {
      setSearchResults([])
      setShowSearch(false)
      return
    }

    const timeoutId = setTimeout(() => {
      const results = []

      clientes.forEach(cliente => {
        if (cliente.nombre_razon_social?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cliente.documento_identidad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cliente.zona_sector?.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({
            type: 'cliente',
            data: cliente,
            label: cliente.nombre_razon_social,
            subtitle: cliente.zona_sector || cliente.direccion_ubicacion,
            color: ESTADO_COLOR[cliente.estado_servicio] || ESTADO_COLOR.Activo
          })
        }
      })

      antenas.forEach(antena => {
        if (antena.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            antena.ubicacion_descripcion?.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({
            type: 'antena',
            data: antena,
            label: antena.nombre,
            subtitle: antena.ubicacion_descripcion,
            color: '#2563eb'
          })
        }
      })

      puntosRef.forEach(punto => {
        if (punto.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            punto.ubicacion_descripcion?.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push({
            type: 'punto_ref',
            data: punto,
            label: punto.nombre,
            subtitle: punto.ubicacion_descripcion,
            color: '#f59e0b'
          })
        }
      })

      setSearchResults(results.slice(0, 8))
      setShowSearch(results.length > 0)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, clientes, antenas, puntosRef])

  // Click en resultado de búsqueda
  const handleSearchResultClick = (result) => {
    if (!result.data.latitud || !result.data.longitud) return
    
    mapObj.current.setView([result.data.latitud, result.data.longitud], 17)
    setSearchTerm('')
    setShowSearch(false)
    
    setTimeout(() => {
      const marker = markersRef.current.find(m => {
        const pos = m.getLatLng()
        return Math.abs(pos.lat - result.data.latitud) < 0.0001 && Math.abs(pos.lng - result.data.longitud) < 0.0001
      })
      if (marker) marker.openPopup()
    }, 300)
  }

  // Medición de distancias
  const handleMapClickMeasure = (e) => {
    if (!medirDistancia) return
    
    const newPoint = [e.latlng.lat, e.latlng.lng]
    const newRuta = [...rutaPuntos, newPoint]
    setRutaPuntos(newRuta)
    
    if (newRuta.length > 1) {
      let total = 0
      for (let i = 0; i < newRuta.length - 1; i++) {
        const [lat1, lon1] = newRuta[i]
        const [lat2, lon2] = newRuta[i + 1]
        const R = 6371000
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        total += R * c
      }
      setDistanciaTotal(total)
      
      if (window.L) {
        const L = window.L
        L.polyline([newRuta[newRuta.length - 2], newPoint], {
          color: '#16a34a',
          weight: 3,
          opacity: 0.8,
          dashArray: '10, 5'
        }).addTo(mapObj.current)
        
        L.circleMarker(newPoint, {
          radius: 6,
          fillColor: '#16a34a',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(mapObj.current)
      }
    }
  }

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
  }, [medirDistancia, rutaPuntos])

  const limpiarMedicion = () => {
    setRutaPuntos([])
    setDistanciaTotal(0)
    setMedirDistancia(false)
    
    if (mapObj.current && window.L) {
      mapObj.current.eachLayer((layer) => {
        if (layer instanceof window.L.Polyline || layer instanceof window.L.CircleMarker) {
          mapObj.current.removeLayer(layer)
        }
      })
    }
  }

  // Cerrar menú contextual
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  // Funciones del menú contextual
  const handleAddAntena = () => {
    alert('Función de agregar antena en desarrollo')
    setContextMenu(null)
  }

  const handleAddPunto = () => {
    alert('Función de agregar punto en desarrollo')
    setContextMenu(null)
  }

  const handleCopyCoords = () => {
    navigator.clipboard.writeText(`${contextMenu.lat.toFixed(6)}, ${contextMenu.lng.toFixed(6)}`)
    alertaExito('Coordenadas copiadas')
    setContextMenu(null)
  }

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
        background: '#f6f8fa'
      }}>
        <div>Cargando mapa...</div>
      </div>
    )
  }

  return (
    <>
      <style jsx>{`
        .mapa-container {
          position: relative;
          background: white;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 24px rgba(0,0,0,0.1);
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
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          color: #1f2937;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          outline: none;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .search-input:focus {
          border-color: #16a34a;
          box-shadow: 0 0 0 3px rgba(22,163,74,0.1);
        }

        .search-results {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          max-height: 300px;
          overflow-y: auto;
          z-index: 1001;
        }

        .search-result-item {
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .search-result-item:hover {
          background: #f8fafc;
        }

        .search-result-item:last-child {
          border-bottom: none;
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
          color: #1f2937;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .search-result-subtitle {
          font-size: 11px;
          color: #6b7280;
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
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          min-width: 200px;
        }

        .control-title {
          font-size: 12px;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
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
          color: #374151;
        }

        .toggle-switch {
          position: relative;
          width: 44px;
          height: 24px;
          background: #e5e7eb;
          border-radius: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .toggle-switch.active {
          background: #16a34a;
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
          transition: transform 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .toggle-switch.active::after {
          transform: translateX(20px);
        }

        .btn-control {
          padding: 8px 16px;
          border: none;
          border-radius: 8px;
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
          background: #16a34a;
          color: white;
        }

        .btn-primary:hover {
          background: #15803d;
        }

        .btn-secondary {
          background: #f8fafc;
          color: #374151;
          border: 1px solid #e2e8f0;
        }

        .btn-secondary:hover {
          background: #f1f5f9;
        }

        .btn-danger {
          background: #fee2e2;
          color: #991b1b;
        }

        .btn-danger:hover {
          background: #fecaca;
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
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #16a34a;
          margin-bottom: 4px;
          font-family: 'JetBrains Mono', monospace;
        }

        .stat-label {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .medicion-info {
          position: absolute;
          top: 80px;
          left: 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          z-index: 1000;
          min-width: 200px;
        }

        .medicion-value {
          font-size: 20px;
          font-weight: 700;
          color: #16a34a;
          margin-bottom: 8px;
          font-family: 'JetBrains Mono', monospace;
        }

        .medicion-label {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 12px;
        }

        .gn-context-menu {
          position: fixed;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          z-index: 10000;
          min-width: 180px;
          padding: 8px;
        }

        .gn-context-menu-item {
          padding: 10px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #374151;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
        }

        .gn-context-menu-item:hover {
          background: #f8fafc;
        }

        .gn-context-menu-icon {
          width: 16px;
          height: 16px;
          opacity: 0.7;
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

          {/* Estados de Clientes */}
          <div className="control-group">
            <div className="control-title">Estados Clientes</div>
            
            <div className="control-item">
              <span className="control-label">Activos</span>
              <div 
                className={`toggle-switch ${filters.estados.Activo ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  estados: { ...prev.estados, Activo: !prev.estados.Activo }
                }))}
              />
            </div>
            
            <div className="control-item">
              <span className="control-label">Deudores</span>
              <div 
                className={`toggle-switch ${filters.estados.Deudor ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  estados: { ...prev.estados, Deudor: !prev.estados.Deudor }
                }))}
              />
            </div>
            
            <div className="control-item">
              <span className="control-label">Cortados</span>
              <div 
                className={`toggle-switch ${filters.estados.Cortado ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  estados: { ...prev.estados, Cortado: !prev.estados.Cortado }
                }))}
              />
            </div>
            
            <div className="control-item">
              <span className="control-label">Suspendidos</span>
              <div 
                className={`toggle-switch ${filters.estados.Suspendido ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  estados: { ...prev.estados, Suspendido: !prev.estados.Suspendido }
                }))}
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
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
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
              style={{ marginTop: '12px' }}
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
            <div className="stat-card" style={{ border: '2px solid #ef4444' }}>
              <div className="stat-value" style={{ color: '#ef4444' }}>
                {stats.reportesActivos}
              </div>
              <div className="stat-label">Reportes Activos</div>
            </div>
          )}
        </div>

        {/* Menú Contextual */}
        {contextMenu && (
          <div 
            className="gn-context-menu"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`
            }}
          >
            {canWrite && (
              <button
                className="gn-context-menu-item"
                onClick={handleAddAntena}
              >
                <span className="gn-context-menu-icon">🗼</span>
                Agregar Antena
              </button>
            )}
            
            {canWrite && (
              <button
                className="gn-context-menu-item"
                onClick={handleAddPunto}
              >
                <span className="gn-context-menu-icon">📍</span>
                Agregar Punto Ref.
              </button>
            )}
            
            <button
              className="gn-context-menu-item"
              onClick={handleCopyCoords}
            >
              <span className="gn-context-menu-icon">📋</span>
              Copiar Coordenadas
            </button>
            
            <button
              className="gn-context-menu-item"
              onClick={() => setContextMenu(null)}
            >
              <span className="gn-context-menu-icon">❌</span>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </>
  )
}
