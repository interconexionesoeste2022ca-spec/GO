import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Phone, MessageSquare, Eye, UserPlus, Plus, ChevronRight, MoreVertical, CheckCircle, AlertCircle, Ban } from 'lucide-react';
import { MOCK_CLIENTS } from '../constants';
import { Client, ClientStatus } from '../types';
import { cn } from '../lib/utils';
import ClientModal from './ClientModal';

export default function Clients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<ClientStatus | 'Todos'>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);

  const filters = ['Todos', 'Activo', 'Cortado', 'Suspendido'];
  const zones = ['Zona Norte', 'Barrio Centro', 'Oeste Country', 'Parque Industrial'];

  const filteredClients = useMemo(() => {
    return clients.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           client.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === 'Todos' || client.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, activeFilter, clients]);

  const handleAddClient = (newClientData: any) => {
    const newClient: Client = {
      id: (clients.length + 1).toString(),
      id_client: (1000 + clients.length + 1).toString(),
      name: newClientData.name,
      address: newClientData.address,
      phone: newClientData.phone,
      status: newClientData.status,
      balance: 0,
      lastPayment: new Date().toISOString().split('T')[0],
      plan: 'Básico',
      zone: 'Norte',
      avatar: `https://i.pravatar.cc/150?u=${clients.length + 1}`,
      location: { lat: -34.6037, lng: -58.3816 }
    };
    setClients([newClient, ...clients]);
    setIsModalOpen(false);
  };

  const getStatusIcon = (status: ClientStatus) => {
    switch (status) {
      case 'Activo': return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'Cortado': return <Ban className="w-4 h-4 text-error" />;
      case 'Suspendido': return <AlertCircle className="w-4 h-4 text-warning" />;
    }
  };

  return (
    <div className="space-y-8 pb-24">
      {/* Search and Global Actions */}
      <section className="space-y-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-outline group-focus-within:text-primary transition-colors" />
          </div>
          <input 
            className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest rounded-2xl border-none shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-outline-variant transition-all outline-none"
            placeholder="Buscar clientes por nombre, ID o dirección..."
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Quick Filters Bento Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 flex flex-col gap-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter as any)}
                  className={cn(
                    "px-6 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 whitespace-nowrap transition-all",
                    activeFilter === filter 
                      ? "bg-primary text-on-primary shadow-lg shadow-primary/20" 
                      : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container"
                  )}
                >
                  {filter !== 'Todos' && (
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      filter === 'Activo' ? "bg-green-500" : 
                      filter === 'Cortado' ? "bg-red-500" : "bg-amber-500"
                    )}></span>
                  )}
                  {filter}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold text-outline uppercase tracking-widest px-2">ZONAS:</span>
              {zones.map((zone) => (
                <button 
                  key={zone}
                  className="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface text-sm border border-outline-variant/20 hover:bg-surface-container transition-colors"
                >
                  {zone}
                </button>
              ))}
            </div>
          </div>
          <div className="md:col-span-4 flex items-end justify-end">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
            >
              <UserPlus className="w-5 h-5" />
              Nuevo Cliente
            </button>
          </div>
        </div>
      </section>

      {/* Clients List Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-lg font-bold text-primary">Listado de Clientes</h2>
          <span className="text-sm font-medium text-outline">{filteredClients.length} clientes encontrados</span>
        </div>

        {/* Client Cards Container */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client, index) => (
              <motion.div 
                key={client.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group relative bg-surface-container-lowest rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-xl hover:shadow-slate-200/50 transition-all border-l-4",
                  client.status === 'Activo' ? "border-primary" : 
                  client.status === 'Cortado' ? "border-tertiary" : "border-amber-500"
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <img 
                      className="w-14 h-14 rounded-2xl object-cover" 
                      src={client.avatar || `https://i.pravatar.cc/150?u=${client.id}`} 
                      alt={client.name}
                      referrerPolicy="no-referrer"
                    />
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-surface-container-lowest",
                      client.status === 'Activo' ? "bg-green-500" : 
                      client.status === 'Cortado' ? "bg-red-500" : "bg-amber-500"
                    )}></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-on-surface text-lg group-hover:text-primary transition-colors">{client.name}</h3>
                    <div className="flex items-center gap-2 text-on-surface-variant text-sm mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{client.address}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 md:gap-8 px-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-tighter text-outline font-bold">ESTADO</span>
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold mt-1",
                      client.status === 'Activo' ? "bg-green-100 text-green-800" : 
                      client.status === 'Cortado' ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                    )}>
                      {client.status}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-tighter text-outline font-bold">SALDO</span>
                    <span className={cn(
                      "font-extrabold text-lg",
                      client.balance > 0 ? "text-tertiary" : "text-on-surface"
                    )}>
                      ${client.balance.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Quick Actions - Desktop View */}
                  <div className="hidden md:flex items-center gap-2">
                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container text-primary hover:bg-primary hover:text-white transition-all">
                      <Phone className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container text-green-600 hover:bg-green-600 hover:text-white transition-all">
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container text-secondary hover:bg-secondary hover:text-white transition-all">
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Quick Actions - Mobile View */}
                <div className="md:hidden flex border-t border-surface-container mt-2 pt-4 justify-between">
                  <button className="flex items-center gap-2 text-primary font-bold text-xs">
                    <Phone className="w-4 h-4" /> Llamar
                  </button>
                  <button className="flex items-center gap-2 text-green-600 font-bold text-xs">
                    <MessageSquare className="w-4 h-4" /> WhatsApp
                  </button>
                  <button className="flex items-center gap-2 text-secondary font-bold text-xs">
                    <Eye className="w-4 h-4" /> Perfil
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Floating Action Button for Mobile */}
      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsModalOpen(true)}
        className="md:hidden fixed bottom-24 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center z-40"
      >
        <Plus className="w-8 h-8" />
      </motion.button>

      <ClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddClient}
      />
    </div>
  );
}
