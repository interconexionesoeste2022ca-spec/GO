// lib/api.js — Cliente fetch autenticado para el frontend
// Versión mejorada: manejo de errores global + helpers de formato

// ─── Sesión ───────────────────────────────────────────────────────────────────
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

// ─── Fetch autenticado ────────────────────────────────────────────────────────
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

  if (res.status === 401) {
    cerrarSesion()
    window.location.href = '/login'
    throw new Error('Sesión expirada')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.msg || `Error ${res.status}`)
  return data
}

export const api = {
  get:    (url)       => fetchApi(url),
  post:   (url, body) => fetchApi(url, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (url, body) => fetchApi(url, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (url)       => fetchApi(url, { method: 'DELETE' }),
}

// ─── Alertas Sweetalert2 ──────────────────────────────────────────────────────
export async function alertaExito(titulo, texto = '') {
  const Swal = (await import('sweetalert2')).default
  return Swal.fire({ icon: 'success', title: titulo, text: texto, timer: 2000, showConfirmButton: false })
}

export async function alertaError(titulo, texto = '') {
  const Swal = (await import('sweetalert2')).default
  return Swal.fire({ icon: 'error', title: titulo, text: texto })
}

export async function alertaConfirmar(titulo, texto = '', boton = 'Sí, continuar') {
  const Swal = (await import('sweetalert2')).default
  const result = await Swal.fire({
    icon: 'warning', title: titulo, text: texto,
    showCancelButton: true, confirmButtonText: boton,
    cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626',
  })
  return result.isConfirmed
}

// ─── Fidelidad ────────────────────────────────────────────────────────────────
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
  BRONCE:  '#cd7f32',
  PLATA:   '#6b7280',
  ORO:     '#f59e0b',
  PLATINO: '#7c3aed',
}

export const BADGE_FIDELIDAD = {
  NUEVO: '🔘', BRONCE: '🥉', PLATA: '🥈', ORO: '🥇', PLATINO: '💎',
}

// ─── Helpers de formato ───────────────────────────────────────────────────────
export function formatUSD(n) {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
}
export function formatBs(n) {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
}
export function formatFecha(fecha) {
  if (!fecha) return '—'
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}
export function mesLabel(mes) {
  if (!mes) return '—'
  const [y, m] = mes.split('-')
  const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  return `${nombres[parseInt(m) - 1]} ${y}`
}
