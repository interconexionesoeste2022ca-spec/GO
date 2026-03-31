'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, getSesion, tienePermiso } from '@/lib/api'
import { useRouter } from 'next/navigation'

const ROLES = ['admin','staff','verificador','espectador']
const VACÍO = { usuario:'', password:'', rol:'staff', activo: true }

const PERMISOS_ROL = {
  admin:       { write:'✅', delete:'✅', verify:'✅', users:'✅' },
  staff:       { write:'✅', delete:'❌', verify:'✅', users:'❌' },
  verificador: { write:'❌', delete:'❌', verify:'✅', users:'❌' },
  espectador:  { write:'❌', delete:'❌', verify:'❌', users:'❌' },
}

export default function UsuariosPage() {
  const sesion = getSesion()
  const router = useRouter()

  useEffect(() => {
    if (sesion && sesion.rol !== 'admin') router.replace('/dashboard')
  }, [sesion, router])

  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(VACÍO)
  const [userActivo, setUserActivo] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/api/usuarios'); setUsuarios(r.data || []) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { if (sesion?.rol === 'admin') cargar() }, [cargar, sesion])

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function guardar() {
    setError(''); setSaving(true)
    try {
      if (modal === 'crear') await api.post('/api/usuarios', form)
      else await api.patch('/api/usuarios', { usuario: userActivo.usuario, ...form })
      setModal(null); await cargar()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function eliminar(usuario) {
    if (!confirm(`¿Eliminar al usuario "${usuario}"? Esta acción no se puede deshacer.`)) return
    try { await api.delete(`/api/usuarios?usuario=${usuario}`); await cargar() }
    catch (e) { alert(e.message) }
  }

  async function toggleActivo(u) {
    try { await api.patch('/api/usuarios', { usuario: u.usuario, activo: !u.activo }); await cargar() }
    catch (e) { alert(e.message) }
  }

  const colorRol = { admin:'badge-red', staff:'badge-blue', verificador:'badge-cyan', espectador:'badge-gray' }

  if (sesion?.rol !== 'admin') return null

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:20, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺</button>
        <button className="btn btn-primary" onClick={() => { setForm(VACÍO); setError(''); setModal('crear') }}>+ Nuevo Usuario</button>
      </div>

      {/* Tabla de permisos */}
      <div className="card" style={{ marginBottom:20 }}>
        <div className="card-title">Tabla de Permisos por Rol</div>
        <table>
          <thead>
            <tr>
              <th>Rol</th>
              <th style={{ textAlign:'center' }}>Escribir/Crear</th>
              <th style={{ textAlign:'center' }}>Eliminar</th>
              <th style={{ textAlign:'center' }}>Verificar Pagos</th>
              <th style={{ textAlign:'center' }}>Gestión Usuarios</th>
            </tr>
          </thead>
          <tbody>
            {ROLES.map(r => (
              <tr key={r}>
                <td><span className={`badge ${colorRol[r]}`}>{r}</span></td>
                <td style={{ textAlign:'center' }}>{PERMISOS_ROL[r].write}</td>
                <td style={{ textAlign:'center' }}>{PERMISOS_ROL[r].delete}</td>
                <td style={{ textAlign:'center' }}>{PERMISOS_ROL[r].verify}</td>
                <td style={{ textAlign:'center' }}>{PERMISOS_ROL[r].users}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tabla de usuarios */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Último login</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="loading-row">Cargando usuarios…</td></tr>}
            {!loading && usuarios.length === 0 && <tr><td colSpan={6}><div className="empty">Sin usuarios</div></td></tr>}
            {usuarios.map(u => (
              <tr key={u.usuario}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:'linear-gradient(135deg, #7c3aed, #9333ea)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, color:'#fff', fontSize:13 }}>
                      {u.usuario?.[0]?.toUpperCase()}
                    </div>
                    <span className="mono" style={{ fontWeight:600 }}>{u.usuario}</span>
                    {u.usuario === sesion?.usuario && <span className="badge badge-blue" style={{ fontSize:10 }}>TÚ</span>}
                  </div>
                </td>
                <td><span className={`badge ${colorRol[u.rol]||'badge-gray'}`}>{u.rol}</span></td>
                <td>
                  <span className={`badge ${u.activo ? 'badge-green' : 'badge-red'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="mono" style={{ fontSize:12 }}>{u.creado_en?.split('T')[0] || '—'}</td>
                <td className="mono" style={{ fontSize:12 }}>{u.ultimo_login?.split('T')[0] || 'Nunca'}</td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    <button className="btn btn-ghost btn-sm"
                      onClick={() => { setForm({ usuario: u.usuario, password:'', rol: u.rol, activo: u.activo }); setUserActivo(u); setError(''); setModal('editar') }}>
                      ✏ Editar
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActivo(u)} style={{ color: u.activo ? 'var(--amber)' : 'var(--green)' }}>
                      {u.activo ? '⏸ Desactivar' : '▶ Activar'}
                    </button>
                    {u.usuario !== sesion?.usuario && (
                      <button className="btn btn-danger btn-sm" onClick={() => eliminar(u.usuario)}>🗑</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:460 }}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'crear' ? '+ Nuevo Usuario' : `✏ Editar — ${userActivo?.usuario}`}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row" style={{ gap:14 }}>
                {modal === 'crear' && (
                  <div className="field-group">
                    <label className="field-label">Nombre de usuario *</label>
                    <input className="input" value={form.usuario} onChange={e => setF('usuario', e.target.value.toLowerCase().trim())} placeholder="usuario123" autoComplete="off" />
                  </div>
                )}
                <div className="field-group">
                  <label className="field-label">{modal === 'crear' ? 'Contraseña *' : 'Nueva contraseña (vacío = sin cambio)'}</label>
                  <input className="input" type="password" value={form.password} onChange={e => setF('password', e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
                </div>
                <div className="field-group">
                  <label className="field-label">Rol *</label>
                  <select className="select" value={form.rol} onChange={e => setF('rol', e.target.value)}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Estado</label>
                  <select className="select" value={form.activo ? 'true' : 'false'} onChange={e => setF('activo', e.target.value === 'true')}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
              {form.rol && (
                <div style={{ marginTop:16, padding:'10px 14px', background:'rgba(124,58,237,0.06)', borderRadius:8, fontSize:13 }}>
                  <strong>Permisos del rol {form.rol}:</strong>&nbsp;
                  Escribir {PERMISOS_ROL[form.rol]?.write} · Eliminar {PERMISOS_ROL[form.rol]?.delete} · Verificar {PERMISOS_ROL[form.rol]?.verify} · Usuarios {PERMISOS_ROL[form.rol]?.users}
                </div>
              )}
              {error && <div style={{ marginTop:14, color:'var(--red)', fontSize:13 }}>⚠ {error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : modal === 'crear' ? 'Crear Usuario' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
