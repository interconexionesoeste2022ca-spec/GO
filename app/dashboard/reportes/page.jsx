'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, getSesion, tienePermiso } from '@/lib/api'

const ESTADOS_R   = ['abierto','en_proceso','resuelto','cerrado']
const PRIORIDADES = ['baja','media','alta','critica']
const TIPOS_R = ['Avería','Instalación','Soporte','Reclamo','Mantenimiento','Otro']
const VACÍO = { cliente_id:'', tipo:'Avería', prioridad:'media', titulo:'', descripcion:'', tecnico:'' }

const COL_ESTADO = { abierto:'badge-amber', en_proceso:'badge-cyan', resuelto:'badge-blue', cerrado:'badge-green' }
const COL_PRIO   = { baja:'badge-gray', media:'badge-blue', alta:'badge-amber', critica:'badge-red' }

export default function ReportesPage() {
  const sesion    = getSesion()
  const canWrite  = tienePermiso(sesion?.rol, 'write')
  const canDelete = tienePermiso(sesion?.rol, 'delete')

  const [reportes, setReportes] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [form, setForm]         = useState(VACÍO)
  const [repActivo, setRepActivo] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPrio, setFiltroPrio]     = useState('')
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [rp, cl] = await Promise.all([api.get('/api/reportes'), api.get('/api/clientes')])
      setReportes(rp.data || [])
      setClientes(cl.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = reportes.filter(r => {
    const q = busqueda.toLowerCase()
    const ok = !q || r.titulo?.toLowerCase().includes(q) || r.clientes?.nombre_razon_social?.toLowerCase().includes(q)
    return ok && (!filtroEstado || r.estado === filtroEstado) && (!filtroPrio || r.prioridad === filtroPrio)
  })

  async function guardar() {
    setError(''); setSaving(true)
    try {
      if (modal === 'crear') await api.post('/api/reportes', form)
      else await api.patch('/api/reportes', { id: repActivo.id, ...form })
      setModal(null); await cargar()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function cambiarEstado(id, estado) {
    try { await api.patch('/api/reportes', { id, estado }); await cargar() }
    catch (e) { alert(e.message) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este reporte?')) return
    try { await api.delete(`/api/reportes?id=${id}`); await cargar() }
    catch (e) { alert(e.message) }
  }

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const siguienteEstado = { abierto:'en_proceso', en_proceso:'resuelto', resuelto:'cerrado' }
  const labelSiguiente  = { abierto:'▶ Iniciar', en_proceso:'✔ Resolver', resuelto:'✓ Cerrar' }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input className="input" style={{ maxWidth:240 }} placeholder="Buscar título, cliente…"
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select className="select" style={{ maxWidth:150 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS_R.map(e => <option key={e}>{e}</option>)}
        </select>
        <select className="select" style={{ maxWidth:140 }} value={filtroPrio} onChange={e => setFiltroPrio(e.target.value)}>
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
        </select>
        <div style={{ flex:1 }} />
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺</button>
        {canWrite && <button className="btn btn-primary" onClick={() => { setForm(VACÍO); setError(''); setModal('crear') }}>+ Nuevo Reporte</button>}
      </div>

      {/* Cards grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16 }}>
        {loading && <div className="empty">Cargando reportes…</div>}
        {!loading && filtrados.length === 0 && <div className="empty">Sin reportes</div>}
        {filtrados.map(r => (
          <div key={r.id} className="card" style={{
            borderLeft: `4px solid ${r.prioridad === 'critica' ? 'var(--red)' : r.prioridad === 'alta' ? 'var(--amber)' : r.prioridad === 'media' ? 'var(--blue)' : 'var(--txt-2)'}`,
          }}>
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              <span className={`badge ${COL_ESTADO[r.estado]||'badge-gray'}`}>{r.estado}</span>
              <span className={`badge ${COL_PRIO[r.prioridad]||'badge-gray'}`}>{r.prioridad}</span>
              <span className="badge badge-gray" style={{ marginLeft:'auto' }}>{r.tipo}</span>
            </div>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>{r.titulo}</div>
            <div style={{ fontSize:13, color:'var(--txt-1)', marginBottom:8 }}>
              👤 {r.clientes?.nombre_razon_social || '—'}
            </div>
            {r.descripcion && (
              <div style={{ fontSize:13, color:'var(--txt-2)', marginBottom:8, lineHeight:1.5 }}>
                {r.descripcion.slice(0, 120)}{r.descripcion.length > 120 ? '…' : ''}
              </div>
            )}
            {r.tecnico && <div style={{ fontSize:12, color:'var(--txt-2)', marginBottom:8 }}>🔧 {r.tecnico}</div>}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12 }}>
              <div className="mono" style={{ fontSize:11, color:'var(--txt-2)' }}>{r.fecha_reporte}</div>
              <div style={{ display:'flex', gap:6 }}>
                {canWrite && r.estado !== 'cerrado' && siguienteEstado[r.estado] && (
                  <button className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(r.id, siguienteEstado[r.estado])}>
                    {labelSiguiente[r.estado]}
                  </button>
                )}
                {canWrite && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ ...r }); setRepActivo(r); setError(''); setModal('editar') }}>✏</button>
                )}
                {canDelete && (
                  <button className="btn btn-danger btn-sm" onClick={() => eliminar(r.id)}>🗑</button>
                )}
              </div>
            </div>
            {r.solucion && (
              <div style={{ marginTop:10, padding:'8px 12px', background:'rgba(5,150,105,0.06)', borderRadius:8, fontSize:13, color:'var(--txt-1)' }}>
                ✅ <strong>Solución:</strong> {r.solucion}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal Crear/Editar */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:560 }}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'crear' ? '+ Nuevo Reporte' : '✏ Editar Reporte'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row cols-2">
                <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="field-label">Cliente *</label>
                  <select className="select" value={form.cliente_id} onChange={e => setF('cliente_id', e.target.value)}>
                    <option value="">Seleccionar…</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Tipo</label>
                  <select className="select" value={form.tipo} onChange={e => setF('tipo', e.target.value)}>
                    {TIPOS_R.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Prioridad</label>
                  <select className="select" value={form.prioridad} onChange={e => setF('prioridad', e.target.value)}>
                    {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="field-label">Título *</label>
                  <input className="input" value={form.titulo} onChange={e => setF('titulo', e.target.value)} />
                </div>
                <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="field-label">Descripción</label>
                  <textarea className="input" rows={3} value={form.descripcion} onChange={e => setF('descripcion', e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">Técnico asignado</label>
                  <input className="input" value={form.tecnico} onChange={e => setF('tecnico', e.target.value)} />
                </div>
                {modal === 'editar' && (
                  <div className="field-group">
                    <label className="field-label">Estado</label>
                    <select className="select" value={form.estado || 'abierto'} onChange={e => setF('estado', e.target.value)}>
                      {ESTADOS_R.map(e => <option key={e}>{e}</option>)}
                    </select>
                  </div>
                )}
                {modal === 'editar' && (
                  <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                    <label className="field-label">Solución</label>
                    <textarea className="input" rows={2} value={form.solucion || ''} onChange={e => setF('solucion', e.target.value)} />
                  </div>
                )}
              </div>
              {error && <div style={{ marginTop:14, color:'var(--red)', fontSize:13 }}>⚠ {error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : modal === 'crear' ? 'Crear Reporte' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
