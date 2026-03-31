'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, getSesion, tienePermiso, alertaConfirmar, alertaExito, alertaError } from '@/lib/api'

// Días de corte disponibles: 1 al 28
const DIAS_CORTE = Array.from({ length: 28 }, (_, i) => i + 1)

const VACÍO = {
  tipo_cliente:'Natural', documento_identidad:'', nombre_razon_social:'',
  correo_electronico:'', telefono:'', whatsapp:'', direccion_ubicacion:'',
  zona_sector:'', ip_mac_equipo:'', plan_id:'', estado_servicio:'Activo',
  fecha_instalacion:'', equipo_propiedad:'Empresa', nro_contrato:'',
  referido_por:'', observaciones:'', dia_corte: 5, notas_cobro:'',
}

const ESTADO_BADGE = {
  Activo:'badge-green', Cortado:'badge-red', Moroso:'badge-amber', Suspendido:'badge-gray'
}

export default function ClientesPage() {
  const sesion    = getSesion()
  const canWrite  = tienePermiso(sesion?.rol, 'write')
  const canDelete = tienePermiso(sesion?.rol, 'delete')

  const [clientes, setClientes]   = useState([])
  const [planes,   setPlanes]     = useState([])
  const [loading,  setLoading]    = useState(true)
  const [busqueda, setBusqueda]   = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroZona,   setFiltroZona]   = useState('')
  const [modal, setModal]         = useState(null) // null | 'crear' | 'editar' | 'eventos' | 'perfil'
  const [form,  setForm]          = useState(VACÍO)
  const [clienteActivo, setClienteActivo] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [error,  setError]        = useState('')
  const [eventoForm, setEventoForm] = useState({ tipo:'Corte', motivo:'', fecha:new Date().toISOString().split('T')[0] })
  const [historial,  setHistorial]  = useState([])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([api.get('/api/clientes'), api.get('/api/planes')])
      setClientes(c.data || [])
      setPlanes(p.data?.filter(p => p.activo !== false) || [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const zonas = [...new Set(clientes.map(c => c.zona_sector).filter(Boolean))].sort()

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    return (!q || c.nombre_razon_social?.toLowerCase().includes(q) || c.documento_identidad?.toLowerCase().includes(q) || c.telefono?.includes(q))
        && (!filtroEstado || c.estado_servicio === filtroEstado)
        && (!filtroZona   || c.zona_sector === filtroZona)
  })

  function abrirCrear() { setForm(VACÍO); setError(''); setModal('crear') }
  function abrirEditar(c) { setForm({ ...VACÍO, ...c, dia_corte: c.dia_corte ?? 5 }); setClienteActivo(c); setError(''); setModal('editar') }

  async function abrirEventos(c) {
    setClienteActivo(c)
    const res = await api.get(`/api/clientes/${c.id}/eventos`)
    setHistorial(res.historial || [])
    setEventoForm({ tipo:'Corte', motivo:'', fecha:new Date().toISOString().split('T')[0] })
    setModal('eventos')
  }

  function set(key, val) { setForm(p => ({ ...p, [key]: val })) }

  async function guardar() {
    setError(''); setSaving(true)
    try {
      if (modal === 'crear') await api.post('/api/clientes', form)
      else await api.patch('/api/clientes', { id: clienteActivo.id, ...form })
      setModal(null)
      await cargar()
      await alertaExito(modal === 'crear' ? 'Cliente creado' : 'Cambios guardados')
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function eliminar(id, nombre) {
    const ok = await alertaConfirmar(`¿Eliminar a ${nombre}?`, 'Esta acción es irreversible.', 'Sí, eliminar')
    if (!ok) return
    try { await api.delete(`/api/clientes?id=${id}`); await cargar() }
    catch(e) { await alertaError('No se pudo eliminar', e.message) }
  }

  async function registrarEvento() {
    setError(''); setSaving(true)
    try {
      await api.post(`/api/clientes/${clienteActivo.id}/eventos`, eventoForm)
      const res = await api.get(`/api/clientes/${clienteActivo.id}/eventos`)
      setHistorial(res.historial || [])
      await cargar()
      setEventoForm({ tipo:'Corte', motivo:'', fecha:new Date().toISOString().split('T')[0] })
    } catch(e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const planNombre = id => planes.find(p => p.id == id)?.nombre_plan || '—'

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input className="input" style={{ maxWidth:280 }} placeholder="Buscar nombre, C.I., teléfono…"
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select className="select" style={{ maxWidth:150 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {['Activo','Cortado','Moroso','Suspendido'].map(e => <option key={e}>{e}</option>)}
        </select>
        {zonas.length > 0 && (
          <select className="select" style={{ maxWidth:150 }} value={filtroZona} onChange={e => setFiltroZona(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.map(z => <option key={z}>{z}</option>)}
          </select>
        )}
        <div style={{ flex:1 }}/>
        <span style={{ fontSize:12, color:'#94a3b8', fontFamily:'JetBrains Mono,monospace' }}>
          {filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺</button>
        {canWrite && <button className="btn btn-primary" onClick={abrirCrear}>+ Nuevo cliente</button>}
      </div>

      {/* Tabla */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ overflowX:'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>C.I. / RIF</th>
                <th>Teléfono</th>
                <th>Plan</th>
                <th>Día corte</th>
                <th>Estado</th>
                <th>Zona</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8}>
                  <div style={{ display:'flex', justifyContent:'center', padding:32 }}>
                    <div style={{ width:24, height:24, border:'2px solid #e2e8f0', borderTop:'2px solid #16a34a', borderRadius:'50%', animation:'spin .7s linear infinite' }}/>
                  </div>
                </td></tr>
              )}
              {!loading && filtrados.length === 0 && (
                <tr><td colSpan={8}><div className="empty">Sin clientes para mostrar</div></td></tr>
              )}
              {filtrados.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight:600, fontSize:13 }}>{c.nombre_razon_social}</div>
                    {c.notas_cobro && (
                      <div style={{ fontSize:10, color:'#94a3b8', marginTop:2 }} title={c.notas_cobro}>
                        📝 {c.notas_cobro.slice(0,30)}{c.notas_cobro.length>30?'…':''}
                      </div>
                    )}
                  </td>
                  <td className="mono">{c.documento_identidad || '—'}</td>
                  <td className="mono" style={{ fontSize:12 }}>{c.telefono || '—'}</td>
                  <td style={{ fontSize:12 }}>{planNombre(c.plan_id)}</td>
                  <td>
                    <div style={{
                      display:'inline-flex', alignItems:'center', gap:5,
                      background: c.dia_corte && c.dia_corte !== 5 ? '#fef9c3' : '#f0fdf4',
                      border: `1px solid ${c.dia_corte && c.dia_corte !== 5 ? '#fde68a' : '#bbf7d0'}`,
                      color: c.dia_corte && c.dia_corte !== 5 ? '#854d0e' : '#166534',
                      padding:'2px 10px', borderRadius:20,
                      fontFamily:'JetBrains Mono,monospace', fontSize:12, fontWeight:700,
                    }}>
                      {c.dia_corte && c.dia_corte !== 5 ? '⚡' : '📅'} Día {c.dia_corte ?? 5}
                    </div>
                  </td>
                  <td><span className={`badge ${ESTADO_BADGE[c.estado_servicio]||'badge-gray'}`}>{c.estado_servicio}</span></td>
                  <td style={{ fontSize:12, color:'#64748b' }}>{c.zona_sector || '—'}</td>
                  <td>
                    <div style={{ display:'flex', gap:6 }}>
                      {canWrite && (
                        <button className="btn btn-ghost btn-sm" onClick={() => abrirEditar(c)}>Editar</button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => abrirEventos(c)}>Eventos</button>
                      {canDelete && (
                        <button className="btn btn-danger btn-sm" onClick={() => eliminar(c.id, c.nombre_razon_social)}>✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal Crear / Editar ──────────────────────────── */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:680 }}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'crear' ? 'Nuevo cliente' : 'Editar cliente'}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="error-msg">⚠ {error}</div>}

              {/* Sección datos personales */}
              <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:10 }}>Datos personales</div>
              <div className="form-row cols-2" style={{ marginBottom:16 }}>
                <div className="field-group">
                  <label className="field-label">Tipo *</label>
                  <select className="select" value={form.tipo_cliente} onChange={e => set('tipo_cliente', e.target.value)}>
                    {['Natural','Jurídico','No Fiscal'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">C.I. / RIF *</label>
                  <input className="input" value={form.documento_identidad} onChange={e => set('documento_identidad', e.target.value)} placeholder="V-12345678" />
                </div>
                <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="field-label">Nombre / Razón Social *</label>
                  <input className="input" value={form.nombre_razon_social} onChange={e => set('nombre_razon_social', e.target.value)} placeholder="Nombre completo" />
                </div>
                <div className="field-group">
                  <label className="field-label">Teléfono</label>
                  <input className="input" value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="0412-1234567" />
                </div>
                <div className="field-group">
                  <label className="field-label">WhatsApp</label>
                  <input className="input" value={form.whatsapp||''} onChange={e => set('whatsapp', e.target.value)} placeholder="+584121234567" />
                </div>
                <div className="field-group">
                  <label className="field-label">Correo electrónico</label>
                  <input className="input" type="email" value={form.correo_electronico} onChange={e => set('correo_electronico', e.target.value)} placeholder="correo@ejemplo.com" />
                </div>
                <div className="field-group">
                  <label className="field-label">Referido por</label>
                  <input className="input" value={form.referido_por} onChange={e => set('referido_por', e.target.value)} />
                </div>
              </div>

              {/* Sección servicio */}
              <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:10 }}>Servicio</div>
              <div className="form-row cols-2" style={{ marginBottom:16 }}>
                <div className="field-group">
                  <label className="field-label">Plan</label>
                  <select className="select" value={form.plan_id||''} onChange={e => set('plan_id', e.target.value)}>
                    <option value="">Sin plan</option>
                    {planes.map(p => <option key={p.id} value={p.id}>{p.nombre_plan} — ${p.precio_usd}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Estado servicio</label>
                  <select className="select" value={form.estado_servicio} onChange={e => set('estado_servicio', e.target.value)}>
                    {['Activo','Cortado','Moroso','Suspendido'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">IP / MAC equipo</label>
                  <input className="input" value={form.ip_mac_equipo} onChange={e => set('ip_mac_equipo', e.target.value)} placeholder="192.168.1.x" />
                </div>
                <div className="field-group">
                  <label className="field-label">Equipo es propiedad de</label>
                  <select className="select" value={form.equipo_propiedad||'Empresa'} onChange={e => set('equipo_propiedad', e.target.value)}>
                    {['Empresa','Cliente'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Fecha instalación</label>
                  <input className="input" type="date" value={form.fecha_instalacion||''} onChange={e => set('fecha_instalacion', e.target.value)} />
                </div>
                <div className="field-group">
                  <label className="field-label">N° Contrato</label>
                  <input className="input" value={form.nro_contrato||''} onChange={e => set('nro_contrato', e.target.value)} />
                </div>
              </div>

              {/* Sección cobro — LA MÁS IMPORTANTE */}
              <div style={{
                background:'#f0fdf4', border:'1px solid #bbf7d0',
                borderRadius:12, padding:16, marginBottom:16,
              }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#166534', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                  <span>💰</span> Configuración de cobro
                </div>
                <div className="form-row cols-2">
                  <div className="field-group">
                    <label className="field-label">Día de corte / vencimiento</label>
                    <select className="select" value={form.dia_corte ?? 5} onChange={e => set('dia_corte', parseInt(e.target.value))}>
                      <option value={1}>Día 1 — Inicio de mes</option>
                      <option value={2}>Día 2</option>
                      <option value={3}>Día 3</option>
                      <option value={4}>Día 4</option>
                      <option value={5}>Día 5 ⭐ (mayoría de clientes)</option>
                      {[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28].map(d => (
                        <option key={d} value={d}>Día {d}</option>
                      ))}
                    </select>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>
                      El pago vence el día {form.dia_corte ?? 5} de cada mes
                    </div>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Notas de cobro</label>
                    <input className="input" value={form.notas_cobro||''} onChange={e => set('notas_cobro', e.target.value)}
                      placeholder="Ej: Paga quincena, solo efectivo…" />
                    <div style={{ fontSize:11, color:'#64748b', marginTop:4 }}>
                      Visible en la pantalla de cobranza
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección ubicación */}
              <div style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.8px', marginBottom:10 }}>Ubicación</div>
              <div className="form-row cols-2" style={{ marginBottom:16 }}>
                <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="field-label">Dirección</label>
                  <input className="input" value={form.direccion_ubicacion||''} onChange={e => set('direccion_ubicacion', e.target.value)} placeholder="Calle, casa, referencias…" />
                </div>
                <div className="field-group">
                  <label className="field-label">Zona / Sector</label>
                  <input className="input" value={form.zona_sector||''} onChange={e => set('zona_sector', e.target.value)} placeholder="Ej: Centro, Zona Norte…" />
                </div>
                <div className="field-group">
                  <label className="field-label">Latitud (GPS)</label>
                  <input className="input" type="number" step="0.0000001" value={form.latitud||''} onChange={e => set('latitud', e.target.value)} placeholder="10.4806418" />
                </div>
                <div className="field-group">
                  <label className="field-label">Longitud (GPS)</label>
                  <input className="input" type="number" step="0.0000001" value={form.longitud||''} onChange={e => set('longitud', e.target.value)} placeholder="-66.9036345" />
                </div>
                {(form.latitud || form.longitud) && (
                  <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                    <a href={`https://www.google.com/maps?q=${form.latitud},${form.longitud}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:12, color:'#16a34a', fontWeight:500 }}>
                      → Ver en Google Maps
                    </a>
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div className="field-group">
                <label className="field-label">Observaciones generales</label>
                <textarea className="input" rows={2} value={form.observaciones||''} onChange={e => set('observaciones', e.target.value)} placeholder="Cualquier nota adicional…" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving||!form.nombre_razon_social}>
                {saving ? 'Guardando…' : modal === 'crear' ? 'Crear cliente' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Eventos ─────────────────────────────────── */}
      {modal === 'eventos' && clienteActivo && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:560 }}>
            <div className="modal-header">
              <div className="modal-title">Eventos — {clienteActivo.nombre_razon_social}</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {canWrite && (
                <div style={{ background:'#f8fafc', borderRadius:12, padding:16, marginBottom:20, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontWeight:600, marginBottom:12, fontSize:13, color:'#0f172a' }}>Registrar evento</div>
                  <div className="form-row cols-2" style={{ marginBottom:10 }}>
                    <div className="field-group">
                      <label className="field-label">Tipo</label>
                      <select className="select" value={eventoForm.tipo} onChange={e => setEventoForm(p=>({...p,tipo:e.target.value}))}>
                        {['Corte','Reconexión','Nota'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="field-group">
                      <label className="field-label">Fecha</label>
                      <input className="input" type="date" value={eventoForm.fecha} onChange={e => setEventoForm(p=>({...p,fecha:e.target.value}))} />
                    </div>
                    <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                      <label className="field-label">Motivo</label>
                      <input className="input" value={eventoForm.motivo} onChange={e => setEventoForm(p=>({...p,motivo:e.target.value}))} placeholder="Describe el motivo…" />
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={registrarEvento} disabled={saving}>
                    {saving ? 'Guardando…' : 'Registrar'}
                  </button>
                  {error && <div className="error-msg" style={{ marginTop:8 }}>{error}</div>}
                </div>
              )}

              <div style={{ fontWeight:600, marginBottom:12, fontSize:13 }}>Historial ({historial.length})</div>
              {historial.length === 0 ? (
                <div className="empty" style={{ padding:'24px 0' }}>Sin eventos registrados</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[...historial].reverse().map((ev, i) => {
                    const colMap = { Corte:'#dc2626', Reconexión:'#16a34a', Nota:'#7c3aed' }
                    const bgMap  = { Corte:'#fef2f2', Reconexión:'#f0fdf4', Nota:'#f5f3ff' }
                    return (
                      <div key={i} style={{
                        padding:'10px 14px', borderRadius:10,
                        background: bgMap[ev.tipo] || '#f8fafc',
                        borderLeft:`3px solid ${colMap[ev.tipo] || '#94a3b8'}`,
                      }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <span style={{ fontWeight:700, fontSize:13, color: colMap[ev.tipo] }}>{ev.tipo}</span>
                          <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:'#94a3b8' }}>{ev.fecha}</span>
                        </div>
                        {ev.motivo && <div style={{ fontSize:13, color:'#334155', marginTop:4 }}>{ev.motivo}</div>}
                        {ev.registrado_por && <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>por {ev.registrado_por}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}