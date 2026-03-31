# 🚀 GALANET OESTE v8.1 - GUÍA DE IMPLEMENTACIÓN

## Mejoras Implementadas

### ✅ 1. MAPA MEJORADO CON ICONOS

**Cambios:**
- ✨ Botones para cambiar entre 3 vistas: **Clientes** | **Antenas** | **Snacks**
- 📡 Antenas con iconos de torres (azul)
- 🍔 Snacks con iconos de comida (naranja)
- 👥 Clientes con iconos PIN (coloreados por estado)
- 🗺️ Cada tipo de ubicación es editable y eliminable (admin/staff)
- 🗑️ Botón de eliminar para antenas y snacks

**Archivos creados:**
```
app/api/antenas/route.js        ← CRUD de antenas
app/api/snacks/route.js         ← CRUD de snacks
app/api/clientes/[id]/fotos-drive/route.js  ← CRUD de fotos
sql/nuevas-tablas-v8.1.sql      ← Script SQL para crear tablas
```

---

### ✅ 2. FOTOS DE GOOGLE DRIVE POR CLIENTE

**Features:**
- 📸 Modal para agregar fotos desde Google Drive
- 📄 Soporte para referencias de casa + documentos
- 🔗 Enlaces directos a Google Drive
- 🗑️ Eliminar fotos
- 📝 Títulos y notas opcionales

**Archivo creado:**
```
app/dashboard/clientes/FotosClienteModule.jsx
```

---

### ✅ 3. MIGRACIÓN DESDE GOOGLE SHEETS

**Script preparado:**
```
scripts/migrar-desde-sheets.js
```

**Migra:**
- ✅ Clientes (créalos o actualiza existentes)
- ✅ Pagos (con referencias correlativas)
- ✅ Planes (crea plantilla si no existen)
- ✅ Mapeo automático cliente → cliente_id

---

### ✅ 4. VERIFICACIÓN DE PAGOS (Ya implementado, mejorado)

**Status actual:**
- ✅ Roles: admin, staff, verificador pueden verificar
- ✅ Campos: estado_verificacion, verificado_por, verificado_en
- ✅ Comentarios en pagos

---

## 📋 PASOS DE INSTALACIÓN

### PASO 1: Crear las nuevas tablas en Supabase

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Abre tu proyecto
3. Ve a **SQL Editor**
4. **Crea una nueva query**
5. Copia el contenido de `sql/nuevas-tablas-v8.1.sql`
6. **Ejecuta** (Ctrl+Enter)

✅ Deberías ver: `✓ Success. No rows returned`

**Tablas creadas:**
- `antenas` - Torre de transmisión
- `snacks` - Puntos de venta
- `cliente_fotos_drive` - Fotos desde Google Drive
- **Mejoras a `pagos`** - Campos de verificación

---

### PASO 2: Ejecutar migración desde Google Sheets

**En terminal:**

```bash
# Configurar credencial
$env:SUPABASE_SERVICE_ROLE_KEY="eyJhbGc0NTN2dGVzdGluZ3...";

# Ejecutar migración
node scripts/migrar-desde-sheets.js
```

**Output esperado:**
```
🚀 MIGRACIÓN DESDE GOOGLE SHEETS → SUPABASE
==================================================
📋 Creando planes de prueba (si no existen)…
✅ +4 planes creados
📥 Descargando clientes del Sheet…
📊 127 clientes encontrados
✅ Clientes: +110 insertados, +17 actualizados, 0 omitidos
📥 Descargando pagos del Sheet…
📊 543 pagos encontrados
✅ Pagos: +540 insertados, 3 omitidos
==================================================
✅ ¡Migración completada!
```

---

### PASO 3: Distribuir el mapa (Frontend)

**El mapa ya está actualizado en:**
```
app/dashboard/mapa/page.jsx
```

**Nuevos endpoints usados:**
```javascript
GET  /api/antenas          // Obtener todas las antenas
POST /api/antenas          // Crear antena
PATCH /api/antenas         // Editar antena
DELETE /api/antenas?id=X   // Eliminar antena

GET  /api/snacks           // Obtener todos los snacks
POST /api/snacks           // Crear snack
PATCH /api/snacks          // Editar snack
DELETE /api/snacks?id=X    // Eliminar snack

GET  /api/clientes/[id]/fotos-drive?tipo=referencia
POST /api/clientes/[id]/fotos-drive
PATCH /api/clientes/[id]/fotos-drive
DELETE /api/clientes/[id]/fotos-drive?foto_id=X
```

---

## 🎯 CÓMO USAR LAS NUEVAS FEATURES

### Agregar Antenas en el Mapa

1. Ve a **Dashboard → Mapa**
2. Haz clic en botón **📡 Antenas** (arriba en el mapa)
3. Proyecta los pins de antena por defecto, luego:
4. Haz clic con botón derecho para agregar nueva antena
   ```
   POST /api/antenas
   {
     "nombre": "Antena Centro",
     "latitud": 10.067,
     "longitud": -69.347,
     "ubicacion_descripcion": "Edificio Principal",
     "banda_frecuencia": "5GHz",
     "alcance_approx_metros": 1000
   }
   ```

### Agregar Snacks

