'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, getSesion, tienePermiso } from '@/lib/api'

const TIPOS_PAGO = ['Transferencia','Pago Móvil','Efectivo Bs','Efectivo Divisas','Zelle','Binance','Bancaribe','Bancamiga Fiscal','Bancamiga Gs']
const ESTADOS    = ['Pendiente','Verificado','Confirmado','Rechazado']
const MESES = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - i)
  return d.toISOString().slice(0, 7)
})

const VACÍO = {
  cliente_id:'', mes_cobro: new Date().toISOString().slice(0,7),
  monto_facturado_usd:'', tasa_bcv_facturacion:'', fecha_pago: new Date().toISOString().split('T')[0],
  tasa_bcv_pago:'', monto_pagado_bs:'', cuenta_id:'', referencia:'',
  tipo_pago:'Transferencia', nota_pago:'', capture_url:'',
  correo_del_titular:'', nombre_del_titular:'', monto_usd_real:''
}

const REQUIERE_TITULAR = ['Zelle','Binance']
const SIN_TASA = ['Efectivo Divisas','Zelle','Binance']

export default function PagosPage() {
  const sesion = getSesion()
  const canWrite  = tienePermiso(sesion?.rol, 'write')
  const canVerify = tienePermiso(sesion?.rol, 'verify')
  const canDelete = tienePermiso(sesion?.rol, 'delete')

  const [pagos, setPagos]         = useState([])
  const [clientes, setClientes]   = useState([])
  const [cuentas, setCuentas]     = useState([])
  const [planes, setPlanes]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [form, setForm]           = useState(VACÍO)
  const [pagoActivo, setPagoActivo] = useState(null)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [busqueda, setBusqueda]   = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroMes, setFiltroMes] = useState('')
  const [verComprobante, setVerComprobante] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [pgs, cls, ctas, pls] = await Promise.all([
        api.get('/api/pagos?limite=500'),
        api.get('/api/clientes'),
        api.get('/api/cuentas'),
        api.get('/api/planes'),
      ])
      setPagos(pgs.data || [])
      setClientes(cls.data || [])
      setCuentas(ctas.data || [])
      setPlanes(pls.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Al seleccionar cliente, autocompletar datos del plan
  function onClienteChange(id) {
    const c = clientes.find(c => c.id === id)
    if (!c) { setForm(p => ({ ...p, cliente_id: id })); return }
    const plan = planes.find(pl => pl.id === c.plan_id)
    setForm(p => ({
      ...p, cliente_id: id,
      cedula_cliente: c.documento_identidad,
      nombre_cliente: c.nombre_razon_social,
      tipo_cliente: c.tipo_cliente,
      nombre_plan: plan?.nombre_plan || '',
      monto_facturado_usd: plan?.precio_usd || '',
    }))
  }

  const filtrados = pagos.filter(p => {
    const q = busqueda.toLowerCase()
    const ok = !q || p.nombre_cliente?.toLowerCase().includes(q) || p.cedula_cliente?.includes(q) || p.referencia?.includes(q)
    const est = !filtroEstado || p.estado_verificacion === filtroEstado
    const mes = !filtroMes || p.mes_cobro === filtroMes
    return ok && est && mes
  })

  async function guardar() {
    setError(''); setSaving(true)
    try {
      const payload = { ...form }
      if (SIN_TASA.includes(payload.tipo_pago)) { payload.tasa_bcv_pago = '1'; payload.tasa_bcv_facturacion = '1' }
      await api.post('/api/pagos', payload)
      setModal(null)
      await cargar()
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function cambiarEstado(id, nuevoEstado, comentario = '') {
    try {
      await api.patch('/api/pagos', { id, estado_verificacion: nuevoEstado, comentario_pago: comentario })
      await cargar()
    } catch (e) { alert(e.message) }
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este pago?')) return
    try { await api.delete(`/api/pagos?id=${id}`); await cargar() }
    catch (e) { alert(e.message) }
  }

  const badgeEstado = {
    Pendiente:'badge-amber', Verificado:'badge-blue', Confirmado:'badge-green', Rechazado:'badge-red'
  }

  const esTitular = REQUIERE_TITULAR.includes(form.tipo_pago)
  const esSinTasa = SIN_TASA.includes(form.tipo_pago)

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <input className="input" style={{ maxWidth:240 }} placeholder="Buscar cliente, referencia…"
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select className="select" style={{ maxWidth:160 }} value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e}>{e}</option>)}
        </select>
        <select className="select" style={{ maxWidth:160 }} value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
          <option value="">Todos los meses</option>
          {MESES.map(m => <option key={m}>{m}</option>)}
        </select>
        <div style={{ flex:1 }} />
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺</button>
        {canWrite && <button className="btn btn-primary" onClick={() => { setForm(VACÍO); setError(''); setModal('crear') }}>+ Registrar Abono</button>}
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Mes</th>
              <th>Plan</th>
              <th>Tipo Pago</th>
              <th>Monto USD</th>
              <th>Referencia</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={9} className="loading-row">Cargando pagos…</td></tr>}
            {!loading && filtrados.length === 0 && <tr><td colSpan={9}><div className="empty">Sin resultados</div></td></tr>}
            {filtrados.map(p => (
              <tr key={p.id}>
                <td style={{ fontWeight:600, maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre_cliente}</td>
                <td className="mono">{p.mes_cobro}</td>
                <td style={{ fontSize:13 }}>{p.nombre_plan || '—'}</td>
                <td style={{ fontSize:12 }}>{p.tipo_pago}</td>
                <td className="mono">${Number(p.monto_facturado_usd||0).toFixed(2)}</td>
                <td className="mono" style={{ fontSize:12 }}>{p.referencia || '—'}</td>
                <td className="mono" style={{ fontSize:12 }}>{p.fecha_pago}</td>
                <td><span className={`badge ${badgeEstado[p.estado_verificacion]||'badge-gray'}`}>{p.estado_verificacion}</span></td>
                <td>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                    {p.capture_url && (
                      <button className="btn btn-ghost btn-sm" onClick={() => setVerComprobante(p.capture_url)}>🖼</button>
                    )}
                    {canVerify && p.estado_verificacion === 'Pendiente' && (
                      <button className="btn btn-ghost btn-sm" style={{ color:'var(--blue)' }}
                        onClick={() => cambiarEstado(p.id, 'Verificado')}>✔ Verificar</button>
                    )}
                    {canVerify && p.estado_verificacion === 'Verificado' && (
                      <button className="btn btn-ghost btn-sm" style={{ color:'var(--green)' }}
                        onClick={() => cambiarEstado(p.id, 'Confirmado')}>✔✔ Confirmar</button>
                    )}
                    {canVerify && p.estado_verificacion !== 'Rechazado' && (
                      <button className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }}
                        onClick={() => { const m = prompt('Motivo del rechazo:'); if (m !== null) cambiarEstado(p.id, 'Rechazado', m) }}>✕</button>
                    )}
                    {canVerify && p.estado_verificacion === 'Rechazado' && (
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => cambiarEstado(p.id, 'Pendiente')}>↺ Resetear</button>
                    )}
                    {canDelete && (
                      <button className="btn btn-danger btn-sm" onClick={() => eliminar(p.id)}>🗑</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop:10, fontSize:13, color:'var(--txt-2)', fontFamily:'IBM Plex Mono, monospace' }}>
        {filtrados.length} pago{filtrados.length !== 1 ? 's' : ''} · Total USD: $
        {filtrados.filter(p => p.estado_verificacion !== 'Rechazado').reduce((s,p) => s + Number(p.monto_facturado_usd||0), 0).toFixed(2)}
      </div>

      {/* Modal Registrar Abono */}
      {modal === 'crear' && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal" style={{ maxWidth:640 }}>
            <div className="modal-header">
              <div className="modal-title">💳 Registrar Abono</div>
              <button className="modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-row cols-2">
                <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="field-label">Cliente *</label>
                  <select className="select" value={form.cliente_id} onChange={e => onClienteChange(e.target.value)}>
                    <option value="">Seleccionar cliente…</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre_razon_social} — {c.documento_identidad}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Mes de Cobro *</label>
                  <input className="input" type="month" value={form.mes_cobro} onChange={e => setForm(p => ({ ...p, mes_cobro: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">Tipo de Pago *</label>
                  <select className="select" value={form.tipo_pago} onChange={e => setForm(p => ({ ...p, tipo_pago: e.target.value }))}>
                    {TIPOS_PAGO.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Monto USD Facturado *</label>
                  <input className="input" type="number" step="0.01" value={form.monto_facturado_usd} onChange={e => setForm(p => ({ ...p, monto_facturado_usd: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">Fecha Pago *</label>
                  <input className="input" type="date" value={form.fecha_pago} onChange={e => setForm(p => ({ ...p, fecha_pago: e.target.value }))} />
                </div>
                {!esSinTasa && <>
                  <div className="field-group">
                    <label className="field-label">Tasa BCV Facturación</label>
                    <input className="input" type="number" step="0.01" placeholder="BCV al facturar" value={form.tasa_bcv_facturacion} onChange={e => setForm(p => ({ ...p, tasa_bcv_facturacion: e.target.value }))} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Tasa BCV Pago</label>
                    <input className="input" type="number" step="0.01" placeholder="BCV al pagar" value={form.tasa_bcv_pago} onChange={e => setForm(p => ({ ...p, tasa_bcv_pago: e.target.value }))} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Monto Pagado Bs</label>
                    <input className="input" type="number" step="0.01" value={form.monto_pagado_bs} onChange={e => setForm(p => ({ ...p, monto_pagado_bs: e.target.value }))} />
                  </div>
                </>}
                {!esTitular && (
                  <div className="field-group">
                    <label className="field-label">Cuenta Destino</label>
                    <select className="select" value={form.cuenta_id} onChange={e => setForm(p => ({ ...p, cuenta_id: e.target.value }))}>
                      <option value="">Seleccionar cuenta…</option>
                      {cuentas.filter(c => c.activa !== false).map(c => (
                        <option key={c.id} value={c.id}>{c.banco} — {c.numero_cuenta || c.telefono_pago_movil}</option>
                      ))}
                    </select>
                  </div>
                )}
                {esTitular && <>
                  <div className="field-group">
                    <label className="field-label">Correo del Titular</label>
                    <input className="input" type="email" value={form.correo_del_titular} onChange={e => setForm(p => ({ ...p, correo_del_titular: e.target.value }))} />
                  </div>
                  <div className="field-group">
                    <label className="field-label">Nombre del Titular</label>
                    <input className="input" value={form.nombre_del_titular} onChange={e => setForm(p => ({ ...p, nombre_del_titular: e.target.value }))} />
                  </div>
                </>}
                <div className="field-group">
                  <label className="field-label">Referencia / N° Op.</label>
                  <input className="input" value={form.referencia} onChange={e => setForm(p => ({ ...p, referencia: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">URL Comprobante</label>
                  <input className="input" placeholder="https://drive.google.com/…" value={form.capture_url} onChange={e => setForm(p => ({ ...p, capture_url: e.target.value }))} />
                </div>
                <div className="field-group" style={{ gridColumn:'1 / -1' }}>
                  <label className="field-label">Nota</label>
                  <textarea className="input" rows={2} value={form.nota_pago} onChange={e => setForm(p => ({ ...p, nota_pago: e.target.value }))} />
                </div>
              </div>
              {error && <div style={{ marginTop:14, color:'var(--red)', fontSize:13, fontFamily:'IBM Plex Mono, monospace' }}>⚠ {error}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando…' : 'Registrar Abono'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Comprobante */}
      {verComprobante && (
        <div className="modal-backdrop" onClick={() => setVerComprobante(null)}>
          <div style={{ background:'#fff', borderRadius:14, padding:20, maxWidth:500, width:'100%' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12, alignItems:'center' }}>
              <strong>Comprobante</strong>
              <button className="modal-close" onClick={() => setVerComprobante(null)}>✕</button>
            </div>
            <img src={verComprobante} alt="Comprobante" style={{ width:'100%', borderRadius:8 }} />
            <a href={verComprobante} target="_blank" rel="noreferrer" style={{ display:'block', marginTop:10, textAlign:'center', color:'var(--blue)', fontSize:13 }}>
              Abrir en nueva pestaña →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
