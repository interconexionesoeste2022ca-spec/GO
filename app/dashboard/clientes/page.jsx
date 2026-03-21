'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, getSesion, tienePermiso } from '@/lib/api'

const CAMPOS_FORM = [
  { key: 'tipo_cliente',         label: 'Tipo Cliente',     type: 'select', opts: ['Natural','Jurídico'] },
  { key: 'documento_identidad',  label: 'C.I. / RIF',       type: 'text',   required: true },
  { key: 'nombre_razon_social',  label: 'Nombre / Razón Social', type: 'text', required: true },
  { key: 'correo_electronico',   label: 'Correo',           type: 'email' },
  { key: 'telefono',             label: 'Teléfono',         type: 'text' },
  { key: 'direccion_ubicacion',  label: 'Dirección',        type: 'text' },
  { key: 'zona_sector',          label: 'Zona / Sector',    type: 'text' },
  { key: 'ip_mac_equipo',        label: 'IP / MAC',         type: 'text' },
  { key: 'plan_id',              label: 'Plan',             type: 'select-plan' },
  { key: 'estado_servicio',      label: 'Estado Servicio',  type: 'select', opts: ['Activo','Cortado','Moroso','Suspendido'] },
  { key: 'fecha_instalacion',    label: 'Fecha Instalación',type: 'date' },
  { key: 'equipo_propiedad',     label: 'Equipo Propiedad', type: 'select', opts: ['Cliente','Empresa'] },
  { key: 'nro_contrato',         label: 'N° Contrato',      type: 'text' },
  { key: 'referido_por',         label: 'Referido por',     type: 'text' },
  { key: 'observaciones',        label: 'Observaciones',    type: 'textarea' },
]

const VACÍO = {
  tipo_cliente:'Natural', documento_identidad:'', nombre_razon_social:'', correo_electronico:'',
  telefono:'', direccion_ubicacion:'', zona_sector:'', ip_mac_equipo:'',
  plan_id:'', estado_servicio:'Activo', fecha_instalacion:'', equipo_propiedad:'Empresa',
  nro_contrato:'', referido_por:'', observaciones:''
}

