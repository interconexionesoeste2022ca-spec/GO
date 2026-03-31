-- 🔧 LIMPIAR Y DEDUPLICAR CUENTAS - GALANET OESTE v8.1
-- Este script elimina cuentas duplicadas y mantiene solo un registro por combinación única

-- 1. Ver duplicados antes de limpiar
SELECT banco, titular, COUNT(*) as cantidad
FROM cuentas
WHERE activa = true
GROUP BY banco, titular
HAVING COUNT(*) > 1
ORDER BY cantidad DESC;

-- 2. Identificar IDs a eliminar (mantiene el primero, elimina duplicados)
-- Esto es SOLO para inspección:
SELECT id, banco, titular, created_at, activa
FROM cuentas
WHERE activa = true
ORDER BY banco, titular, created_at;

-- 3. ELIMINAR duplicados (mantener el registro más antiguo, eliminar los nuevos)
-- ⚠️ IMPORTANTE: Haz backup ANTES de ejecutar esto
DELETE FROM cuentas
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER(PARTITION BY banco, titular ORDER BY created_at ASC) as rn
    FROM cuentas
    WHERE activa = true
  ) AS t
  WHERE rn > 1
);

-- 4. Verificar resultado (debería no tener duplicados)
SELECT banco, titular, COUNT(*) as cantidad
FROM cuentas
WHERE activa = true
GROUP BY banco, titular
HAVING COUNT(*) > 1;

-- 5. Ver la lista final de cuentas activas (sin duplicados)
SELECT id, banco, numero_cuenta, titular, tipo_cuenta, activa, created_at
FROM cuentas
WHERE activa = true
ORDER BY banco, titular;

-- ✅ Listo: No hay más duplicados
