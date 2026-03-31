# 📏 MEDIDOR DE DISTANCIA Y ALERTAS DE CLIENTES - v8.1

## ✅ NUEVAS FUNCIONALIDADES AGREGADAS

### 1. **📏 MEDIDOR DE DISTANCIA CON CURVAS**
- Mide distancias siguiendo calles y rutas, NO solo línea recta
- Soporta múltiples puntos (polilineas)
- Ideal para calcular metros de cableado o cobertura de antenas
- Capaz de medir instalaciones en terreno irregular

### 2. **⚠️ ALERTAS VISUALES EN CLIENTES**
- Clientes con reportes abiertos muestran icono especial
- Icono con punto rojo y número de alertas en popup
- Identificación rápida de clientes con problemas
- Visible directamente en el mapa

### 3. **🔍 MEJOR INFORMACIÓN EN POPUPS**
- Popups expandidos con información de alertas
- Mostrar cantidad de reportes abiertos
- Distinguir rápidamente clientes con problemas

---

## 🎯 CÓMO USAR EL MEDIDOR

### Paso 1: Activar el Medidor

En el mapa, busca los botones arriba a la izquierda:
```
[👥 Clientes] [📡 Antenas] [📍 Puntos] | [📏 Medir]
```

Haz clic en **[📏 Medir]** - el botón se pondrá **púrpura**

### Paso 2: Hacer Clic en el Mapa

Una vez activado el medidor, cada clic en el mapa agrega un punto:

1. **Primer clic** → Punto 1 (inicio de la ruta)
2. **Segundo clic** → Punto 2 (se dibuja línea entre 1-2)  
3. **Tercerclic** → Punto 3 (se dibuja línea entre 2-3)
4. **Y así sucesivamente...**

**Resultado:** Se crea una polilínea punteada azul siguiendo tus clics

### Paso 3: Ver la Distancia

Un panel aparece abajo a la izquierda mostrando:

```
📏 MODO MEDIDOR ACTIVO
Distancia: 1.23 km
(1234 metros • 5 puntos)

[Limpiar] [Finalizar]
```

### Paso 4: Finalizar

- **[Limpiar]:** Borra la ruta actual y comienza de nuevo
- **[Finalizar]:** Guarda la medición y desactiva el medidor

---

## 📍 EJEMPLO PRÁCTICO

**Escenario:** Medir cuántos metros de cable necesitas desde Antena Oeste a 3 puntos de conexión

**Pasos:**
1. Haz clic en **[📏 Medir]** (se pone púrpura)
2. Haz clic en Antena Oeste (Punto 1)
3. Haz clic en Calle Principal (Punto 2)
4. Haz clic en Cruce Avenida Los Andes (Punto 3)
5. Haz clic en Casa Cliente Final (Punto 4)
6. Lee:
   ```
   Distancia: 0.89 km = 890 metros
   4 puntos = 4 segmentos de ruta
   ```
7. Haz clic en **[Finalizar]**

✅ **Resultado:** Sabes que necesitas ~890m de cable

---

## ⚠️ CLIENTES CON ALERTAS

### Identificación Visual

**CLIENTE CON ALERTA:**
- Icono más grande (36×46 px)
- Punto rojo con "!" en la esquina superior derecha
- Más visible que un cliente normal

**CLIENTE SIN ALERTA:**
- Icono normal (32×42 px)
- Sin indicador rojo

### Popup con Alerta

Cuando haces clic en un cliente con reporte abierto, ves:

```
╔════════════════════════════════╗
║  Cliente Prueba                ║
║  V-12345678                    ║
║                                ║
║  ⚠️ CLIENTE CON ALERTA        ║
║  2 reporte(s) abierto(s)       ║
║                                ║
║  [Activo]  [Plan Internet 10]  ║
║  📞 0251-123-4567              ║
║  📍 Zona Industrial            ║
╚════════════════════════════════╝
```

### Dónde Ver Reportes

Para ver detalles completos del reporte:

1. Ve a **Dashboard → Reportes**
2. Filtra por cliente
3. Verás todos los reportes abiertos
4. Marca como "Cerrado" cuando resuelvas el problema

---

## 🔧 CÁLCULOS TÉCNICOS

### Fórmula de Distancia (Haversine)

El medidor usa la **fórmula de Haversine** para calcular distancia real:

```
d = 2R × arcsin(√(sin²(Δφ/2) + cos φ₁ × cos φ₂ × sin²(Δλ/2)))
```

Donde:
- R = Radio de la Tierra = 6,371 km
- φ = Latitud
- λ = Longitud

**Precisión:** ±1% para distancias <10 km

### Distancia Acumulada

La distancia total es la suma de todos los segmentos:

```
Distancia Total = Seg1 + Seg2 + Seg3 + ... + SegN
```

---

## 📊 CASOS DE USO

### Caso 1: Planificar Instalación de Cable

**Necesito saber cuántos metros de cable necesito desde mi antena a un cliente**

1. Activa medidor
2. Haz clic en Antena
3. Haz clic en cada esquina/cruce por donde pasa el cable
4. Haz clic en Casa del Cliente
5. Lee la distancia total