export default function ClientesPage() {
  const sesion = getSesion()
  const canWrite  = tienePermiso(sesion?.rol, 'write')
  const canDelete = tienePermiso(sesion?.rol, 'delete')

  const [clientes, setClientes] = useState([])
  const [planes, setPlanes]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modal, setModal]       = useState(null)   // null | 'crear' | 'editar' | 'eventos' | 'perfil'
  const [form, setForm]         = useState(VACÍO)
  const [clienteActivo, setClienteActivo] = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [eventoForm, setEventoForm] = useState({ tipo: 'Corte', motivo: '', fecha: new Date().toISOString().split('T')[0] })
  const [historial, setHistorial] = useState([])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([api.get('/api/clientes'), api.get('/api/planes')])
      setClientes(c.data || [])
      setPlanes(p.data?.filter(p => p.activo !== false) || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    const coincide = !q || c.nombre_razon_social?.toLowerCase().includes(q) || c.documento_identidad?.toLowerCase().includes(q) || c.telefono?.includes(q)
    const estado = !filtroEstado || c.estado_servicio === filtroEstado
    return coincide && estado
  })

  function abrirCrear() { setForm(VACÍO); setError(''); setModal('crear') }
  function abrirEditar(c) { setForm({ ...VACÍO, ...c }); setClienteActivo(c); setError(''); setModal('editar') }
  async function abrirEventos(c) {
    setClienteActivo(c)
    const res = await api.get(`/api/clientes/${c.id}/eventos`)
    setHistorial(res.historial || [])
    setEventoForm({ tipo: 'Corte', motivo: '', fecha: new Date().toISOString().split('T')[0] })
    setModal('eventos')
  }

  async function guardar() {
    setError(''); setSaving(true)
    try {
      if (modal === 'crear') {
        await api.post('/api/clientes', form)
      } else {
        await api.patch('/api/clientes', { id: clienteActivo.id, ...form })
      }
      setModal(null)
      await cargar()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este cliente? Esta acción es irreversible.')) return
    try { await api.delete(`/api/clientes?id=${id}`); await cargar() }
    catch (e) { alert(e.message) }
  }

  async function registrarEvento() {
    setError(''); setSaving(true)
    try {
      await api.post(`/api/clientes/${clienteActivo.id}/eventos`, eventoForm)
      const res = await api.get(`/api/clientes/${clienteActivo.id}/eventos`)
      setHistorial(res.historial || [])
      await cargar()
      setEventoForm({ tipo: 'Corte', motivo: '', fecha: new Date().toISOString().split('T')[0] })
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const planNombre = (id) => planes.find(p => p.id === id)?.nombre_plan || id || '—'

  const estadoColor = { Activo:'badge-green', Cortado:'badge-red', Moroso:'badge-amber', Suspendido:'badge-gray' }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input className="input" style={{ maxWidth:280 }} placeholder="Buscar por nombre, C.I., teléfono…"
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select className="select" style={{ maxWidth:160 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {['Activo','Cortado','Moroso','Suspendido'].map(e => <option key={e}>{e}</option>)}
        </select>
        <div style={{ flex:1 }} />
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺ Actualizar</button>
        {canWrite && <button className="btn btn-primary" onClick={abrirCrear}>+ Nuevo Cliente</button>}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>C.I. / RIF</th>
              <th>Teléfono</th>
              <th>Plan</th>
              <th>Estado</th>
              <th>Zona</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="loading-row">Cargando clientes…</td></tr>}
            {!loading && filtrados.length === 0 && <tr><td colSpan={7}><div className="empty">Sin resultados</div></td></tr>}
            {filtrados.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight:600 }}>{c.nombre_razon_social}</td>
                <td className="mono">{c.documento_identidad}</td>
                <td className="mono">{c.telefono || '—'}</td>
                <td>{planNombre(c.plan_id)}</td>
                <td><span className={`badge ${estadoColor[c.estado_servicio] || 'badge-gray'}`}>{c.estado_servicio}</span></td>
                <td>{c.zona_sector || '—'}</td>
                <td>
                  <div style={{ display:'flex', gap:6 }}>
                    {canWrite && <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(c)}>✏ Editar</button>}
                    <button className="btn btn-ghost btn-sm" onClick={() => abrirEventos(c)}>📋 Eventos</button>
                    {canDelete && <button className="btn btn-danger btn-sm" onClick={() => eliminar(c.id)}>🗑</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:10, fontSize:13, color:'var(--txt-2)', fontFamily:'IBM Plex Mono, monospace' }}>
        {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''} mostrado{filtrados.length !== 1 ? 's' : ''}
      </div>

      {/* Modal Crear/Editar */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:680 }}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'crear' ? '+ Nuevo Cliente' : '✏ Editar Cliente'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row cols-2">
                {CAMPOS_FORM.map(campo => (
                  <div key={campo.key} className="field-group" style={campo.type === 'textarea' ? { gridColumn:'1 / -1' } : {}}>
                    <label className="field-label">{campo.label}{campo.required ? ' *' : ''}</label>
                    {campo.type === 'select' && (
                      <select className="select" value={form[campo.key] || ''} onChange={e => setForm(p => ({ ...p, [campo.key]: e.target.value }))}>
                        <option value="">Seleccionar…</option>
                        {campo.opts.map(o => <option key={o}>{o}</option>)}
                      </select>
                    )}
                    {campo.type === 'select-plan' && (
                      <select className="select" value={form[campo.key] || ''} onChange={e => setForm(p => ({ ...p, [campo.key]: e.target.value }))}>
                        <option value="">Sin plan</option>
                        {planes.map(p => <option key={p.id} value={p.id}>{p.nombre_plan} — ${p.precio_usd}</option>)}
                      </select>
                    )}
                    {campo.type === 'textarea' && (
                      <textarea className="input" rows={3} value={form[campo.key] || ''} onChange={e => setForm(p => ({ ...p, [campo.key]: e.target.value }))} />
                    )}
                    {!['select','select-plan','textarea'].includes(campo.type) && (
                      <input className="input" type={campo.type} value={form[campo.key] || ''}
                        onChange={e => setForm(p => ({ ...p, [campo.key]: e.target.value }))} />
                    )}
                  </div>
                ))}
              </div>
              {error && <div style={{ marginTop:14, color:'var(--red)', fontSize:13, fontFamily:'IBM Plex Mono, monospace' }}>⚠ {error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : modal === 'crear' ? 'Crear Cliente' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eventos/Historial */}
      {modal === 'eventos' && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:560 }}>
            <div className="modal-header">
              <div className="modal-title">📋 Eventos — {clienteActivo?.nombre_razon_social}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {canWrite && (
                <div style={{ background:'var(--bg-2)', borderRadius:10, padding:16, marginBottom:20 }}>
                  <div style={{ fontWeight:600, marginBottom:12, fontSize:14 }}>Registrar nuevo evento</div>
                  <div className="form-row cols-3" style={{ marginBottom:10 }}>
                    <div className="field-group">
                      <label className="field-label">Tipo</label>
                      <select className="select" value={eventoForm.tipo} onChange={e => setEventoForm(p => ({ ...p, tipo: e.target.value }))}>
                        {['Corte','Reconexión','Nota'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Fecha</label>
                      <input className="input" type="date" value={eventoForm.fecha} onChange={e => setEventoForm(p => ({ ...p, fecha: e.target.value }))} />
                    </div>
                    <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                      <label className="field-label">Motivo</label>
                      <input className="input" value={eventoForm.motivo} onChange={e => setEventoForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Describe el motivo…" />
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={registrarEvento} disabled={saving}>
                    {saving ? 'Guardando…' : 'Registrar Evento'}
                  </button>
                  {error && <div style={{ marginTop:8, color:'var(--red)', fontSize:12 }}>⚠ {error}</div>}
                </div>
              )}
              <div style={{ fontWeight:600, marginBottom:10, fontSize:14 }}>Historial</div>
              {historial.length === 0 ? (
                <div className="empty">Sin eventos registrados</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[...historial].reverse().map((ev, i) => (
                    <div key={i} style={{
                      padding:'10px 14px', borderRadius:8,
                      background: ev.tipo === 'Corte' ? 'rgba(220,38,38,0.06)' : ev.tipo === 'Reconexión' ? 'rgba(5,150,105,0.06)' : 'rgba(124,58,237,0.06)',
                      borderLeft: `3px solid ${ev.tipo === 'Corte' ? 'var(--red)' : ev.tipo === 'Reconexión' ? 'var(--green)' : 'var(--blue)'}`,
                    }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontWeight:700, fontSize:13 }}>{ev.tipo}</span>
                        <span className="mono" style={{ fontSize:12, color:'var(--txt-2)' }}>{ev.fecha}</span>
                      </div>
                      {ev.motivo && <div style={{ fontSize:13, color:'var(--txt-1)', marginTop:4 }}>{ev.motivo}</div>}
                      {ev.registrado_por && <div style={{ fontSize:11, color:'var(--txt-2)', marginTop:4 }}>por {ev.registrado_por}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
