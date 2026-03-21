// lib/auth.js
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET
const JWT_TTL    = '5h'

// SHA-256 igual que tu Google Apps Script
export function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex')
}

// Generar token JWT con usuario y rol
export function generarToken(usuario, rol) {
  return jwt.sign({ usuario, rol }, JWT_SECRET, { expiresIn: JWT_TTL })
}

// Verificar y decodificar token
export function verificarToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET)  // { usuario, rol, iat, exp }
  } catch {
    return null
  }
}

// Middleware para API routes — extrae sesión del header Authorization
export function getSesion(req) {
  const header = req.headers.authorization || ''
  const token  = header.replace('Bearer ', '').trim()
  if (!token) return null
  return verificarToken(token)
}

// Roles y permisos (igual que tu auth.gs)
export const ROLES = {
  admin:       { canWrite: true,  canDelete: true,  canVerify: true,  canViewUsers: true  },
  staff:       { canWrite: true,  canDelete: false, canVerify: true,  canViewUsers: false },
  verificador: { canWrite: false, canDelete: false, canVerify: true,  canViewUsers: false },
  espectador:  { canWrite: false, canDelete: false, canVerify: false, canViewUsers: false },
}

export function assertRol(sesion, rolesPermitidos) {
  if (!sesion) throw new Error('SESION_INVALIDA')
  const rolActual = (sesion.rol || '').toLowerCase()
  if (!rolesPermitidos.map(r => r.toLowerCase()).includes(rolActual)) {
    throw new Error('ACCESO_DENEGADO')
  }
}