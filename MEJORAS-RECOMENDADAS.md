# 📈 ANÁLISIS DE MEJORAS PARA GALANET OESTE v8.1

Fecha: 31 de Marzo, 2026  
Versión: 8.1

---

## 🎯 MEJORAS IMPLEMENTADAS EN ESTA VERSIÓN

### ✅ Nivel 1: CRÍTICO
- [x] **Mapa mejorado** - 3 vistas (clientes/antenas/snacks) con iconos distintos
- [x] **Gestión de antenas** - Crear, editar, eliminar torres de transmisión
- [x] **Gestión de snacks** - Ubicaciones de puntos de venta
- [x] **Fotos de Google Drive** - Referencias de casas/documentos por cliente
- [x] **Migración desde Sheet** - Script para importar datos masivos

### ✅ Nivel 2: IMPORTANTE
- [x] **Verificación de pagos** - Sistema de roles (admin/staff/verificador)
- [x] **Auditoría mejorada** - Registro de todas las acciones en antenas/snacks
- [x] **Permisos granulares** - Control por rol en operaciones especializadas

---

## 🚀 MEJORAS RECOMENDADAS (FUTURO)

### 1️⃣ INTEGRACIÓN GOOGLE DRIVE API (⭐ ALTA PRIORIDAD)

**Problema actual:**
- El usuario debe copiar URL manualmente desde Google Drive
- Requiere hacer público el archivo

**Solución:**
```javascript
// Implementar OAuth 2.0 con Google Drive
// Permitir seleccionar archivos directo desde interfaz
// Subida controlada sin exponer archivos públicos

// Nuevos endpoints:
POST /api/auth/google-drive/callback
POST /api/clientes/[id]/fotos-drive/upload
```

**Beneficios:**
- ✨ UX más profesional
- 🔐 Control de acceso a fotos
- 📱 Carga de fotos en tiempo real desde cámara

**Esfuerzo:** 4-6 horas

---

### 2️⃣ COBERTURA Y ALCANCE DE ANTENAS (⭐ ALTA PRIORIDAD)

```javascript
// Visualizar cobertura como círculos/polígonos
POST /api/antenas/[id]/cobertura
{
  "tipo": "circulo", // circulo | poligono
  "radio_km": 2.5,
  "puntos_geofencing": [/* lat,lng */]
}

// Calcular clientes en cobertura
GET /api/antenas/[id]/clientes-en-alcance
→ {
    "total": 342,
    "activos": 298,
    "fuera_cobertura": [/* clientes */]
  }
```

**Archivos a crear:**
- `app/api/antenas/[id]/cobertura/route.js`
- `lib/geoUtils.js` - Cálculos de distancia/polígonos
- Actualizar `mapa/page.jsx` con círculos Leaflet

**Beneficios:**
- 📊 Visualizar cobertura real
- 🎯 Identificar zonas sin cobertura
- 💡 Propuestas para nuevas antenas

**Esfuerzo:** 6-8 horas

---

### 3️⃣ REPORTES AVANZADOS DE COBERTURA

```javascript
// Panel: "Análisis de cobertura"
GET /api/reportes/cobertura-stats
→ {
    "cobertura_total_pct": 94.3,
    "clientes_sin_cobertura": 28,
    "zonas_criticas": [
      { zona: "Sector Oeste", clientes_afectados: 12, distancia_antena_cercana: "3.2km" }
    ],
    "sugerencias_antenas": [
      { ubicacion: "10.050, -69.380", clientes_servidos: 45, inversion_aprox_usd: 2500 }
    ]
  }
```

**Archivos a crear:**
- `app/dashboard/reportes/cobertura.jsx`
- `app/api/reportes/cobertura-stats/route.js`

**Beneficios:**
- 📉 Detectar gaps de cobertura
- 💰 Optimizar inversión en infraestructura
- 📍 Planificación de expansión

**Esfuerzo:** 4-5 horas

---

### 4️⃣ NOTIFICACIONES EN TIEMPO REAL

```javascript
// Tabla: notificaciones
CREATE TABLE notificaciones (
  id, usuario_id, tipo, titulo, mensaje, 
  entidad_tipo, entidad_id, leido, created_at
)

// Tipos:
- "cliente_sin_ubicacion"    → Recordar ubicar cliente
- "pago_pendiente_verif"     → Pago pendiente de verificación
- "cobertura_critica"        → Cliente fuera de cobertura
- "antena_inactiva"          → Antena no responde
- "nuevo_cliente"             → Cliente agregado
```

**Implementar:**
- Modal de notificaciones
- WebSocket para actualizaciones en vivo
- Email/SMS opcional

**Beneficios:**
- ⏰ Alertas proactivas
- 📢 Colaboración mejorada
- 🔔 Menos cosas olvidadas

**Esfuerzo:** 5-7 horas

---

### 5️⃣ MOBILE APP - MAP VIEW

**Stack:** React Native + Expo
- Modo offline con datos cachés
- GPS para ubicación en vivo del técnico
- Fotos con cámara
- Sincronización background

**Esfuerzo:** 15-20 horas (nuevo proyecto)

---

### 6️⃣ MODO VERIFICADOR MEJORADO

**Tema actual:**
- Verificador solo ve el botón en pagos
- Sin interfaz dedicada para verificación masiva

**Mejora:**
```javascript
// Nueva página: /dashboard/verificacion
// Panel específico para verificadores
// - Filtrar por "Pendiente" automático
// - Búsqueda por referencia
// - Validación de duplicados
// - Comentarios rápidos
// - Exportar reporte de verificación
```