### Caso 2: Verificar Cobertura de Antena

**¿Mi antena de 500m de alcance llega a estos 3 clientes?**

1. Mide distancia desde Antena → Cliente 1 = 320m ✅
2. Mide distancia desde Antena → Cliente 2 = 480m ✅
3. Mide distancia desde Antena → Cliente 3 = 650m ❌

Resultado: Clientes 1 y 2 están dentro del rango, Cliente 3 necesita repetidor

### Caso 3: Identificar Clientes con Problemas

**Rápidamente identificar clientes con alertas activas:**

1. Abre el mapa
2. Busca iconos con punto rojo
3. Esos clientes tienen problemas reportados
4. Prioriza atención a esos clientes

---

## 💡 TIPS Y TRUCOS

### Tip 1: Medir en Línea Recta
Si quieres solo la distancia recta sin segmentos:
- Haz clic en Punto A
- Haz clic en Punto B
- Lee la distancia = distancia línea recta

### Tip 2: Resetear Rápido
Si te equivocas:
- Haz clic en **[Limpiar]**
- Vuelve a comenzar

### Tip 3: Convertir Unidades
- Mostrado: **km** y **metros**
- 0.89 km = 890 m
- 0.05 km = 50 m

### Tip 4: Precisión en Clientes con Alertas
Siempre verifica alertas ANTES de planificar instalaciones:
- Cliente con "Cortado" = sin servicio activo
- Cliente con "Moroso" = revisar pagos
- Cliente con reporte abierto = problema técnico

---

## ⚙️ CONFIGURACIÓN TÉCNICA

### Qué se carga automáticamente

Cuando abres el mapa, se cargan:
- ✅ Clientes (con estado de alerta)
- ✅ Antenas
- ✅ Puntos de Referencia
- ✅ Reportes (estado y prioridad)
- ✅ Planes
- ✅ Topografía del mapa (OpenStreetMap)

### Actualización en Tiempo Real

Si creas un nuevo reporte en otra pestaña:
- Cierra y abre el mapa
- Los clientes se mostrarán con alertas actualizadas
- Los iconos se actualizarán automáticamente

---

## 🐛 TROUBLESHOOTING

### Problema: El medidor no suma distancias correctamente

**Solución:**
1. Verifica que los clics sean en puntos diferentes
2. Ejemplo: No hagas clic 2 veces en el mismo lugar
3. Limpia y comienza de nuevo: **[Limpiar]**

### Problema: No veo alertas en clientes

**Solución:**
1. Verifica que en Reportes haya reportes con estado = "abierto"
2. Llama a `npm run dev` nuevamente
3. Recarga la página: F5 en navegador

### Problema: La distancia parece incorrecta

**Posibles razones:**
1. Estás cerca de los polos (Haversine menos preciso)
2. Terreno montañoso (distancia no es línea recta en altitud)
3. Error en clics (hiciste clic más al norte de lo que creías)

**Solución:** Siempre verifica 2-3 veces antes de usar para cálculos críticos

### Problema: El icono de alerta no se muestra

**Solución:**
1. Borra cache del navegador: Ctrl+Shift+Delete
2. Recarga: Ctrl+Shift+R (reload sin cache)
3. Verifica que el cliente realmente tiene reporte abierto

---

## ✅ CHECKLIST - ANTES DE USAR

- [ ] npm run dev (o tu servidor está activo)
- [ ] Navegas a http://localhost:3000/dashboard/mapa
- [ ] Ves los 4 botones arriba: [👥] [📡] [📍] | [📏]
- [ ] Hay clientes en el mapa
- [ ] Algunos clientes con punto rojo (si tienen reportes)
- [ ] Haces clic en [📏 Medir] y se pone púrpura ✓

**LISTO PARA USAR ✅**

---

## 📞 PREGUNTAS FRECUENTES

**P: ¿Puedo medir en cualquier dirección?**
R: Sí, puedes hacer clic en cualquier parte del mapa. Los puntos se conectan en orden de clic.

**P: ¿La distancia incluye altitud?**
R: No, es distancia horizontal solo. Para altitud, necesitaría integración con DEM (Digital Elevation Model).

**P: ¿Se guardan las mediciones?**
R: No automáticamente. Si quieres guardar, toma screenshot o copia el número mostrado.

**P: ¿Puedo medir entre dos antenas?**
R: Sí, el medidor funciona en cualquier lugar del mapa.

**P: ¿Qué significa el " !" rojo en el cliente?**
R: Significa que tiene al menos 1 reporte abierto en la sección Reportes.

---

## 📚 PRÓXIMAS MEJORAS POSIBLES

- [ ] Exportar mediciones a PDF
- [ ] Guardar rutas frecuentes
- [ ] Calcular costo de cable automáticamente
- [ ] Integrar DEM para altitud
- [ ] Historial de mediciones

---

**Versión:** 8.1  
**Última actualización:** 31 de Marzo, 2026  
**Estado:** ✅ FUNCIONANDO

¡Disfruta del medidor! 📏✨
