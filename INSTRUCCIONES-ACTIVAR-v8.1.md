# 🎯 INSTRUCCIONES - ACTIVAR NUEVAS FUNCIONALIDADES v8.1

## ✅ CAMBIOS REALIZADOS

### 1. **Mapa - Panel de ANTENAS** (v8.1)
- ✅ Botón **➕ Agregar Antena** 
- ✅ Listar todas las antenas
- ✅ Seleccionar y **mover** en el mapa
- ✅ **Eliminar** antenas
- ✅ Campos: Nombre, Descripción, Banda/Frecuencia, Alcance, Notas técnicas
- ✅ **DISEÑO ACTUALIZADO**: Colores Emerald Sentinel (Navy #525f71, Emerald #006d4b)

### 2. **Mapa - Panel de PUNTOS DE REFERENCIA** (v8.1)
- ✅ Botón **➕ Agregar Punto**
- ✅ Personalizable con: Nombre, Descripción, Teléfono, Horario
- ✅ Seleccionar y **mover** en el mapa
- ✅ **Eliminar** puntos
- ✅ Icono personalizado 📍 (no comida 🍔)
- ✅ **DISEÑO ACTUALIZADO**: Colores Emerald Sentinel

### 3. **Sistema de Diseño - Emerald Sentinel** (v8.2) ✨ NUEVO
- ✅ **Dashboard Layout**: Sidebar 256px con labels, header sticky con breadcrumb
- ✅ **Fuentes**: Manrope (headlines) + Inter (body) + Material Symbols (icons)
- ✅ **Color System**: 50+ variables CSS centralizadas
  - Primario: Navy #525f71
  - Terciario: Esmeralda #006d4b (accent)
  - Error: #9f403d
  - 5 niveles de surface hierarchy
- ✅ **TODAS LAS PÁGINAS ACTUALIZADAS**:
  - ✓ Dashboard (layout + header)
  - ✓ Mapa (9.49 kB)
  - ✓ Clientes (5.72 kB)
  - ✓ Pagos (7.18 kB)
  - ✓ Planes (3.16 kB)
  - ✓ Cobranza (4.2 kB)
  - ✓ Fidelidad (3.25 kB)
  - ✓ Reportes (3.71 kB)
  - ✓ Rentabilidad (3.69 kB)
  - ✓ Tasa BCV (2.77 kB)
  - ✓ Cuentas (3.02 kB)
  - ✓ Usuarios (3.73 kB)

### 4. **Pagos - Limpiar Duplicados en Cuentas Receptoras** (v8.1)
- ⚠️ Detectados duplicados: "Bancaribe — Galanet" aparece 2 veces
- 📋 Script SQL creado: `/sql/limpiar-cuentas-v8.1.sql`
- ⏳ Pendiente: Ejecutar en Supabase

### 5. **Compilación - v8.2**
- ✅ Código compilando sin errores (0 issues)
- ✅ 34 páginas estáticas generadas
- ✅ First Load JS: 87.4 kB
- ✅ 100% funcionalidad preservada (APIs, DB, lógica intacta)

---

## 🔄 PASOS PARA ACTIVAR

### PASO 0: Ver Cambios de Diseño (v8.2 - Emerald Sentinel) ✨
El sistema ya tiene el nuevo diseño integrado. No requiere acciones, solo refrescar el navegador:

```bash
npm run dev
# Abre http://localhost:3000/dashboard
# Verás: Sidebar 256px, colores emerald/navy, nuevas fuentes Manrope + Inter
```

**Cambios visuales:**
- Sidebar ahora muestra etiquetas (antes era solo iconos)
- Colores profesionales: Navy + Emerald
- Icons: Material Symbols (Google)
- Tipografía: Manrope Bold + Inter Regular
- Todas las páginas con tema unificado

---

### PASO 1: Limpiar Duplicados de Cuentas (v8.1)
En **Supabase → SQL Editor**, copia y ejecuta:

```bash
-- PASO 1a: Ver duplicados
SELECT banco, titular, COUNT(*) as cantidad
FROM cuentas
WHERE activa = true
GROUP BY banco, titular
HAVING COUNT(*) > 1;

-- PASO 1b: ELIMINAR duplicados (mantiene el más antiguo)
DELETE FROM cuentas
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY banco, titular ORDER BY created_at ASC) as rn
    FROM cuentas
    WHERE activa = true
  ) AS t
  WHERE rn > 1
);

-- PASO 1c: Verificar resultado
SELECT banco, titular, COUNT(*) as cantidad
FROM cuentas
WHERE activa = true
GROUP BY banco, titular
HAVING COUNT(*) > 1;
-- Debería estar VACÍO ✓
```

**Resultado esperado:**
- ❌ SIN duplicados
- ✅ El dropdown de pagos lista solo 1 vez cada cuenta

---

### PASO 2: Probar Localmente

```bash
npm run dev
# http://localhost:3000/dashboard/mapa
```

**PASO 2a: Verificar Diseño Emerald Sentinel ✨**
1. Abre http://localhost:3000/dashboard
2. Observa:
   - Sidebar: 256px con labels (Dashboard, Clientes, Pagos, etc.)
   - Header: Sticky con título de página
   - Colores: Navy/Esmeralda en botones y accents
   - Fuente: Manrope (títulos), Inter (texto)
3. Navega por 3+ páginas (mapa, clientes, pagos)
4. Verifica consistencia de colores y layout

**En el navegador (v8.1 features):**

#### PASO 2b. Probar **ANTENAS**
1. Haz clic en botón **📡 Antenas** (arriba a la derecha)
2. Haz clic en **➕ Agregar Antena**
3. Completa el formulario:
   - Nombre: "Antena Prueba"
   - Descripción: "Zona X"
   - Banda: "2.4GHz"
   - Alcance: "500"
4. Haz clic en **Crear**
5. La antena debe aparecer en el mapa con icono 📡 azul
6. Haz clic en la antena en la lista
7. Haz clic en **📍 Mover**
8. Haz clic en el mapa para reposicionarla
9. Haz clic en **🗑️ Del** para eliminarla

#### 2b. Probar **PUNTOS DE REFERENCIA**
1. Haz clic en botón **📍 Puntos**
2. Haz clic en **➕ Agregar Punto**
3. Completa:
   - Nombre: "Centro Comercial Plaza Mayor"
   - Descripción: "Con estacionamiento"
   - Teléfono: "0251-123-4567"
   - Horario: "10am-8pm"
4. Haz clic en **Crear**
5. Debe aparecer en el mapa con icono 📍 naranja
6. Prueba mover y eliminar igual que antenas

#### PASO 2c. Probar **PAGOS - Cuentas Limpias**
1. Ve a **Dashboard → Pagos**
2. Haz clic en **Registrar pago**
3. En dropdown **Cuenta receptora**
4. Verifica que NO hay duplicados
5. Antes: "Bancaribe — Galanet" (×2)
6. Ahora: "Bancaribe — Galanet" (×1) ✓

---

### PASO 3: Ejecutar en Producción

```bash
# Build final (ya compilado ✓)
npm run build

# Deploy a Vercel (o tu hosting)
git add -A
git commit -m "feat: v8.2 emerald sentinel design system + v8.1 antenas/puntos + limpiar cuentas"
git push

# Si usas Vercel:
vercel deploy --prod
```

**¿Qué se deployará?**
- ✅ Emerald Sentinel Design System (todas las páginas)
- ✅ Antenas + Puntos de Referencia (v8.1)
- ✅ APIs funcionando (sin cambios)
- ✅ Base de datos (sin cambios, excepto script SQL si se ejecuta)

---

## 🗺️ ENDPOINTS FUNCIONALES

Todos estos endpoints ya estaban listos:

```bash
# Antenas
GET    /api/antenas
POST   /api/antenas              # Crear nueva
PATCH  /api/antenas              # Mover o editar
DELETE /api/antenas?id=123       # Eliminar

# Snacks/Puntos (mismo endpoint, UI mejorada)
GET    /api/snacks
POST   /api/snacks               # Crear nuevo punto
PATCH  /api/snacks               # Mover o editar
DELETE /api/snacks?id=123        # Eliminar

# Cuentas (ahora sin duplicados)
GET    /api/cuentas              # Listar sin duplicados
```

---

## 🎨 CAMBIOS VISUALES EN MAPA

### ANTES
- ❌ Solo 1 botón de vista: "Clientes"
- ❌ Stats generales
- ❌ No se podía agregar antenas/snacks

### AHORA
- ✅ 3 botones de vista: "👥 Clientes" | "📡 Antenas" | "📍 Puntos"
- ✅ Panel lateral con listado cuando cambias de vista
- ✅ Botón **➕ Agregar** para cada tipo
- ✅ Modal con formulario completo
- ✅ Movimiento de pins con **📍 Mover**
- ✅ Eliminación con **🗑️ Del**
- ✅ Iconos personalizados y diferentes colores

---

## 🔒 PERMISOS

Solo usuarios con `rol: 'admin'` o `rol: 'staff'` pueden:
- ✅ Crear antenas
- ✅ Crear puntos de referencia
- ✅ Mover ubicaciones
- ✅ Eliminar

Usuarios con `rol: 'verificador'` o `rol: 'espectador'`:
- 👀 Solo ven (read-only)

---

## ❌ TROUBLESHOOTING

### El dropdown de cuentas sigue con duplicados
**Solución:**
1. Abre Supabase SQL Editor
2. Ejecuta el script de limpieza nuevamente
3. Recarga la página en navegador (F5)

### No aparece el botón "Agregar Antena"
**Solución:**
1. Verifica que el usuario sea admin o staff
2. Recarga: `npm run dev`
3. Limpia cache: Ctrl+Shift+Delete

### Error al crear antena: "No autorizado"
**Solución:**
1. Verifica el rol en BD: `SELECT rol FROM usuarios WHERE id = '...'`
2. Debe ser 'admin' o 'staff'

---

## ✅ CHECKLIST FINAL

**Diseño Emerald Sentinel (v8.2) - Verificaciones Visuales:**
- [ ] Sidebar muestra 256px con labels (no solo iconos)
- [ ] Colores están actualizados (Navy + Emerald)
- [ ] Header es sticky en todas las páginas
- [ ] Fuentes Manrope + Inter en todos lados
- [ ] Material Symbols icons en navbar
- [ ] Tabla de clientes sin 1px borders (background shifts)
- [ ] Botones de pagos con colores correctos
- [ ] Cards de planes con nueva paleta
- [ ] Gráficos de rentabilidad con tertiary/error

**v8.1 Features - Funcionalidades:**
- [ ] Limpié duplicados de cuentas
- [ ] Probé crear antena
- [ ] Probé mover antena en el mapa
- [ ] Probé eliminar antena
- [ ] Probé crear punto de referencia
- [ ] Probé mover punto en el mapa
- [ ] Probé eliminar punto
- [ ] Verificé que el dropdown de pagos no tiene duplicados
- [ ] Compilé sin errores (`npm run build`) ✓
- [ ] Deployé a producción

---

## 📞 NOTAS

- La ubicación inicial de nuevas antenas/puntos es Barquisimeto (10.067, -69.347)
- Después de crear, puedes hacer clic en "🏙️ Centrar en Barquisimeto" para ver el mapa
- Luego mover la antena/punto a la ubicación correcta
- Todos los cambios se guardan automáticamente en Supabase

---

**Versión:** 8.2 (Emerald Sentinel Design System integrated)  
**Basada en:** v8.1 features + v8.0 API foundation  
**Última actualización:** 31 de Marzo, 2026  
**Estado:** ✅ DISEÑO COMPLETADO | ⏳ SQL CLEANUP PENDING  
**Build Status:** 87.4 kB First Load JS | 34 pages | 0 errors ✓