1. Ve a **Dashboard → Mapa**
2. Haz clic en **🍔 Snacks**
3. Haz clic en el mapa para agregar
   ```
   POST /api/snacks
   {
     "nombre": "Snack Centro",
     "latitud": 10.067,
     "longitud": -69.347,
     "ubicacion_descripcion": "Av. Principal",
     "contacto_telefono": "0414-1234567",
     "horario_atencion": "8:00-18:00 L-V"
   }
   ```

### Agregar Fotos de Casa (Google Drive)

1. Ve a **Dashboard → Clientes**
2. Selecciona un cliente
3. Haz clic en **📸 Fotos Drive**
4. En el modal:
   - Comparte una foto en Google Drive (acceso público)
   - Copia el ID: `https://drive.google.com/uc?id=**1A2B3C...**`
   - Pega URL y ID
   - Marca "Referencia de casa" (opcional)
   - Haz clic en **➕ Agregar foto**

**Tipo de URL:**
- Pública: `https://drive.google.com/uc?id=1A2B3C4D5E6F...`
- En vista previa: `https://lh3.googleusercontent.com/...`

---

## 📊 SCHEMA NUEVAS TABLAS

### Tabla: `antenas`
```sql
id BIGSERIAL
nombre TEXT
latitud NUMERIC(10,6)
longitud NUMERIC(10,6)
ubicacion_descripcion TEXT
banda_frecuencia TEXT       -- '5GHz', '2.4GHz'
potencia_watts NUMERIC
alcance_approx_metros INT
activa BOOLEAN
nota_tecnica TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Tabla: `snacks`
```sql
id BIGSERIAL
nombre TEXT
latitud NUMERIC(10,6)
longitud NUMERIC(10,6)
ubicacion_descripcion TEXT
contacto_telefono TEXT
horario_atencion TEXT       -- '9:00-21:00 L-D'
activo BOOLEAN
nota_especial TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### Tabla: `cliente_fotos_drive`
```sql
id BIGSERIAL
cliente_id BIGINT (FK → clientes)
drive_url TEXT              -- URL pública
drive_file_id TEXT          -- ID del archivo GDrive
titulo TEXT
es_referencia_casa BOOLEAN
es_documento BOOLEAN
notas TEXT
subida_por TEXT             -- Usuario que subió
created_at TIMESTAMP
updated_at TIMESTAMP
```

---

## 🔐 PERMISOS Y ROLES

| Operación | Admin | Staff | Verificador | Espectador |
|-----------|-------|-------|-------------|-----------|
| Ver clientes | ✅ | ✅ | ❌ | ❌ |
| Crear/editar cliente | ✅ | ✅ | ❌ | ❌ |
| Eliminar cliente | ✅ | ❌ | ❌ | ❌ |
| Crear antena | ✅ | ✅ | ❌ | ❌ |
| Mover antena | ✅ | ✅ | ❌ | ❌ |
| Eliminar antena | ✅ | ❌ | ❌ | ❌ |
| Ver pagos | ✅ | ✅ | ✅ | ❌ |
| Verificar pago | ✅ | ✅ | ✅ | ❌ |

---

## ⚠️ IMPORTANTE: MAPEO COLUMNAS SHEET

El script `migrar-desde-sheets.js` espera estos nombres en tu Google Sheet:

**Clientes:**
```
nombre_razon_social | documento_identidad | tipo_cliente | telefono | email | 
zona_sector | direccion_ubicacion | latitud | longitud | estado_servicio | 
plan_id | fecha_instalacion | activo
```

**Pagos:**
```
nombre_cliente | mes_cobro | fecha_pago | monto_facturado_usd | monto_pagado_bs | 
tasa_bcv_facturacion | tasa_bcv_pago | tipo_pago | referencia | 
estado_verificacion | nota_pago | usuario_registro | numero_factura
```

Si tus columnas tienen otros nombres, edita `migrar-desde-sheets.js` línea 120-160.

---

## 🐛 TROUBLESHOOTING

### Error: "Tabla antenas no existe"
→ Ejecuta el SQL de `sql/nuevas-tablas-v8.1.sql`

### Error: "No autorizado" en antenas
→ Verifica que el usuario tenga rol `admin` o `staff`

### Fotos no se ven en Google Drive
→ La URL debe estar pública: `https://drive.google.com/uc?id=...`

### Migración: "cliente no encontrado"
→ Revisa que el nombre exacto coincida entre Sheet y BD

---

## 📖 DOCUMENTACIÓN EXTRA

- **Leaflet**: https://leafletjs.com/
- **Google Drive API**: https://developers.google.com/drive
- **Supabase SQL**: https://supabase.com/docs/guides/sql

---

## ✅ PRÓXIMAS MEJORAS RECOMENDADAS

1. **Integración con Google Drive API** (OAuth)
   - Subida directa de fotos sin copiar URL
   
2. **Gestión de cobertura**
   - Polígonos de área de cobertura de antenas
   - Cálculo de radio de alcance
   
3. **Reportes de cobertura**
   - Clientes dentro/fuera de alcance
   - Propuestas de nuevas antenas
   
4. **Mobile app**
   - Descarga offline del mapaModo verificador mejorado

5. **Notificaciones**
   - Alertas cuando un cliente no tiene ubicación
   - Recordatorios de verificación de pagos

---

Última actualización: **31 de Marzo, 2026**
