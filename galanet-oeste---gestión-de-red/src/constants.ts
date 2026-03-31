import { Client, Incident, SystemStatus } from './types';

export const MOCK_CLIENTS: Client[] = [
  {
    id: '1',
    id_client: '1001',
    name: 'Martina Rodriguez',
    address: 'Oeste Country, Casa 45',
    phone: '+54 9 11 1234-5678',
    status: 'Activo',
    plan: 'Fibra 100MB',
    zone: 'Oeste',
    balance: 0,
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop',
    location: { lat: -34.6037, lng: -58.3816 }
  },
  {
    id: '2',
    id_client: '1002',
    name: 'Carlos Benitez',
    address: 'Barrio Centro, Av. San Martín 120',
    phone: '+54 9 11 8765-4321',
    status: 'Cortado',
    plan: 'Fibra 50MB',
    zone: 'Centro',
    balance: 4500,
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop',
    location: { lat: -34.6137, lng: -58.3916 }
  },
  {
    id: '3',
    id_client: '1003',
    name: 'Julian Lopez',
    address: 'Zona Norte, Calle Los Olmos 88',
    phone: '+54 9 11 5555-0000',
    status: 'Suspendido',
    plan: 'Fibra 100MB',
    zone: 'Norte',
    balance: 1200,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop',
    location: { lat: -34.5937, lng: -58.3716 }
  }
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: '1',
    title: 'Caída de Nodo Principal - Sector Noroeste',
    priority: 'Alta',
    client: 'Corporativo Los Olivos',
    timeAgo: 'hace 42m',
    assignedTo: 'Ing. Ricardo M.',
    techAvatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop'
  },
  {
    id: '2',
    title: 'Intermitencia de señal por saturación',
    priority: 'Media',
    client: 'Res. Vista Hermosa',
    timeAgo: 'hace 2h 15m',
    assignedTo: 'M. Santamaría',
    techAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop'
  },
  {
    id: '3',
    title: 'Solicitud de cambio de clave Wi-Fi',
    priority: 'Baja',
    client: 'Elena Rodríguez',
    timeAgo: 'hace 5h 20m'
  }
];

export const SYSTEM_STATUS: SystemStatus[] = [
  { name: 'Backbone Central', status: 'Online' },
  { name: 'Nodo Oeste', status: 'Alerta' },
  { name: 'API de Gestión', status: 'Online' }
];
