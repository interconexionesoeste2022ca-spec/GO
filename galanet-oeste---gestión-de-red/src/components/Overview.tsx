import React from 'react';
import { motion } from 'motion/react';
import { Users, CheckCircle, Ban, Wallet, MapPin, History, CheckCircle2, Activity, Plus, TrendingUp, ArrowUpRight, ArrowDownRight, Wifi, Server, Database, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Overview() {
  const metrics = [
    { label: 'Total Clientes', value: '1,284', trend: '+12%', trendUp: true, icon: Users, color: 'primary' },
    { label: 'Activos', value: '1,150', trend: '+5%', trendUp: true, icon: CheckCircle, color: 'primary' },
    { label: 'Cortados', value: '134', trend: '-2%', trendUp: false, icon: Ban, color: 'tertiary' },
    { label: 'Recaudación', value: '$4.2M', trend: '+8%', trendUp: true, icon: Wallet, color: 'primary' },
  ];

  const zones = [
    { name: 'Zona Norte', count: 450, percentage: 85, color: 'bg-primary' },
    { name: 'Barrio Centro', count: 320, percentage: 92, color: 'bg-green-500' },
    { name: 'Oeste Country', count: 280, percentage: 78, color: 'bg-amber-500' },
    { name: 'Parque Industrial', count: 234, percentage: 95, color: 'bg-blue-500' },
  ];

  const systemStatus = [
    { name: 'Backbone Principal', status: 'Online', icon: Wifi, latency: '12ms' },
    { name: 'Nodo Central', status: 'Online', icon: Server, latency: '8ms' },
    { name: 'API Gateway', status: 'Online', icon: Database, latency: '45ms' },
  ];

  return (
    <div className="space-y-10 pb-24">
      {/* Welcome Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">¡Hola, Admin!</h1>
          <p className="text-on-surface-variant font-medium mt-1">Martes, 31 de Marzo de 2026</p>
        </motion.div>
        <motion.button 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-surface-container-highest text-primary font-semibold py-2.5 px-6 rounded-full flex items-center gap-2 hover:bg-surface-variant transition-all active:scale-95 shadow-sm"
        >
          <History className="w-5 h-5" />
          Periodo Actual
        </motion.button>
      </header>

      {/* Metrics Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                "bg-surface-container-lowest p-6 rounded-2xl shadow-[0px_12px_32px_rgba(17,28,45,0.06)] border-l-4 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300",
                metric.color === 'primary' ? "border-primary" : "border-tertiary"
              )}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={cn("p-3 rounded-lg", metric.color === 'primary' ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary")}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className={cn(
                  "flex items-center gap-0.5 text-xs font-bold px-2 py-1 rounded-lg",
                  metric.trendUp ? "text-green-600 bg-green-50" : "text-error bg-red-50"
                )}>
                  {metric.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {metric.trend}
                </div>
              </div>
              <h3 className="text-on-surface-variant text-sm font-medium">{metric.label}</h3>
              <p className={cn("text-3xl font-bold mt-1", metric.color === 'primary' ? "text-on-surface" : "text-tertiary")}>
                {metric.value}
              </p>
              
              {/* Decorative Chart Line */}
              <div className="absolute bottom-0 right-0 w-24 h-12 opacity-20 group-hover:opacity-40 transition-opacity">
                <svg className="w-full h-full" viewBox="0 0 100 40">
                  <path 
                    className={metric.color === 'primary' ? "stroke-primary" : "stroke-tertiary"} 
                    d="M0 35 Q 25 35, 50 20 T 100 10" 
                    fill="none" 
                    strokeWidth="4" 
                  />
                </svg>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Lists & Updates */}
        <div className="lg:col-span-2 space-y-8">
          {/* System Status Bento */}
          <section className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm border border-outline-variant/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-black text-on-surface">Estado del Sistema</h2>
                <p className="text-sm text-outline">Monitoreo en tiempo real de la infraestructura</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-full text-xs font-bold animate-pulse">
                <div className="w-2 h-2 rounded-full bg-green-600" />
                SISTEMA OPERATIVO
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {systemStatus.map((item, index) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/5 flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    <item.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-green-600 uppercase tracking-tighter">{item.status}</span>
                      <span className="text-[10px] font-bold text-outline uppercase tracking-tighter">{item.latency}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Clientes por Zona Section */}
          <section className="bg-surface-container-low p-8 rounded-2xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                Clientes por Zona
              </h2>
              <button className="text-sm font-semibold text-secondary hover:underline">Ver detalle</button>
            </div>
            <div className="space-y-6">
              {zones.map((zone, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-on-surface font-bold">{zone.name}</span>
                    <span className="text-on-surface-variant">{zone.count} Clientes ({zone.percentage}%)</span>
                  </div>
                  <div className="w-full h-3 bg-surface-container-highest rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${zone.percentage}%` }}
                      transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                      className={cn("h-full rounded-full transition-all duration-1000", zone.color)} 
                    ></motion.div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Side: Status & Illustration */}
        <div className="space-y-8">
          <section className="bg-surface-container-low p-8 rounded-2xl h-full flex flex-col items-center justify-center text-center">
            <div className="w-full text-left mb-6">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6" />
                Actividad Reciente
              </h2>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full">
              {[
                { user: 'Juan Pérez', action: 'Pago realizado', time: 'hace 5 min', icon: CheckCircle2, color: 'text-green-500' },
                { user: 'María García', action: 'Nuevo reporte', time: 'hace 12 min', icon: AlertTriangle, color: 'text-amber-500' },
                { user: 'Carlos Ruiz', action: 'Servicio cortado', time: 'hace 1 hora', icon: Ban, color: 'text-error' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="flex gap-4 w-full text-left p-3 bg-white/40 rounded-xl"
                >
                  <div className={cn("w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0", item.color)}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{item.user}</p>
                    <p className="text-xs text-on-surface-variant">{item.action}</p>
                    <p className="text-[10px] text-outline font-bold uppercase mt-1">{item.time}</p>
                  </div>
                </motion.div>
              ))}
              <button className="w-full py-4 bg-surface-container-low text-on-surface font-bold rounded-2xl hover:bg-surface-container transition-colors">
                Ver todo el historial
              </button>
            </div>
          </section>

          {/* Quick Action Card */}
          <section className="bg-primary rounded-2xl p-8 text-white shadow-xl shadow-primary/20 relative overflow-hidden group">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative z-10">
              <TrendingUp className="w-12 h-12 mb-6 opacity-80" />
              <h3 className="text-2xl font-black mb-2">Crecimiento</h3>
              <p className="text-white/70 text-sm mb-8">Has sumado 45 nuevos clientes este mes. ¡Buen trabajo!</p>
              <button className="w-full py-4 bg-white text-primary font-bold rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all">
                Ver Reporte
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Floating Action Button */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-24 md:bottom-8 right-8 z-50 bg-primary hover:bg-primary-container text-white w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all group"
      >
        <Plus className="w-8 h-8 transition-transform group-hover:rotate-90" />
      </motion.button>
    </div>
  );
}
