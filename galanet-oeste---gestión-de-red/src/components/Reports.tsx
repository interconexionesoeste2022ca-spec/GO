import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PlusCircle, TrendingUp, CheckCircle, AlertCircle, Clock, ChevronRight, BarChart3, Info } from 'lucide-react';
import { MOCK_INCIDENTS, SYSTEM_STATUS } from '../constants';
import { cn } from '../lib/utils';
import ReportModal from './ReportModal';

export default function Reports() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);

  const stats = [
    { label: 'Reportes Abiertos', value: incidents.length.toString(), trend: '+3 desde la última hora', icon: AlertCircle, color: 'tertiary' },
    { label: 'Cerrados Hoy', value: '32', trend: '88% tasa de resolución', icon: CheckCircle, color: 'primary' },
  ];

  const days = ['LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB', 'DOM'];
  const data = [40, 65, 90, 55, 75, 30, 20];

  const handleAddReport = (newReport: any) => {
    setIncidents([newReport, ...incidents]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1">Central de Incidencias</h1>
          <p className="text-on-surface-variant font-medium">Monitoreo de red y soporte técnico en tiempo real.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-6 py-3 rounded-full font-semibold shadow-lg hover:opacity-90 active:scale-95 transition-all"
        >
          <PlusCircle className="w-5 h-5" />
          Crear Nuevo Reporte
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 flex flex-col gap-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-surface-container-lowest p-6 rounded-xl relative overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm"
                >
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1", stat.color === 'primary' ? "bg-primary" : "bg-tertiary")}></div>
                  <div>
                    <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">{stat.label}</span>
                    <div className="text-4xl font-extrabold text-on-surface mt-2">{stat.value}</div>
                  </div>
                  <div className={cn("flex items-center gap-2 font-medium text-sm", stat.color === 'primary' ? "text-primary" : "text-tertiary")}>
                    {stat.color === 'primary' ? <CheckCircle className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    {stat.trend}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                Incidencias Activas
              </h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 rounded-full bg-surface-container-high text-xs font-bold text-on-surface-variant">Prioridad: Alta</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {incidents.map((incident, i) => (
                  <motion.div 
                    key={incident.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "bg-surface-container-lowest p-5 rounded-xl border-l-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-surface-container-low group",
                      incident.priority === 'Alta' ? "border-tertiary" : 
                      incident.priority === 'Media' ? "border-secondary" : "border-primary"
                    )}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded uppercase",
                          incident.priority === 'Alta' ? "bg-tertiary/10 text-tertiary" : 
                          incident.priority === 'Media' ? "bg-secondary/10 text-secondary" : "bg-primary/10 text-primary"
                        )}>
                          {incident.priority}
                        </span>
                        <h3 className="font-bold text-on-surface text-lg">{incident.title}</h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant">
                        <span className="flex items-center gap-1"><BarChart3 className="w-4 h-4" /> {incident.client}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {incident.timeAgo}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-lg">
                        {incident.techAvatar ? (
                          <img 
                            src={incident.techAvatar} 
                            alt={incident.assignedTo} 
                            className="w-6 h-6 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-surface-dim flex items-center justify-center text-[10px] font-bold">--</div>
                        )}
                        <span className={cn(
                          "text-xs font-semibold",
                          incident.assignedTo ? "text-on-surface" : "text-slate-400 italic"
                        )}>
                          {incident.assignedTo || 'Sin asignar'}
                        </span>
                      </div>
                      <button className="p-2 rounded-full bg-surface-container-high text-on-surface group-hover:bg-primary group-hover:text-white transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        </div>

        <aside className="md:col-span-4 flex flex-col gap-8">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm">
            <h3 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Volumen Semanal
            </h3>
            <div className="h-48 flex items-end justify-between gap-2 px-2">
              {days.map((day, i) => (
                <div key={day} className="flex flex-col items-center gap-2 w-full">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${data[i]}%` }}
                    transition={{ delay: i * 0.1, type: 'spring', stiffness: 50 }}
                    className={cn(
                      "w-full rounded-t-sm relative group transition-all duration-500",
                      data[i] > 80 ? "bg-primary" : "bg-surface-container-high"
                    )}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                      {Math.floor(data[i] / 4)}
                    </div>
                  </motion.div>
                  <span className="text-[10px] font-bold text-on-surface-variant">{day}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-on-surface-variant text-center mt-6">
              Promedio de resolución: <strong className="text-on-surface">3.4h</strong>
            </p>
          </div>

          <div className="bg-slate-900 text-white p-6 rounded-xl">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Estado del Sistema
            </h4>
            <ul className="space-y-4 text-sm">
              {SYSTEM_STATUS.map((item) => (
                <li key={item.name} className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="opacity-80">{item.name}</span>
                  <span className={cn(
                    "flex items-center gap-1 font-bold",
                    item.status === 'Online' ? "text-primary" : "text-tertiary"
                  )}>
                    <span className={cn("w-2 h-2 rounded-full", item.status === 'Online' ? "bg-primary" : "bg-tertiary")}></span>
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <ReportModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddReport} 
      />
    </div>
  );
}
