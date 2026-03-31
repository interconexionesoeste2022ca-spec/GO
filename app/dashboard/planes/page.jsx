'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, getSesion, tienePermiso } from '@/lib/api'

const VACÍO = { nombre_plan:'', tecnologia:'Fibra Óptica', precio_usd:'', velocidad_bajada:'', velocidad_subida:'', descripcion:'', activo: true }
const TECNOLOGIAS = ['Fibra Óptica','Radio','Cable','FTTH','Mixto']

export default function PlanesPage() {
  const sesion = getSesion()
  const canWrite  = tienePermiso(sesion?.rol, 'write')
  const canDelete = tienePermiso(sesion?.rol, 'delete')

  const [planes, setPlanes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [form, setForm]       = useState(VACÍO)
  const [planActivo, setPlanActivo] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try { const r = await api.get('/api/planes'); setPlanes(r.data || []) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  function abrirCrear() { setForm(VACÍO); setError(''); setModal('crear') }
  function abrirEditar(p) { setForm({ ...VACÍO, ...p }); setPlanActivo(p); setError(''); setModal('editar') }

  async function guardar() {
    setError(''); setSaving(true)
    try {
      if (modal === 'crear') await api.post('/api/planes', form)
      else await api.patch('/api/planes', { id: planActivo.id, ...form })
      setModal(null); await cargar()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este plan?')) return
    try { await api.delete(`/api/planes?id=${id}`); await cargar() }
    catch (e) { alert(e.message) }
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:20, justifyContent:'flex-end' }}>
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺ Actualizar</button>
        {canWrite && <button className="btn btn-primary" onClick={abrirCrear}>+ Nuevo Plan</button>}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
        {loading && <div className="empty">Cargando planes…</div>}
        {!loading && planes.length === 0 && <div className="empty">Sin planes registrados</div>}
        {planes.map(p => (
          <div key={p.id} className="card" style={{ position:'relative' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
              <div>
                <div style={{ fontFamily:'Syne, sans-serif', fontWeight:800, fontSize:18 }}>{p.nombre_plan}</div>
                <div style={{ fontSize:12, color:'var(--on-surface-variant)', marginTop:2 }}>{p.tecnologia}</div>
              </div>
              <span className={`badge ${p.activo !== false ? 'badge-green' : 'badge-gray'}`}>{p.activo !== false ? 'Activo' : 'Inactivo'}</span>
            </div>
            <div style={{ fontFamily:'IBM Plex Mono, monospace', fontSize:28, fontWeight:700, color:'var(--tertiary)', marginBottom:12 }}>
              ${Number(p.precio_usd||0).toFixed(2)} <span style={{ fontSize:14, fontWeight:400, color:'var(--on-surface-variant)' }}>USD/mes</span>
            </div>
            <div style={{ display:'flex', gap:12, fontSize:13, color:'var(--on-surface)', marginBottom:12 }}>
              <div>⬇ <strong>{p.velocidad_bajada}</strong> Mbps</div>
              <div>⬆ <strong>{p.velocidad_subida}</strong> Mbps</div>
            </div>
            {p.descripcion && <div style={{ fontSize:13, color:'var(--on-surface-variant)', marginBottom:14 }}>{p.descripcion}</div>}
            <div style={{ display:'flex', gap:8 }}>
              {canWrite && <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(p)}>✏ Editar</button>}
              {canDelete && <button className="btn btn-danger btn-sm" onClick={() => eliminar(p.id)}>🗑</button>}
            </div>
          </div>
        ))}
      </div>

      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:520 }}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'crear' ? '+ Nuevo Plan' : '✏ Editar Plan'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row cols-2">
                <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="field-label">Nombre del Plan *</label>
                  <input className="input" value={form.nombre_plan} onChange={e => setF('nombre_plan', e.target.value)} placeholder="Ej: Plan Básico 10MB" />
                </div>
                <div className="field-group">
                  <label className="field-label">Tecnología</label>
                  <select className="select" value={form.tecnologia} onChange={e => setF('tecnologia', e.target.value)}>
                    {TECNOLOGIAS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Precio USD/mes *</label>
                  <input className="input" type="number" step="0.01" value={form.precio_usd} onChange={e => setF('precio_usd', e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Velocidad Bajada (Mbps)</label>
                  <input className="input" value={form.velocidad_bajada} onChange={e => setF('velocidad_bajada', e.target.value)} placeholder="50" />
                </div>
                <div className="field-group">
                  <label className="field-label">Velocidad Subida (Mbps)</label>
                  <input className="input" value={form.velocidad_subida} onChange={e => setF('velocidad_subida', e.target.value)} placeholder="20" />
                </div>
                <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="field-label">Descripción</label>
                  <textarea className="input" rows={2} value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Estado</label>
                  <select className="select" value={form.activo ? 'true' : 'false'} onChange={e => setF('activo', e.target.value === 'true')}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
              {error && <div style={{ marginTop:14, color:'var(--error)', fontSize:13, fontFamily:'IBM Plex Mono, monospace' }}>⚠ {error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : modal === 'crear' ? 'Crear Plan' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
