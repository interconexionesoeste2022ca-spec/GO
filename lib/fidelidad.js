// lib/fidelidad.js
// Módulo compartido de fidelidad — cliente y servidor
// Elimina la duplicación que existía entre api.js y apiHelpers.js

export function calcularFidelidad(pagosVerificados, cortes) {
  const score = pagosVerificados * 10 - cortes * 15
  let nivel = 'NUEVO'
  if (pagosVerificados >= 12 && cortes === 0)  nivel = 'PLATINO'
  else if (pagosVerificados >= 6  && cortes === 0)  nivel = 'ORO'
  else if (pagosVerificados >= 3  && cortes <= 1)  nivel = 'PLATA'
  else if (pagosVerificados >= 1)               nivel = 'BRONCE'
  return { score, nivel }
}

export const COLORES_FIDELIDAD = {
  NUEVO:   '#8b82a8',
  BRONCE:  '#cd7f32',
  PLATA:   '#6b7280',
  ORO:     '#f59e0b',
  PLATINO: '#7c3aed',
}

export const BADGE_FIDELIDAD = {
  NUEVO: '🔘', BRONCE: '🥉', PLATA: '🥈', ORO: '🥇', PLATINO: '💎',
}
