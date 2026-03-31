'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api, getSesion, tienePermiso, mesLabel, formatUSD, alertaConfirmar, alertaExito, alertaError } from '@/lib/api'

const TIPOS_PAGO = ['Transferencia','Pago Móvil','Efectivo Bs','Efectivo Divisas','Zelle','Binance','Bancaribe','Bancamiga Fiscal','Bancamiga Gs']
const ESTADOS    = ['Pendiente','Verificado','Confirmado','Rechazado']
const MESES      = Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-i);return d.toISOString().slice(0,7)})
const REQUIERE_TITULAR = ['Zelle','Binance']
const SIN_TASA         = ['Efectivo Divisas','Zelle','Binance']

const PAGO_LINEA_VACIA = () => ({
  tipo_pago:'Pago Móvil', referencia:'', monto_usd_real:'',
  monto_pagado_bs:'', tasa_bcv_pago:'',
  archivo: null, preview: null, driveUrl: '', uploading: false,
  refStatus: null, // null | 'checking' | 'ok' | 'duplicada'
  refMsg: '',
  nota_pago: '',
  correo_del_titular:'', nombre_del_titular:'',
})

const VACÍO = {
  cliente_id:'', mes_cobro:new Date().toISOString().slice(0,7),
  monto_facturado_usd:'', tasa_bcv_facturacion:'',
  fecha_pago:new Date().toISOString().split('T')[0],
  cuenta_id:'', capture_url:'',
}

const BADGE = {
  'Pendiente':'badge badge-amber','Verificado':'badge badge-blue',
  'Confirmado':'badge badge-green','Rechazado':'badge badge-red',
}

