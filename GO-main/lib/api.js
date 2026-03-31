// lib/api.js — Cliente fetch autenticado para el frontend
// v8.1 — Mejorado: cookies httpOnly (sin token en localStorage), sesión segura

// Re-exportar fidelidad desde módulo compartido
export { calcularFidelidad, COLORES_FIDELIDAD, BADGE_FIDELIDAD } from './fidelidad'

// ─── Sesión (solo datos de display, NO el token) ─────────────────────────────
export function getSesion() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('galanet_sesion')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function guardarSesion(usuario, rol) {
  localStorage.setItem('galanet_sesion', JSON.stringify({ usuario, rol }))
}

export function cerrarSesion() {
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

// ─── Fetch autenticado (usa cookie httpOnly automáticamente) ──────────────────
async function fetchApi(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
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

// ─── Cargar sesión desde el servidor (cookie httpOnly) ────────────────────────
export async function cargarSesion() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
    if (!res.ok) return null
    const data = await res.json()
    if (data.ok) {
      // Cache local para acceso rápido (solo datos de display)
      guardarSesion(data.usuario, data.rol)
      return { usuario: data.usuario, rol: data.rol }
    }
    return null
  } catch { return null }
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
