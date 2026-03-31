import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, MapPin, Phone, CheckCircle, AlertCircle, Ban } from 'lucide-react';
import { ClientStatus } from '../types';
import { cn } from '../lib/utils';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: any) => void;
}

export default function ClientModal({ isOpen, onClose, onSave }: ClientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    status: 'Activo' as ClientStatus,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
    setFormData({ name: '', address: '', phone: '', status: 'Activo' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-on-surface flex items-center gap-2">
                <User className="w-6 h-6 text-primary" />
                Nuevo Cliente
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant flex items-center gap-2">
                    <User className="w-4 h-4" /> Nombre Completo
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Dirección
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    placeholder="Ej: Calle Falsa 123"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Teléfono
                  </label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 rounded-xl border-none focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    placeholder="Ej: +54 9 11 ..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-on-surface-variant">Estado Inicial</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['Activo', 'Cortado', 'Suspendido'] as ClientStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s })}
                        className={cn(
                          "py-3 rounded-xl text-xs font-bold flex flex-col items-center gap-2 transition-all border-2",
                          formData.status === s 
                            ? "bg-primary/5 border-primary text-primary" 
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        {s === 'Activo' && <CheckCircle className="w-5 h-5" />}
                        {s === 'Cortado' && <Ban className="w-5 h-5" />}
                        {s === 'Suspendido' && <AlertCircle className="w-5 h-5" />}
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
