// lib/api.js — Cliente fetch autenticado para el frontend

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('galanet_token')
}

export function getSesion() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('galanet_sesion')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function guardarSesion(token, usuario, rol) {
  localStorage.setItem('galanet_token', token)
  localStorage.setItem('galanet_sesion', JSON.stringify({ usuario, rol }))
}

export function cerrarSesion() {
  localStorage.removeItem('galanet_token')
  localStorage.removeItem('galanet_sesion')
}

export function tienePermiso(rol, permiso) {
  const permisos = {
    admin:       { write: true,  delete: true,  verify: true,  users: true  },
    staff:       { write: true,  delete: false, verify: true,  users: false },
    verificador: { write: false, delete: false, verify: true,  users: false },
    espectador:  { write: false, delete: false, verify: false, users: false },
  }
  return permisos[rol?.toLowerCase()]?.[permiso] ?? false
}

async function fetchApi(url, options = {}) {
  const token = getToken()
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.msg || `Error ${res.status}`)
  return data
}

export const api = {
  get:    (url)         => fetchApi(url),
  post:   (url, body)   => fetchApi(url, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (url, body)   => fetchApi(url, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (url)         => fetchApi(url, { method: 'DELETE' }),
}

// Cálculo de fidelidad (frontend)
export function calcularFidelidad(pagosVerificados, cortes) {
  const score = pagosVerificados * 10 - cortes * 15
  let nivel = 'NUEVO'
  if (pagosVerificados >= 12 && cortes === 0) nivel = 'PLATINO'
  else if (pagosVerificados >= 6 && cortes === 0) nivel = 'ORO'
  else if (pagosVerificados >= 3 && cortes <= 1) nivel = 'PLATA'
  else if (pagosVerificados >= 1) nivel = 'BRONCE'
  return { score, nivel }
}

export const COLORES_FIDELIDAD = {
  NUEVO:   '#8b82a8',
  BRONCE:  '#d97706',
  PLATA:   '#6b7280',
  ORO:     '#d97706',
  PLATINO: '#7c3aed',
}

export const BADGE_FIDELIDAD = {
  NUEVO:   '🔘',
  BRONCE:  '🥉',
  PLATA:   '🥈',
  ORO:     '🥇',
  PLATINO: '💎',
}
