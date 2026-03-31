# 🌐 GALANET OESTE v8.1

Sistema de gestión integral para ISP (Proveedor de Servicios de Internet), construido con **Next.js 14** + **Supabase**.

## ⚡ Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| [Next.js 14](https://nextjs.org) | Framework principal (App Router) |
| [Supabase](https://supabase.com) | Base de datos PostgreSQL + Storage |
| [JWT + jose](https://github.com/panva/jose) | Autenticación con cookies httpOnly |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Hashing seguro de contraseñas |
| [SweetAlert2](https://sweetalert2.github.io) | Alertas y confirmaciones |
| [Vercel](https://vercel.com) | Hosting y despliegue |

## 🚀 Inicio Rápido

### Requisitos
- Node.js 18+
- Cuenta en Supabase con proyecto configurado

### Configuración

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp env.local.example .env.local
# Edita .env.local con tus credenciales de Supabase y JWT_SECRET

# 3. Iniciar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Estructura del Proyecto

```
galanet-oeste/
├── app/
│   ├── api/                    # API Routes (servidor)
│   │   ├── auth/login/         # POST login, DELETE logout
│   │   ├── auth/me/            # GET sesión actual (cookie)
│   │   ├── clientes/           # CRUD clientes
│   │   ├── pagos/              # CRUD pagos + verificaciones
│   │   ├── planes/             # CRUD planes de internet
│   │   ├── cuentas/            # CRUD cuentas bancarias
│   │   ├── reportes/           # CRUD tickets técnicos
│   │   ├── tasa-bcv/           # Tasa del dólar BCV
│   │   ├── estadisticas/       # KPIs del dashboard
│   │   ├── cobranza/           # Vista de cobranza mensual
│   │   ├── usuarios/           # Gestión de usuarios (admin)
│   │   └── upload/             # Subida de comprobantes
│   ├── dashboard/              # Páginas del panel
│   │   ├── layout.jsx          # Sidebar + Topbar
│   │   ├── page.jsx            # Dashboard principal (KPIs)
│   │   ├── clientes/           # Gestión de clientes
│   │   ├── pagos/              # Registro y verificación de pagos
│   │   ├── planes/             # Planes de internet
│   │   ├── cuentas/            # Cuentas bancarias
│   │   ├── reportes/           # Tickets técnicos
│   │   ├── tasa-bcv/           # Tasa BCV
│   │   ├── fidelidad/          # Ranking de fidelización
│   │   ├── cobranza/           # Panel de cobranza
│   │   ├── mapa/               # Mapa de clientes
│   │   └── usuarios/           # Gestión de accesos
│   └── login/                  # Página de login
├── lib/
│   ├── api.js                  # Cliente fetch autenticado (frontend)
│   ├── apiHelpers.js           # Helpers compartidos (servidor)
│   └── fidelidad.js            # Lógica de fidelización (compartido)
├── middleware.js                # Protección de rutas con JWT
└── public/equipo/              # Imágenes del equipo
```

## 👥 Roles de Usuario

| Rol | Escribir | Eliminar | Verificar pagos | Gestionar usuarios |
|-----|----------|----------|-----------------|--------------------|
| **admin** | ✅ | ✅ | ✅ | ✅ |
| **staff** | ✅ | ❌ | ✅ | ❌ |
| **verificador** | ❌ | ❌ | ✅ | ❌ |
| **espectador** | ❌ | ❌ | ❌ | ❌ |

## 🔐 Seguridad

- Contraseñas hasheadas con **bcrypt** (12 rounds)
- JWT almacenado en **cookie httpOnly** (no en localStorage)
- Middleware Edge verifica JWT criptográficamente con **jose**
- Sistema de **auditoría** registra todas las operaciones
- Roles y permisos verificados en cada API route

## 📊 Tablas Supabase

`clientes` · `pagos` · `planes` · `cuentas` · `reportes` · `usuarios` · `tasa_bcv` · `auditoria`

## 🚀 Despliegue

```bash
npm run build     # Construir para producción
vercel --prod     # Desplegar en Vercel
```

---

© 2026 Galanet Oeste — Sistema de Gestión ISP
