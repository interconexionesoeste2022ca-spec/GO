'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, getSesion, tienePermiso } from '@/lib/api'

const BANCOS = ['Banco de Venezuela','Banesco','Mercantil','Provincial','Bicentenario','Bancamiga','Bancaribe','BNC','Sofitasa','Otro']
const TIPOS = ['Corriente','Ahorro','Pago Móvil','Cuenta Digital']
const VACÍO = { banco:'Banco de Venezuela', numero_cuenta:'', titular:'', tipo_cuenta:'Corriente', telefono_pago_movil:'', cedula_rif:'', activa: true }

export default function CuentasPage() {
  const sesion = getSesion()
  const canWrite  = tienePermiso(sesion?.rol, 'write')
  const canDelete = tienePermiso(sesion?.rol, 'delete')

  const [cuentas, setCuentas]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(VACÍO)
  const [cuentaActiva, setCuentaActiva] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/api/cuentas'); setCuentas(r.data || []) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function guardar() {
    setError(''); setSaving(true)
    try {
      if (modal === 'crear') await api.post('/api/cuentas', form)
      else await api.patch('/api/cuentas', { id: cuentaActiva.id, ...form })
      setModal(null); await cargar()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta cuenta?')) return
    try { await api.delete(`/api/cuentas?id=${id}`); await cargar() }
    catch (e) { alert(e.message) }
  }

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:20, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺</button>
        {canWrite && <button className="btn btn-primary" onClick={() => { setForm(VACÍO); setError(''); setModal('crear') }}>+ Nueva Cuenta</button>}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Banco</th>
              <th>Tipo</th>
              <th>N° Cuenta / Teléfono</th>
              <th>Titular</th>
              <th>C.I. / RIF</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="loading-row">Cargando cuentas…</td></tr>}
            {!loading && cuentas.length === 0 && <tr><td colSpan={7}><div className="empty">Sin cuentas registradas</div></td></tr>}
            {cuentas.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight:600 }}>{c.banco}</td>
                <td>{c.tipo_cuenta}</td>
                <td className="mono">{c.numero_cuenta || c.telefono_pago_movil || '—'}</td>
                <td>{c.titular}</td>
                <td className="mono">{c.cedula_rif || '—'}</td>
                <td><span className={`badge ${c.activa !== false ? 'badge-green' : 'badge-gray'}`}>{c.activa !== false ? 'Activa' : 'Inactiva'}</span></td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    {canWrite && (
                      <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ ...VACÍO, ...c }); setCuentaActiva(c); setError(''); setModal('editar') }}>✏ Editar</button>
                    )}
                    {canDelete && <button className="btn btn-danger btn-sm" onClick={() => eliminar(c.id)}>🗑</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:520 }}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'crear' ? '+ Nueva Cuenta' : '✏ Editar Cuenta'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row cols-2">
                <div className="field-group">
                  <label className="field-label">Banco *</label>
                  <select className="select" value={form.banco} onChange={e => setF('banco', e.target.value)}>
                    {BANCOS.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Tipo de Cuenta</label>
                  <select className="select" value={form.tipo_cuenta} onChange={e => setF('tipo_cuenta', e.target.value)}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">N° de Cuenta</label>
                  <input className="input" value={form.numero_cuenta} onChange={e => setF('numero_cuenta', e.target.value)} placeholder="0105-0000-…" />
                </div>
                <div className="field-group">
                  <label className="field-label">Teléfono Pago Móvil</label>
                  <input className="input" value={form.telefono_pago_movil} onChange={e => setF('telefono_pago_movil', e.target.value)} placeholder="04XX-XXXXXXX" />
                </div>
                <div className="field-group">
                  <label className="field-label">Titular *</label>
                  <input className="input" value={form.titular} onChange={e => setF('titular', e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">C.I. / RIF</label>
                  <input className="input" value={form.cedula_rif} onChange={e => setF('cedula_rif', e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Estado</label>
                  <select className="select" value={form.activa ? 'true' : 'false'} onChange={e => setF('activa', e.target.value === 'true')}>
                    <option value="true">Activa</option>
                    <option value="false">Inactiva</option>
                  </select>
                </div>
              </div>
              {error && <div style={{ marginTop:14, color:'var(--red)', fontSize:13 }}>⚠ {error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : modal === 'crear' ? 'Crear Cuenta' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