**Archivos:**
- `app/dashboard/verificacion/page.jsx`
- `app/api/pagos/lotes-verificar`

**Esfuerzo:** 3-4 horas

---

### 7️⃣ IMPORTAR DATOS MASIVOS - MEJORADO

**Problema:**
- Script solo descarga del Sheet
- No detecta cambios
- Sin rollback

**Mejora:**
```javascript
// POST /api/admin/importar-masivo
{
  "tipo": "clientes", // clientes | pagos | antenas
  "fuente": "google_sheets",
  "hoja_id": "1dlG27ctJHSeBpgMAt7rQnZMJlvJxYKM3JOR2MFytyR4",
  "rango": "A1:Z100",
  "accion": "insert_or_update", // insert_only | update_only
  "simular": true // validar sin guardar
}
→ {
    "validos": 87,
    "errores": 3,
    "advierten": 5,
    "detalles": [/* ... */]
  }
```

**Features:**
- Validación previa (pre-flight)
- Rollback si hay error
- Informe detallado
- Caché de cambios

**Esfuerzo:** 6-8 horas

---

### 8️⃣ DASHBOARD DE ADMIN - ESTADÍSTICAS

```javascript
// Tarjetas:
- Cobertura total (%)
- Clientes sin ubicar
- Pagos pendientes (monto total)
- Antenas activas
- Últimas verificaciones
- Clientes nuevos (mes)

// Gráficos:
- Cobertura por zona
- Ingresos por mes (tendencia)
- Estados de servicio (pie chart)
```

**Esfuerzo:** 3-4 horas

---

### 9️⃣ EXPORTAR REPORTES (PDF/EXCEL)

```javascript
// Reportes:
- Clientes ubicados/sin ubicar (PDF)
- Cobertura por sector (PDF map)
- Ingresos por mes (XLSX)
- Listado de verificaciones (PDF)

// Usar: jsPDF, ExcelJS, html2pdf
```

**Esfuerzo:** 4-5 horas

---

### 🔟 MULTI-IDIOMA Y TEMAS

```javascript
// i18n → es, en, pt
// Temas → light, dark, custom

// Usar: next-i18next, next-themes
```

**Esfuerzo:** 3-4 horas

---

## 📊 MATRIZ DE PRIORIZACIÓN

| Mejora | Prioridad | Impacto | Esfuerzo | ROI |
|--------|-----------|--------|----------|-----|
| Google Drive API | 🔴 Alta | 🔴 Alto | ⏱️ Medio | 9/10 |
| Cobertura de antenas | 🔴 Alta | 🔴 Alto | ⏱️ Alto | 8/10 |
| Reportes de cobertura | 🟡 Media | 🟡 Medio | ⏱️ Bajo | 7/10 |
| Notificaciones | 🟡 Media | 🟡 Medio | ⏱️ Alto | 6/10 |
| Verificador mejorado | 🟡 Media | 🟡 Medio | ⏱️ Bajo | 7/10 |
| Importar masivo | 🟡 Media | 🟡 Medio | ⏱️ Medio | 6/10 |
| Dashboard admin | 🟡 Media | 🟢 Bajo | ⏱️ Bajo | 5/10 |
| Reportes PDF/XLSX | 🟢 Baja | 🟡 Medio | ⏱️ Bajo | 6/10 |
| Mobile app | 🟢 Baja | 🔴 Alto | ⏱️ Muy Alto | 7/10 |

---

## 🎯 ROADMAP SUGERIDO

### Sprint 1 (1-2 semanas)
- [x] Mapa mejorado ✅
- [x] Gestión de antenas ✅
- [ ] Google Drive API (START)

### Sprint 2 (1-2 semanas)
- [ ] Google Drive API (FINISH)
- [ ] Cobertura de antenas
- [ ] Panel verificador mejorado

### Sprint 3 (1 semana)
- [ ] Reportes de cobertura
- [ ] Dashboard admin
- [ ] Notificaciones básicas

### Sprint 4+ (backlog)
- [ ] Mobile app
- [ ] Exportar PDF/XLSX
- [ ] Multi-idioma
- [ ] Auditoría avanzada

---

## 💡 TÉCNICAS Y LIBRERÍAS RECOMENDADAS

```javascript
// Geolocalización y mapas
- leaflet.js (ya usado)
- turf.js (cálculos geométricos)
- mapbox-gl (alternativa premium)

// Reportes
- jsPDF
- ExcelJS
- html2pdf

// Notificaciones
- socket.io (WebSocket)
- pusher (alternativa SaaS)

// Autenticación Google Drive
- googleapis
- next-auth + Google Provider

// Analytics
- PostHog
- Mixpanel

// Performance
- @vercel/analytics
- Lighthouse CI
```

---

## 🔍 AUDITORÍA DE SEGURIDAD

**Items a revisar:**
- [ ] Validar IDs de Google Drive
- [ ] Rate limiting en importaciones
- [ ] Encriptar URLs de Google Drive
- [ ] Verificar RLS en Supabase (Row Level Security)
- [ ] Logs de acceso a fotos
- [ ] Expiración de URLs de fotos

---

## 📝 NOTAS FINALES

1. **Prioridades del cliente:** Prefieres mapas mejorados vs reportes?
2. **Timeline:** Cuánto tiempo por sprint?
3. **Inversión:** Budget para librerías pagadas (Mapbox, Pusher)?
4. **Team:** Cuántas personas desarrollando?

---

**Recomendación:** Empezar con **Google Drive API** (alta prioridad, visible al usuario) →  **Cobertura de antenas** (strategic) → **Reportes** (autoserach).

Presenta esto al cliente para validar prioridades.
