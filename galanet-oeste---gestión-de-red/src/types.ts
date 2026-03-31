export type ClientStatus = 'Activo' | 'Cortado' | 'Suspendido';

export interface Client {
  id: string;
  id_client: string;
  name: string;
  address: string;
  phone: string;
  status: ClientStatus;
  plan: string;
  zone: string;
  balance: number;
  avatar: string;
  lastPayment?: string;
  location: {
    lat: number;
    lng: number;
  };
}

export interface Incident {
  id: string;
  title: string;
  priority: 'Alta' | 'Media' | 'Baja';
  client: string;
  timeAgo: string;
  assignedTo?: string;
  techAvatar?: string;
}

export interface SystemStatus {
  name: string;
  status: 'Online' | 'Alerta';
}