export default function PagosPage() {
  const sesion    = getSesion()
  const canWrite  = tienePermiso(sesion?.rol,'write')
  const canVerify = tienePermiso(sesion?.rol,'verify')
  const canDelete = tienePermiso(sesion?.rol,'delete')

  const [pagos,setPagos]     = useState([])
  const [clientes,setClientes] = useState([])
  const [cuentas,setCuentas] = useState([])
  const [planes,setPlanes]   = useState([])
  const [loading,setLoading] = useState(true)
  const [modal,setModal]     = useState(null)
  const [form,setForm]       = useState(VACÍO)
  const [lineas,setLineas]   = useState([PAGO_LINEA_VACIA()])
  const [pagoActivo,setPagoActivo] = useState(null)
  const [saving,setSaving]   = useState(false)
  const [error,setError]     = useState('')
  const [busqueda,setBusqueda] = useState('')
  const [filtroEstado,setFiltroEstado] = useState('')
  const [filtroMes,setFiltroMes] = useState('')
  const [comentario,setComentario] = useState('')
  const fileRefs = useRef([])

  const cargar = useCallback(async()=>{
    setLoading(true)
    try {
      const [pgs,cls,ctas,pls,tasa] = await Promise.all([
        api.get('/api/pagos?per=500'),
        api.get('/api/clientes'),
        api.get('/api/cuentas'),
        api.get('/api/planes'),
        api.get('/api/tasa-bcv'),
      ])
      setPagos(pgs.data||[])
      setClientes(cls.data||[])
      setCuentas(ctas.data||[])
      setPlanes(pls.data||[])
      if(tasa.data?.tasa_usd_bs) {
        setForm(p=>({...p, tasa_bcv_facturacion:String(tasa.data.tasa_usd_bs)}))
        setLineas(prev => prev.map(l => ({ ...l, tasa_bcv_pago: String(tasa.data.tasa_usd_bs) })))
      }
    } catch(e){console.error(e)} finally{setLoading(false)}
  },[])

  useEffect(()=>{cargar()},[cargar])

  function abrirNuevo() {
    setForm(VACÍO); setLineas([PAGO_LINEA_VACIA()]); setError(''); setModal('nuevo')
  }

  function onClienteChange(id) {
    const c = clientes.find(c=>String(c.id)===String(id))
    if(!c){setForm(p=>({...p,cliente_id:id}));return}
    const plan = planes.find(pl=>pl.id===c.plan_id)
    setForm(p=>({...p,cliente_id:id,
      cedula_cliente:c.documento_identidad||'',
      nombre_cliente:c.nombre_razon_social||'',
      tipo_cliente:c.tipo_cliente||'',
      nombre_plan:plan?.nombre_plan||'',
      monto_facturado_usd:plan?.precio_usd||'',
    }))
    // Actualizar monto_usd_real de la primera línea si solo hay 1
    if (lineas.length === 1 && !lineas[0].monto_usd_real) {
      setLineas([{ ...lineas[0], monto_usd_real: plan?.precio_usd || '' }])
    }
  }

  // ── Manejo de líneas de pago ────────────────────────
  function setLinea(idx, key, val) {
    setLineas(prev => prev.map((l, i) => i === idx ? { ...l, [key]: val } : l))
  }

  function agregarLinea() {
    setLineas(prev => [...prev, { ...PAGO_LINEA_VACIA(), tasa_bcv_pago: form.tasa_bcv_facturacion || '' }])
  }

  function quitarLinea(idx) {
    if (lineas.length <= 1) return
    setLineas(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Verificar referencia en tiempo real ─────────────
  async function verificarRef(idx) {
    const ref = lineas[idx].referencia?.trim()
    if (!ref) { setLinea(idx, 'refStatus', null); return }

    setLinea(idx, 'refStatus', 'checking')
    try {
      const res = await api.get(`/api/pagos/verificar-ref?ref=${encodeURIComponent(ref)}`)
      if (res.disponible) {
        setLinea(idx, 'refStatus', 'ok')
        setLinea(idx, 'refMsg', '')
      } else {
        setLinea(idx, 'refStatus', 'duplicada')
        setLinea(idx, 'refMsg', res.msg || 'Referencia duplicada')
      }
    } catch {
      setLinea(idx, 'refStatus', null)
    }
  }

  // ── Upload comprobante por línea ────────────────────
  function onFileChange(idx, file) {
    if(!file) return
    setLinea(idx, 'archivo', file)
    setLinea(idx, 'driveUrl', '')
    if(file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setLinea(idx, 'preview', e.target.result)
      reader.readAsDataURL(file)
    } else { setLinea(idx, 'preview', null) }
  }

  async function subirComprobante(idx) {
    const linea = lineas[idx]
    if(!linea.archivo) return
    setLinea(idx, 'uploading', true)
    try {
      const fd = new FormData()
      fd.append('file', linea.archivo)
      const clienteNombre = clientes.find(c=>String(c.id)===String(form.cliente_id))?.nombre_razon_social || 'comprobante'
      fd.append('nombre', `${clienteNombre}_${form.mes_cobro}_pago${idx+1}`.replace(/\s+/g,'_'))
      fd.append('mes', form.mes_cobro)
      fd.append('cliente', clienteNombre)

      const res = await fetch('/api/upload', {
        method:'POST',
        credentials: 'same-origin',
        body: fd,
      })
      const data = await res.json()
      if(!data.ok) throw new Error(data.msg)
      setLinea(idx, 'driveUrl', data.viewUrl)
      await alertaExito('Comprobante subido','Archivo guardado correctamente')
    } catch(e) {
      await alertaError('Error al subir', e.message)
    } finally { setLinea(idx, 'uploading', false) }
  }

  // ── Guardar pagos (uno por línea) ──────────────────
  async function guardar() {
    setError(''); setSaving(true)
    try {
      // Validar que no haya referencias duplicadas
      const conRefDuplicada = lineas.find(l => l.refStatus === 'duplicada')
      if (conRefDuplicada) {
        setError('Hay referencias duplicadas. Corrígelas antes de guardar.')
        setSaving(false)
        return
      }

      let pagosCreados = 0
      for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i]
        const esSinTasa = SIN_TASA.includes(linea.tipo_pago)

        const payload = {
          cliente_id: form.cliente_id,
          cedula_cliente: form.cedula_cliente || '',
          nombre_cliente: form.nombre_cliente || '',
          tipo_cliente: form.tipo_cliente || '',
          nombre_plan: form.nombre_plan || '',
          mes_cobro: form.mes_cobro,
          monto_facturado_usd: Number(form.monto_facturado_usd || 0),
          tasa_bcv_facturacion: esSinTasa ? 1 : Number(form.tasa_bcv_facturacion || 0),
          fecha_pago: form.fecha_pago,
          tasa_bcv_pago: esSinTasa ? 1 : Number(linea.tasa_bcv_pago || 0),
          monto_pagado_bs: esSinTasa ? 0 : (Number(linea.monto_usd_real || 0) * Number(linea.tasa_bcv_pago || 0)).toFixed(2),
          cuenta_id: form.cuenta_id || null,
          referencia: linea.referencia || '',
          tipo_pago: linea.tipo_pago || 'Transferencia',
          nota_pago: linea.nota_pago || '',
          capture_url: linea.driveUrl || '',
          correo_del_titular: linea.correo_del_titular || '',
          nombre_del_titular: linea.nombre_del_titular || '',
          monto_usd_real: Number(linea.monto_usd_real || 0),
        }

        await api.post('/api/pagos', payload)
        pagosCreados++
      }

      setModal(null)
      await cargar()
      await alertaExito(
        pagosCreados > 1 ? `${pagosCreados} pagos registrados` : 'Pago registrado',
        'Guardado exitosamente'
      )
    } catch(e) { setError(e.message) } finally { setSaving(false) }
  }

  async function cambiarEstado(id, nuevoEstado) {
    try {
      await api.patch('/api/pagos', {id, estado_verificacion:nuevoEstado, comentario_pago:comentario})
      setModal(null); await cargar()
      await alertaExito(`Pago ${nuevoEstado.toLowerCase()}`)
    } catch(e) { await alertaError('Error', e.message) }
  }

  async function eliminar(id) {
    const ok = await alertaConfirmar('¿Eliminar pago?','Esta acción no se puede deshacer.','Sí, eliminar')
    if(!ok) return
    try { await api.delete(`/api/pagos?id=${id}`); await cargar() }
    catch(e) { await alertaError('Error', e.message) }
  }

  const cuentasActivas = cuentas.filter(c=>c.activa)

  const filtrados = pagos.filter(p=>{
    const q = busqueda.toLowerCase()
    const ok = !q||p.nombre_cliente?.toLowerCase().includes(q)||p.cedula_cliente?.includes(q)||p.referencia?.includes(q)
    const est = !filtroEstado||p.estado_verificacion===filtroEstado
    const mes = !filtroMes||p.mes_cobro===filtroMes
    return ok&&est&&mes
  })

  const totalUSD = filtrados.filter(p=>p.estado_verificacion!=='Rechazado').reduce((s,p)=>s+Number(p.monto_usd_real||p.monto_facturado_usd||0),0)
  const pendientes = filtrados.filter(p=>p.estado_verificacion==='Pendiente').length
  const totalLineasUSD = lineas.reduce((s,l) => s + Number(l.monto_usd_real || 0), 0)

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:22,flexWrap:'wrap'}}>
        <input className="input" style={{maxWidth:260}} placeholder="Buscar cliente, cédula, referencia…"
          value={busqueda} onChange={e=>setBusqueda(e.target.value)}/>
        <select className="select" style={{maxWidth:160}} value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {ESTADOS.map(e=><option key={e}>{e}</option>)}
        </select>
        <select className="select" style={{maxWidth:140}} value={filtroMes} onChange={e=>setFiltroMes(e.target.value)}>
          <option value="">Todos los meses</option>
          {MESES.map(m=><option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
        <div style={{flex:1}}/>
        <div style={{fontFamily:'IBM Plex Mono,monospace',fontSize:12,color:'var(--on-surface-variant)'}}>
          {filtrados.length} pagos · <span style={{color:'var(--tertiary)',fontWeight:600}}>${formatUSD(totalUSD)} USD</span>
          {pendientes>0&&<> · <span style={{color:'var(--error)'}}>{pendientes} pendiente(s)</span></>}
        </div>
        {canWrite&&<button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo pago</button>}
      </div>

      {/* Tabla */}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {loading ? (
          <div className="empty">
            <div style={{width:24,height:24,border:'2px solid var(--outline)',borderTop:'2px solid var(--tertiary)',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto'}}/> 
          </div>
        ) : filtrados.length===0 ? (
          <div className="empty">Sin pagos para mostrar</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Mes</th><th>Tipo</th><th>Monto USD</th>
                  <th>Bs</th><th>Tasa</th><th>Ref</th><th>Estado</th><th>📎</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p=>(
                  <tr key={p.id}>
                    <td>
                      <div style={{fontWeight:500,fontSize:13}}>{p.nombre_cliente||'—'}</div>
                      <div style={{fontSize:11,color:'var(--on-surface-variant)',fontFamily:'IBM Plex Mono,monospace'}}>{p.cedula_cliente}</div>
                    </td>
                    <td className="mono">{mesLabel(p.mes_cobro)}</td>
                    <td style={{fontSize:12}}>{p.tipo_pago}</td>
                    <td className="mono" style={{color:'var(--tertiary)',fontWeight:600}}>${formatUSD(p.monto_usd_real||p.monto_facturado_usd)}</td>
                    <td className="mono" style={{color:'#334155',fontSize:12}}>{p.monto_pagado_bs>0?`Bs.${formatUSD(p.monto_pagado_bs)}`:'—'}</td>
                    <td className="mono" style={{fontSize:11,color:'var(--on-surface-variant)'}}>{p.tasa_bcv_pago>1?p.tasa_bcv_pago:'—'}</td>
                    <td className="mono" style={{fontSize:11}}>{p.referencia||'—'}</td>
                    <td><span className={BADGE[p.estado_verificacion]||'badge badge-gray'}>{p.estado_verificacion}</span></td>
                    <td>
                      {p.capture_url ? (
                        <a href={p.capture_url} target="_blank" rel="noopener noreferrer"
                          style={{fontSize:12,color:'var(--tertiary)',textDecoration:'none',fontWeight:600}}>
                          Ver
                        </a>
                      ) : <span style={{fontSize:11,color:'var(--on-surface-variant)'}}>—</span>}
                    </td>
                    <td>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {canVerify&&p.estado_verificacion==='Pendiente'&&(
                          <button className="btn btn-ghost btn-sm" onClick={()=>{setPagoActivo(p);setComentario('');setModal('verificar')}}>
                            Verificar
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={()=>{setPagoActivo(p);setModal('ver')}}>
                          Ver
                        </button>
                        {canDelete&&(
                          <button className="btn btn-danger btn-sm" onClick={()=>eliminar(p.id)}>✕</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Modal Nuevo Pago — con soporte de líneas parciales */}
      {modal==='nuevo'&&(
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{maxWidth:720}}>
            <div className="modal-header">
              <div className="modal-title">Registrar pago</div>
              <button className="modal-close" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {error&&<div className="error-msg">⚠ {error}</div>}

              {/* Datos generales del pago */}
              <div style={{fontSize:11,fontWeight:600,color:'var(--on-surface-variant)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:10}}>Datos generales</div>
              <div className="form-row cols-2" style={{marginBottom:14}}>
                <div className="field-group" style={{gridColumn:'1/-1'}}>
                  <label className="field-label">Cliente *</label>
                  <select className="select" value={form.cliente_id} onChange={e=>onClienteChange(e.target.value)} required>
                    <option value="">Seleccionar cliente…</option>
                    {clientes.sort((a,b) => a.nombre_razon_social?.localeCompare(b.nombre_razon_social)).map(c=>(
                      <option key={c.id} value={c.id}>{c.nombre_razon_social} — {c.documento_identidad} ({c.estado_servicio})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row cols-3" style={{marginBottom:14}}>
                <div className="field-group">
                  <label className="field-label">Mes de cobro *</label>
                  <select className="select" value={form.mes_cobro} onChange={e=>setForm(p=>({...p,mes_cobro:e.target.value}))}>
                    {MESES.map(m=><option key={m} value={m}>{mesLabel(m)}</option>)}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Fecha de pago *</label>
                  <input className="input" type="date" value={form.fecha_pago} onChange={e=>setForm(p=>({...p,fecha_pago:e.target.value}))} required/>
                </div>
                <div className="field-group">
                  <label className="field-label">Monto plan USD</label>
                  <input className="input" type="number" step="0.01" placeholder="0.00"
                    value={form.monto_facturado_usd} onChange={e=>setForm(p=>({...p,monto_facturado_usd:e.target.value}))}/>
                </div>
              </div>

              <div className="form-row cols-2" style={{marginBottom:14}}>
                <div className="field-group">
                  <label className="field-label">Tasa BCV facturación</label>
                  <input className="input" type="number" step="0.01" placeholder="0.00"
                    value={form.tasa_bcv_facturacion} onChange={e=>setForm(p=>({...p,tasa_bcv_facturacion:e.target.value}))}/>
                </div>
                <div className="field-group">
                  <label className="field-label">Cuenta receptora</label>
                  <select className="select" value={form.cuenta_id||''} onChange={e=>setForm(p=>({...p,cuenta_id:e.target.value}))}>
                    <option value="">Sin cuenta específica</option>
                    {cuentasActivas.map(c=><option key={c.id} value={c.id}>{c.banco} — {c.titular}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Líneas de pago ──────────────────────────── */}
              <div style={{
                fontSize:11,fontWeight:600,color:'var(--on-surface-variant)',textTransform:'uppercase',letterSpacing:'.8px',
                marginBottom:10, display:'flex', justifyContent:'space-between', alignItems:'center',
              }}>
                <span>Comprobantes de pago ({lineas.length})</span>
                {form.monto_facturado_usd && totalLineasUSD > 0 && (
                  <span style={{
                    fontFamily:'IBM Plex Mono,monospace', fontSize:12,
                    color: totalLineasUSD >= Number(form.monto_facturado_usd) ? 'var(--tertiary)' : 'var(--error)',
                    fontWeight:700,
                  }}>
                    ${formatUSD(totalLineasUSD)} / ${formatUSD(form.monto_facturado_usd)} USD
                  </span>
                )}
              </div>

              {lineas.map((linea, idx) => {
                const esSinTasa = SIN_TASA.includes(linea.tipo_pago)
                const esTitular = REQUIERE_TITULAR.includes(linea.tipo_pago)
                return (
                  <div key={idx} style={{
                    background: idx % 2 === 0 ? '#f8fafc' : '#fff',
                    border:'1px solid #e2e8f0', borderRadius:12,
                    padding:16, marginBottom:10, position:'relative',
                  }}>
                    {lineas.length > 1 && (
                      <div style={{
                        position:'absolute', top:8, right:8, display:'flex', alignItems:'center', gap:8,
                      }}>
                        <span style={{fontSize:11,fontWeight:700,color:'var(--on-surface-variant)'}}>Pago {idx+1}</span>
                        <button onClick={()=>quitarLinea(idx)}
                          style={{background:'none',border:'none',cursor:'pointer',color:'var(--error)',fontSize:14,fontWeight:700}}>✕</button>
                      </div>
                    )}

                    <div className="form-row cols-3" style={{marginBottom:10}}>
                      <div className="field-group">
                        <label className="field-label">Tipo de pago</label>
                        <select className="select" value={linea.tipo_pago} onChange={e=>setLinea(idx,'tipo_pago',e.target.value)}>
                          {TIPOS_PAGO.map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="field-group">
                        <label className="field-label">Monto USD pagado *</label>
                        <input className="input" type="number" step="0.01" placeholder="0.00"
                          value={linea.monto_usd_real} onChange={e=>setLinea(idx,'monto_usd_real',e.target.value)}/>
                      </div>
                      <div className="field-group">
                        <label className="field-label">Referencia / N°</label>
                        <div style={{position:'relative'}}>
                          <input className="input" placeholder="123456789"
                            value={linea.referencia}
                            onChange={e=>{ setLinea(idx,'referencia',e.target.value); setLinea(idx,'refStatus',null) }}
                            onBlur={()=>verificarRef(idx)}
                            style={{
                              paddingRight:32,
                              borderColor: linea.refStatus === 'duplicada' ? 'var(--error)' : linea.refStatus === 'ok' ? 'var(--tertiary)' : undefined,
                            }}/>
                          {/* Indicador de referencia */}
                          <div style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',fontSize:14}}>
                            {linea.refStatus === 'checking' && <span style={{color:'var(--on-surface-variant)'}}>⏳</span>}
                            {linea.refStatus === 'ok' && <span style={{color:'var(--tertiary)'}}>✓</span>}
                            {linea.refStatus === 'duplicada' && <span style={{color:'var(--error)'}}>⚠</span>}
                          </div>
                        </div>
                        {linea.refStatus === 'duplicada' && (
                          <div style={{fontSize:11,color:'#dc2626',marginTop:4,fontWeight:500}}>
                            ⚠ {linea.refMsg}
                          </div>
                        )}
                      </div>
                    </div>

                    {!esSinTasa && (
                      <div className="form-row cols-2" style={{marginBottom:10}}>
                        <div className="field-group">
                          <label className="field-label">Tasa BCV pago</label>
                          <input className="input" type="number" step="0.01" placeholder="0.00"
                            value={linea.tasa_bcv_pago} onChange={e=>setLinea(idx,'tasa_bcv_pago',e.target.value)}/>
                        </div>
                        <div className="field-group">
                          <label className="field-label">Monto en Bs (auto)</label>
                          <input className="input" type="number" readOnly
                            value={linea.monto_usd_real&&linea.tasa_bcv_pago?(Number(linea.monto_usd_real)*Number(linea.tasa_bcv_pago)).toFixed(2):''}
                            style={{background:'#f1f5f9',color:'#64748b'}} placeholder="Auto"/>
                        </div>
                      </div>
                    )}

                    {esTitular && (
                      <div className="form-row cols-2" style={{marginBottom:10}}>
                        <div className="field-group">
                          <label className="field-label">Nombre del titular</label>
                          <input className="input" placeholder="Nombre completo"
                            value={linea.nombre_del_titular} onChange={e=>setLinea(idx,'nombre_del_titular',e.target.value)}/>
                        </div>
                        <div className="field-group">
                          <label className="field-label">Correo / usuario titular</label>
                          <input className="input" placeholder="correo@ejemplo.com"
                            value={linea.correo_del_titular} onChange={e=>setLinea(idx,'correo_del_titular',e.target.value)}/>
                        </div>
                      </div>
                    )}

                    <div className="field-group" style={{marginBottom:10}}>
                      <label className="field-label">Nota del pago</label>
                      <input className="input" placeholder="Observaciones opcionales…"
                        value={linea.nota_pago} onChange={e=>setLinea(idx,'nota_pago',e.target.value)}/>
                    </div>

                    {/* Upload comprobante */}
                    <div className="field-group">
                      <label className="field-label">Comprobante (foto)</label>
                      <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <input
                          ref={el => { if (el) fileRefs.current[idx] = el }}
                          type="file" accept="image/*,.pdf" style={{display:'none'}}
                          onChange={e=>onFileChange(idx, e.target.files[0])}/>
                        <button className="btn btn-ghost btn-sm" onClick={()=>fileRefs.current[idx]?.click()} style={{flexShrink:0}}>
                          📎 {linea.archivo ? 'Cambiar' : 'Seleccionar'}
                        </button>
                        {linea.archivo && !linea.driveUrl && (
                          <button className="btn btn-ghost btn-sm" onClick={()=>subirComprobante(idx)} disabled={linea.uploading} style={{flexShrink:0}}>
                            {linea.uploading?'Subiendo…':'☁ Subir'}
                          </button>
                        )}
                        {linea.archivo && (
                          <span style={{fontSize:11,color:'#64748b',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{linea.archivo.name}</span>
                        )}
                        {linea.driveUrl && (
                          <a href={linea.driveUrl} target="_blank" rel="noopener noreferrer"
                            style={{fontSize:11,color:'#16a34a',fontWeight:600,textDecoration:'none',flexShrink:0}}>
                            ✓ Subido
                          </a>
                        )}
                      </div>
                      {linea.preview && (
                        <img src={linea.preview} alt="preview" style={{maxHeight:80,maxWidth:'100%',borderRadius:8,marginTop:8,border:'1px solid #e2e8f0'}}/>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Botón agregar línea */}
              <button className="btn btn-ghost" onClick={agregarLinea}
                style={{width:'100%',justifyContent:'center',border:'2px dashed #e2e8f0',borderRadius:10,padding:12,marginTop:4}}>
                + Agregar otro comprobante / pago parcial
              </button>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar}
                disabled={saving||!form.cliente_id||!form.mes_cobro||lineas.some(l=>l.refStatus==='duplicada')}>
                {saving?'Guardando…':`Registrar ${lineas.length > 1 ? `${lineas.length} pagos` : 'pago'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver detalle */}
      {modal==='ver'&&pagoActivo&&(
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Detalle del pago</div>
              <button className="modal-close" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 20px'}}>
                {[
                  ['Cliente',    pagoActivo.nombre_cliente],
                  ['Cédula',     pagoActivo.cedula_cliente],
                  ['Mes',        mesLabel(pagoActivo.mes_cobro)],
                  ['Fecha pago', pagoActivo.fecha_pago],
                  ['Tipo',       pagoActivo.tipo_pago],
                  ['Referencia', pagoActivo.referencia||'—'],
                  ['Monto USD',  `$${formatUSD(pagoActivo.monto_usd_real||pagoActivo.monto_facturado_usd)}`],
                  ['Monto Bs',   pagoActivo.monto_pagado_bs>0?`Bs. ${formatUSD(pagoActivo.monto_pagado_bs)}`:'—'],
                  ['Tasa BCV',   pagoActivo.tasa_bcv_pago>1?pagoActivo.tasa_bcv_pago:'—'],
                  ['Plan',       pagoActivo.nombre_plan||'—'],
                  ['Estado',     pagoActivo.estado_verificacion],
                  ['Registrado', pagoActivo.usuario_registro||'—'],
                  ['Verificado por', pagoActivo.verificado_por||'—'],
                  ['N° Factura', pagoActivo.numero_factura||'—'],
                ].map(([k,v])=>(
                  <div key={k} style={{borderBottom:'1px solid #f1f5f9',paddingBottom:8}}>
                    <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'.7px',marginBottom:3}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:500}}>{v}</div>
                  </div>
                ))}
              </div>
              {pagoActivo.nota_pago&&(
                <div style={{marginTop:14,padding:12,background:'#f8fafc',borderRadius:8}}>
                  <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'.7px',marginBottom:4}}>Nota</div>
                  <div style={{fontSize:13}}>{pagoActivo.nota_pago}</div>
                </div>
              )}
              {pagoActivo.capture_url&&(
                <div style={{marginTop:14}}>
                  <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'.7px',marginBottom:8}}>Comprobante</div>
                  <a href={pagoActivo.capture_url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost" style={{width:'100%',justifyContent:'center'}}>
                    Ver comprobante →
                  </a>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {canVerify&&pagoActivo.estado_verificacion==='Pendiente'&&(
                <button className="btn btn-primary" onClick={()=>setModal('verificar')}>Verificar pago</button>
              )}
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Verificar */}
      {modal==='verificar'&&pagoActivo&&(
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{maxWidth:440}}>
            <div className="modal-header">
              <div className="modal-title">Verificar pago</div>
              <button className="modal-close" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{padding:14,background:'#f8fafc',borderRadius:10,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600}}>{pagoActivo.nombre_cliente}</div>
                <div style={{fontSize:12,color:'#94a3b8',marginTop:2}}>
                  {mesLabel(pagoActivo.mes_cobro)} · ${formatUSD(pagoActivo.monto_usd_real||pagoActivo.monto_facturado_usd)} · {pagoActivo.tipo_pago}
                </div>
                {pagoActivo.referencia&&<div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'#334155',marginTop:4}}>Ref: {pagoActivo.referencia}</div>}
              </div>
              {pagoActivo.capture_url&&(
                <div style={{marginBottom:14}}>
                  <a href={pagoActivo.capture_url} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:13,color:'#16a34a',textDecoration:'none',fontWeight:500}}>
                    Ver comprobante →
                  </a>
                </div>
              )}
              <div className="field-group">
                <label className="field-label">Comentario (opcional)</label>
                <input className="input" placeholder="Observaciones de verificación…"
                  value={comentario} onChange={e=>setComentario(e.target.value)}/>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={()=>cambiarEstado(pagoActivo.id,'Rechazado')}>Rechazar</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>cambiarEstado(pagoActivo.id,'Verificado')}>Verificado</button>
              <button className="btn btn-primary btn-sm" onClick={()=>cambiarEstado(pagoActivo.id,'Confirmado')}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}