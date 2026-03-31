import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, Plus, Minus, Navigation, Layers, MapPin, Radio, Flag, AlertTriangle, X, Phone, MessageCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Map() {
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [activeLayers, setActiveLayers] = useState(['Clientes', 'Nodos']);

  const markers = [
    { id: 1, type: 'cliente', status: 'activo', lat: 30, lng: 40, name: 'Roberto M.', address: 'Calle 10 #45', id_client: '1042' },
    { id: 2, type: 'cliente', status: 'alerta', lat: 55, lng: 62, name: 'Casa Blanca', address: 'Av. Libertador 1200', id_client: '2055' },
    { id: 3, type: 'antena', status: 'online', lat: 42, lng: 52, name: 'Nodo Principal Oeste', uptime: '99.9%', clients: 45 },
    { id: 4, type: 'landmark', status: 'normal', lat: 25, lng: 25, name: 'Punto de Referencia' },
  ];

  const toggleLayer = (layer: string) => {
    setActiveLayers(prev => 
      prev.includes(layer) ? prev.filter(l => l !== layer) : [...prev, layer]
    );
  };

  return (
    <div className="fixed inset-0 pt-16 pb-24 md:pb-0 md:ml-0 overflow-hidden">
      {/* Interactive Map Placeholder */}
      <div className="absolute inset-0 bg-surface-container-low overflow-hidden">
        <img 
          className="w-full h-full object-cover opacity-60 grayscale-[0.2]" 
          src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=1920&h=1080&fit=crop" 
          alt="Map Background"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/90 via-transparent to-surface/90 pointer-events-none" />

        {/* Map Markers Visualization */}
        {markers.map((marker) => (
          <motion.div
            key={marker.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.1, zIndex: 40 }}
            onClick={() => setSelectedMarker(marker)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            style={{ top: `${marker.lat}%`, left: `${marker.lng}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="relative">
                {marker.type === 'cliente' ? (
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <MapPin className={cn(
                      "w-12 h-12",
                      marker.status === 'activo' ? "text-primary fill-primary/20" : "text-tertiary fill-tertiary/20"
                    )} />
                    {marker.status === 'alerta' && <AlertTriangle className="absolute text-white w-3 h-3 top-2" />}
                  </div>
                ) : marker.type === 'antena' ? (
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <MapPin className="w-14 h-14 text-secondary fill-secondary/20" />
                    <Radio className="absolute text-white w-5 h-5 top-2.5 animate-pulse" />
                  </div>
                ) : (
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-orange-500 fill-orange-500/20" />
                    <Flag className="absolute text-white w-3 h-3 top-2" />
                  </div>
                )}
              </div>
              <div className="hidden group-hover:block absolute top-12 bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-xl text-[10px] font-bold whitespace-nowrap z-50">
                {marker.name}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Overlays */}
      {/* Top Search Bar */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-30">
        <div className="glass-effect bg-white/80 rounded-full px-6 py-3 flex items-center gap-4 shadow-xl border border-white/20">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-slate-400 text-sm outline-none"
            placeholder="Buscar clientes, nodos o coordenadas..."
            type="text"
          />
          <div className="h-6 w-[1px] bg-slate-200" />
          <button className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Filter className="w-5 h-5" />
            Filtrar
          </button>
        </div>
      </div>

      {/* Selected Marker Details */}
      <AnimatePresence>
        {selectedMarker && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-24 right-6 w-80 glass-effect bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50 z-40"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  selectedMarker.type === 'cliente' ? "bg-primary/10 text-primary" : 
                  selectedMarker.type === 'antena' ? "bg-secondary/10 text-secondary" : "bg-orange-500/10 text-orange-500"
                )}>
                  {selectedMarker.type === 'cliente' ? <MapPin className="w-6 h-6" /> : 
                   selectedMarker.type === 'antena' ? <Radio className="w-6 h-6" /> : <Flag className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-on-surface">{selectedMarker.name}</h3>
                  <p className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">{selectedMarker.type}</p>
                </div>
              </div>
              <button onClick={() => setSelectedMarker(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {selectedMarker.type === 'cliente' ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dirección</p>
                  <p className="text-sm text-on-surface font-medium">{selectedMarker.address}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-primary/20">
                    <Phone className="w-4 h-4" /> Llamar
                  </button>
                  <button className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-green-500/20">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </button>
                </div>
              </div>
            ) : selectedMarker.type === 'antena' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Uptime</p>
                    <p className="text-sm text-on-surface font-bold">{selectedMarker.uptime}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Clientes</p>
                    <p className="text-sm text-on-surface font-bold">{selectedMarker.clients}</p>
                  </div>
                </div>
                <button className="w-full py-3 bg-secondary text-white rounded-xl text-xs font-bold shadow-lg shadow-secondary/20">
                  Ver Estadísticas del Nodo
                </button>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right Side: View Controls */}
      <div className="absolute top-24 right-6 flex flex-col gap-3 z-30">
        <div className="glass-effect bg-white/80 p-2 rounded-xl flex flex-col shadow-lg border border-white/20">
          <button className="p-3 rounded-lg hover:bg-white text-on-surface-variant hover:text-primary transition-all active:scale-90" title="Acercar">
            <Plus className="w-5 h-5" />
          </button>
          <div className="h-[1px] w-full bg-slate-200/50 mx-auto" />
          <button className="p-3 rounded-lg hover:bg-white text-on-surface-variant hover:text-primary transition-all active:scale-90" title="Alejar">
            <Minus className="w-5 h-5" />
          </button>
        </div>
        <div className="glass-effect bg-white/80 p-2 rounded-xl shadow-lg border border-white/20">
          <button className="p-3 rounded-lg hover:bg-white text-on-surface-variant hover:text-primary transition-all active:scale-90" title="Mi Ubicación">
            <Navigation className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Left: Floating Legend */}
      <div className="absolute bottom-24 md:bottom-10 left-6 z-30">
        <div className="glass-effect bg-white/80 p-4 rounded-2xl shadow-xl border border-white/20 w-64 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm tracking-tight text-on-surface">LEYENDA DE RED</h3>
            <Minus className="w-4 h-4 text-slate-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary fill-primary/20" />
              </div>
              <span className="text-xs font-medium text-on-surface-variant">Cliente Activo</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-tertiary/10 rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-tertiary fill-tertiary/20" />
              </div>
              <span className="text-xs font-medium text-on-surface-variant">Cliente con Alerta</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-secondary/10 rounded-full flex items-center justify-center">
                <Radio className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-xs font-medium text-on-surface-variant">Nodo / Antena</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Right: Layer Toggles */}
      <div className="absolute bottom-24 md:bottom-10 right-6 z-30">
        <div className="glass-effect bg-white/80 p-2 rounded-2xl shadow-xl border border-white/20 flex flex-col gap-2">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary text-white shadow-lg active:scale-95 transition-all">
            <Layers className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Capas</span>
          </button>
          <div className="hidden md:flex flex-col p-2 gap-1">
            {['Clientes', 'Nodos', 'Cobertura'].map((layer) => (
              <label key={layer} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                <input 
                  checked={activeLayers.includes(layer)} 
                  onChange={() => toggleLayer(layer)}
                  className="rounded text-primary focus:ring-primary w-4 h-4 border-slate-300" 
                  type="checkbox"
                />
                <span className="text-[11px] font-semibold text-slate-600">{layer}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
