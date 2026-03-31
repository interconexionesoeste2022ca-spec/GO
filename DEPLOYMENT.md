# 🚀 COMPILACIÓN Y DESPLIEGUE - GALANET OESTE v8.1

## ✅ ANTES DE COMPILAR

### 1. Verificar que todo está en su lugar

```bash
# Asegúrate de que los archivos existen
ls -la app/api/antenas/route.js
ls -la app/api/snacks/route.js
ls -la app/api/clientes/[id]/fotos-drive/route.js
ls -la app/dashboard/clientes/FotosClienteModule.jsx
ls -la scripts/migrar-desde-sheets.js
```

### 2. Instalar dependencias (si es necesario)

```bash
npm install
# o
yarn install
```

**Dependencias verificadas:**
- ✅ next: 14.2.3
- ✅ react: ^18
- ✅ @supabase/supabase-js: ^2.43.4
- ✅ bcryptjs: ^2.4.3
- ✅ jsonwebtoken: ^9.0.2

No se agregaron nuevas dependencias (usa lo existente)

---

## 🔧 COMPILACIÓN LOCAL

### Paso 1: Environment variables

Asegúrate de tener `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://lboiiqgngygcocpdcwwt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc0NTN2dGVzdGluZ3...
JWT_SECRET=tu-secreto-jwt-muy-seguro
NODE_ENV=development
```

### Paso 2: Validar SQL

Antes de compilar, ejecuta en Supabase SQL Editor:

```sql
-- 1. Verifica que existen las tablas
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'antenas'
);
-- Debería devolver: true

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'snacks'
);
-- Debería devolver: true

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'cliente_fotos_drive'
);
-- Debería devolver: true
```

### Paso 3: Build

```bash
# Compilar sin errores
npm run build

# Output esperado:
# ✓ Compiled successfully
# ✓ Linting and checking validity of types
```

### Paso 4: Test local

```bash
# Ejecutar en desarrollo
npm run dev

# Debería iniciar en http://localhost:3000
# Sigue las instrucciones del proyecto
```

### Paso 5: Test features

**En navegador:**

1. **Mapa:**
   ```
   http://localhost:3000/dashboard/mapa
   - Ver 3 botones en el mapa
   - Cambiar entre vistas
   - Hacer clic para editar
   ```

2. **Fotos:**
   ```
   http://localhost:3000/dashboard/clientes
   - Seleccionar cliente
   - Botón "📸 Fotos Drive"
   - Agregar foto de prueba
   ```

3. **API:**
   ```bash
   # Test endpoint antenas
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/antenas
   
   # Test endpoint snacks
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/snacks
   ```

---

## 🌐 DESPLIEGUE EN PRODUCCIÓN

### Opción 1: Vercel (RECOMENDADO)

**Por qué:** Soporte nativo para Next.js, Edge Runtime

```bash
# 1. Conectar repo con Vercel
vercel link

# 2. Configurar environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET

# 3. Deploy
vercel deploy --prod
```

**Verificar:**
```
Deployment URL: https://galanet-oeste.vercel.app
Logs: https://vercel.com/[user]/[project]/deployments
```

### Opción 2: Self-hosted (Docker)

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Build y run
docker build -t galanet-oeste:8.1 .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  -e JWT_SECRET=... \
  galanet-oeste:8.1
```

### Opción 3: Railway/Render

1. Conecta tu repo
2. Configura environment variables
3. Deploy automático

---

## ✅ POST-DEPLOYMENT CHECKLIST

### 1. Verificar endpoints API

```bash
# Test cada endpoint new
curl -H "Authorization: Bearer $JWT_TOKEN" \
  https://galanet-oeste.vercel.app/api/antenas

curl -H "Authorization: Bearer $JWT_TOKEN" \
  https://galanet-oeste.vercel.app/api/snacks

curl -H "Authorization: Bearer $JWT_TOKEN" \
  https://galanet-oeste.vercel.app/api/clientes/1/fotos-drive
```

### 2. Verificar Supabase

```sql
-- Contar registros en nuevas tablas
SELECT COUNT(*) FROM antenas;
SELECT COUNT(*) FROM snacks;
SELECT COUNT(*) FROM cliente_fotos_drive;

-- Verificar RLS si está habilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('antenas', 'snacks', 'cliente_fotos_drive');
```

### 3. Test funcional

- [ ] Mapa carga sin errores
- [ ] 3 botones de vista funcionan
- [ ] Se pueden agregar antenas
- [ ] Se pueden agregar snacks
- [ ] Se pueden agregar fotos
- [ ] Verificación de pagos funciona
- [ ] Auditoría registra acciones

### 4. Monitoreo

```bash
# Ver logs en Vercel
vercel logs

# O si usas Docker
docker logs galanet-oeste

# Suscribirse a alertas
# - Uptime monitoring
# - Error tracking (Sentry opcional)
# - Performance monitoring (Vercel Analytics)
```

---

## 🔄 ROLLBACK (si hay problema)

```bash
# Vercel
vercel rollback

# O reducir a commit anterior
git revert HEAD
git push

# Docker
docker run ... galanet-oeste:8.0  # Versión anterior
```

---

## 📊 PERFORMANCE CHECKLIST

```bash
# Performance antes de producción
npm run build

# Debería mostrar:
# Page                                   Size     First Load JS
# ├ /                                    900 B          85.2 kB
# ├ /_app                               2.0 kB          81.2 kB
# ├ /dashboard                          5.2 kB          90.2 kB
# ├ /dashboard/mapa                     15.2 kB         110.2 kB  <- más grande (Leaflet)
# └ /login                              8.2 kB          92.2 kB

# Lighthouse score ayudará a optimizar
```

---

## 🔐 SEGURIDAD ANTES DE PRODUCCIÓN

- [x] JWT_SECRET es de 32+ caracteres
- [x] SUPABASE_SERVICE_ROLE_KEY nunca en Git
- [x] CORS configurado correctamente
- [x] Rate limiting en endpoints (opcional: usar middleware)
- [x] Validación de permisos en todas las rutas
- [x] Auditoría registrada

**Verificar CORS:**
```javascript
// En app/api/route.js
headers: {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_URL,
}
```

---

## 📝 CAMBIOS EN PACKAGE.JSON (si necesario)

Si quieres agregar scripts útiles:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "migrate:sheets": "node scripts/migrar-desde-sheets.js",
    "db:seed": "node scripts/seed-dev-data.js"
  }
}
```

---

## 🆘 TROUBLESHOOTING

### Error: "Build failed: Cannot find module"
```
Solución: npm install
```

### Error: "405 Method Not Allowed"
```
Solución: Verifica que el método HTTP es correcto
GET /api/antenas
POST /api/antenas
PATCH /api/antenas
DELETE /api/antenas
```

### Error: "Supabase connection refused"
```
Solución: Verifica NEXT_PUBLIC_SUPABASE_URL y keys en .env
```

### Error: "RLS policy blocks"
```
Solución: Asegúrate de que RLS está bien configurada en Supabase
O desactívalo si es desarrollo: ALTER TABLE antenas DISABLE ROW LEVEL SECURITY;
```

---

## 📞 CONTACTO

Si tienes problemas:
1. Revisa los logs: `vercel logs` o `docker logs`
2. Busca en Supabase: Tools → Logs
3. Verifica network tab (F12) en navegador

---

**LISTO PARA PRODUCCIÓN ✅**

Versión: 8.1  
Última actualización: 31 de Marzo, 2026
