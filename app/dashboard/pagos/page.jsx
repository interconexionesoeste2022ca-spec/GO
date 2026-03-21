'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { api, getSesion, tienePermiso, mesLabel, formatUSD, alertaConfirmar, alertaExito, alertaError } from '@/lib/api'

const TIPOS_PAGO = ['Transferencia','Pago Móvil','Efectivo Bs','Efectivo Divisas','Zelle','Binance','Bancaribe','Bancamiga Fiscal','Bancamiga Gs']
const ESTADOS    = ['Pendiente','Verificado','Confirmado','Rechazado']
const MESES      = Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-i);return d.toISOString().slice(0,7)})
const REQUIERE_TITULAR = ['Zelle','Binance']
const SIN_TASA         = ['Efectivo Divisas','Zelle','Binance']

const VACÍO = {
  cliente_id:'', mes_cobro:new Date().toISOString().slice(0,7),
  monto_facturado_usd:'', tasa_bcv_facturacion:'', fecha_pago:new Date().toISOString().split('T')[0],
  tasa_bcv_pago:'', monto_pagado_bs:'', cuenta_id:'', referencia:'',
  tipo_pago:'Transferencia', nota_pago:'', capture_url:'',
  correo_del_titular:'', nombre_del_titular:'', monto_usd_real:'',
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
  const [modal,setModal]     = useState(null)  // null | 'nuevo' | 'ver' | 'verificar'
  const [form,setForm]       = useState(VACÍO)
  const [pagoActivo,setPagoActivo] = useState(null)
  const [saving,setSaving]   = useState(false)
  const [error,setError]     = useState('')
  const [busqueda,setBusqueda] = useState('')
  const [filtroEstado,setFiltroEstado] = useState('')
  const [filtroMes,setFiltroMes] = useState('')
  const [comentario,setComentario] = useState('')
  // Upload
  const [archivo,setArchivo]   = useState(null)
  const [preview,setPreview]   = useState(null)
  const [uploading,setUploading] = useState(false)
  const [driveUrl,setDriveUrl] = useState('')
  const [drag,setDrag]         = useState(false)
  const fileRef = useRef()

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
      // Pre-cargar tasa BCV en el form
      if(tasa.data?.tasa_usd_bs) {
        setForm(p=>({...p, tasa_bcv_facturacion:String(tasa.data.tasa_usd_bs), tasa_bcv_pago:String(tasa.data.tasa_usd_bs)}))
      }
    } catch(e){console.error(e)} finally{setLoading(false)}
  },[])

  useEffect(()=>{cargar()},[cargar])

  function abrirNuevo() {
    setForm(VACÍO); setError(''); setArchivo(null); setPreview(null); setDriveUrl(''); setModal('nuevo')
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
      monto_usd_real:plan?.precio_usd||'',
    }))
  }

  // ── Upload comprobante ─────────────────────────────
  function onFileChange(file) {
    if(!file) return
    setArchivo(file)
    setDriveUrl('')
    if(file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = e => setPreview(e.target.result)
      reader.readAsDataURL(file)
    } else { setPreview(null) }
  }

  async function subirComprobante() {
    if(!archivo) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', archivo)
      const clienteNombre = clientes.find(c=>String(c.id)===String(form.cliente_id))?.nombre_razon_social || 'comprobante'
      fd.append('nombre', `${clienteNombre}_${form.mes_cobro}`.replace(/\s+/g,'_'))

      const token = typeof window!=='undefined' ? localStorage.getItem('galanet_token') : null
      const res = await fetch('/api/upload', {
        method:'POST',
        headers: token ? {Authorization:`Bearer ${token}`} : {},
        body: fd,
      })
      const data = await res.json()
      if(!data.ok) throw new Error(data.msg)
      setDriveUrl(data.viewUrl)
      setForm(p=>({...p, capture_url: data.viewUrl}))
      await alertaExito('Comprobante subido','Archivo guardado en Google Drive')
    } catch(e) {
      await alertaError('Error al subir', e.message)
    } finally { setUploading(false) }
  }

  // ── Guardar pago ───────────────────────────────────
  async function guardar() {
    setError(''); setSaving(true)
    try {
      const payload = {...form}
      if(SIN_TASA.includes(payload.tipo_pago)) {
        payload.tasa_bcv_pago='1'; payload.tasa_bcv_facturacion='1'
      }
      // Calcular monto_pagado_bs
      if(!SIN_TASA.includes(payload.tipo_pago) && payload.monto_usd_real && payload.tasa_bcv_pago) {
        payload.monto_pagado_bs = (Number(payload.monto_usd_real) * Number(payload.tasa_bcv_pago)).toFixed(2)
      }
      await api.post('/api/pagos', payload)
      setModal(null)
      await cargar()
      await alertaExito('Pago registrado','El pago fue guardado exitosamente')
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

  const esSinTasa   = SIN_TASA.includes(form.tipo_pago)
  const esTitular   = REQUIERE_TITULAR.includes(form.tipo_pago)
  const cuentasActivas = cuentas.filter(c=>c.activa)

  const filtrados = pagos.filter(p=>{
    const q = busqueda.toLowerCase()
    const ok = !q||p.nombre_cliente?.toLowerCase().includes(q)||p.cedula_cliente?.includes(q)||p.referencia?.includes(q)
    const est = !filtroEstado||p.estado_verificacion===filtroEstado
    const mes = !filtroMes||p.mes_cobro===filtroMes
    return ok&&est&&mes
  })

  // Totales
  const totalUSD = filtrados.filter(p=>p.estado_verificacion!=='Rechazado').reduce((s,p)=>s+Number(p.monto_usd_real||p.monto_facturado_usd||0),0)
  const pendientes = filtrados.filter(p=>p.estado_verificacion==='Pendiente').length

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
        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--txt3)'}}>
          {filtrados.length} pagos · <span style={{color:'var(--green)',fontWeight:600}}>${formatUSD(totalUSD)} USD</span>
          {pendientes>0&&<> · <span style={{color:'#d97706'}}>{pendientes} pendiente(s)</span></>}
        </div>
        {canWrite&&<button className="btn btn-primary" onClick={abrirNuevo}>+ Nuevo pago</button>}
      </div>

      {/* Tabla */}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        {loading ? (
          <div className="empty">
            <div style={{width:24,height:24,border:'2px solid var(--border)',borderTop:'2px solid var(--green)',borderRadius:'50%',animation:'spin .7s linear infinite',margin:'0 auto'}}/>
          </div>
        ) : filtrados.length===0 ? (
          <div className="empty">Sin pagos para mostrar</div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th><th>Mes</th><th>Tipo</th><th>Monto USD</th>
                  <th>Bs</th><th>Tasa</th><th>Estado</th><th>Comprobante</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(p=>(
                  <tr key={p.id}>
                    <td>
                      <div style={{fontWeight:500,fontSize:13}}>{p.nombre_cliente||'—'}</div>
                      <div style={{fontSize:11,color:'var(--txt3)',fontFamily:'JetBrains Mono,monospace'}}>{p.cedula_cliente}</div>
                    </td>
                    <td className="mono">{mesLabel(p.mes_cobro)}</td>
                    <td style={{fontSize:12}}>{p.tipo_pago}</td>
                    <td className="mono" style={{color:'var(--green)',fontWeight:600}}>${formatUSD(p.monto_usd_real||p.monto_facturado_usd)}</td>
                    <td className="mono" style={{color:'var(--txt2)',fontSize:12}}>{p.monto_pagado_bs>0?`Bs.${formatUSD(p.monto_pagado_bs)}`:'—'}</td>
                    <td className="mono" style={{fontSize:11,color:'var(--txt3)'}}>{p.tasa_bcv_pago>1?p.tasa_bcv_pago:'—'}</td>
                    <td><span className={BADGE[p.estado_verificacion]||'badge badge-gray'}>{p.estado_verificacion}</span></td>
                    <td>
                      {p.capture_url ? (
                        <a href={p.capture_url} target="_blank" rel="noopener noreferrer"
                          style={{fontSize:12,color:'var(--green2)',textDecoration:'none',fontWeight:600,display:'flex',alignItems:'center',gap:4}}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          Ver
                        </a>
                      ) : <span style={{fontSize:11,color:'var(--txt3)'}}>—</span>}
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

      {/* Modal Nuevo Pago */}
      {modal==='nuevo'&&(
        <div className="modal-backdrop" onClick={e=>e.target===e.currentTarget&&setModal(null)}>
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header">
              <div className="modal-title">Registrar pago</div>
              <button className="modal-close" onClick={()=>setModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {error&&<div className="error-msg">{error}</div>}

              <div className="form-row cols-2" style={{marginBottom:14}}>
                <div className="field-group" style={{gridColumn:'1/-1'}}>
                  <label className="field-label">Cliente *</label>
                  <select className="select" value={form.cliente_id} onChange={e=>onClienteChange(e.target.value)} required>
                    <option value="">Seleccionar cliente…</option>
                    {clientes.filter(c=>c.estado_servicio==='Activo').map(c=>(
                      <option key={c.id} value={c.id}>{c.nombre_razon_social} — {c.documento_identidad}</option>
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
                  <label className="field-label">Tipo de pago</label>
                  <select className="select" value={form.tipo_pago} onChange={e=>setForm(p=>({...p,tipo_pago:e.target.value}))}>
                    {TIPOS_PAGO.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row cols-2" style={{marginBottom:14}}>
                <div className="field-group">
                  <label className="field-label">Monto facturado USD *</label>
                  <input className="input" type="number" step="0.01" placeholder="0.00"
                    value={form.monto_facturado_usd} onChange={e=>setForm(p=>({...p,monto_facturado_usd:e.target.value,monto_usd_real:e.target.value}))}/>
                </div>
                <div className="field-group">
                  <label className="field-label">Monto USD real pagado</label>
                  <input className="input" type="number" step="0.01" placeholder="0.00"
                    value={form.monto_usd_real} onChange={e=>setForm(p=>({...p,monto_usd_real:e.target.value}))}/>
                </div>
              </div>

              {!esSinTasa&&(
                <div className="form-row cols-3" style={{marginBottom:14}}>
                  <div className="field-group">
                    <label className="field-label">Tasa BCV facturación</label>
                    <input className="input" type="number" step="0.01" placeholder="0.00"
                      value={form.tasa_bcv_facturacion} onChange={e=>setForm(p=>({...p,tasa_bcv_facturacion:e.target.value}))}/>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Tasa BCV pago</label>
                    <input className="input" type="number" step="0.01" placeholder="0.00"
                      value={form.tasa_bcv_pago} onChange={e=>setForm(p=>({...p,tasa_bcv_pago:e.target.value}))}/>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Monto en Bs</label>
                    <input className="input" type="number" step="0.01" readOnly
                      value={form.monto_usd_real&&form.tasa_bcv_pago?(Number(form.monto_usd_real)*Number(form.tasa_bcv_pago)).toFixed(2):''}
                      style={{background:'var(--bg2)',color:'var(--txt2)'}} placeholder="Auto"/>
                  </div>
                </div>
              )}

              {!esTitular&&!esSinTasa&&(
                <div className="form-row cols-2" style={{marginBottom:14}}>
                  <div className="field-group">
                    <label className="field-label">Cuenta receptora</label>
                    <select className="select" value={form.cuenta_id} onChange={e=>setForm(p=>({...p,cuenta_id:e.target.value}))}>
                      <option value="">Sin cuenta específica</option>
                      {cuentasActivas.map(c=><option key={c.id} value={c.id}>{c.banco} — {c.titular}</option>)}
                    </select>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Referencia / N° comprobante</label>
                    <input className="input" placeholder="Ej: 123456789"
                      value={form.referencia} onChange={e=>setForm(p=>({...p,referencia:e.target.value}))}/>
                  </div>
                </div>
              )}

              {esTitular&&(
                <div className="form-row cols-2" style={{marginBottom:14}}>
                  <div className="field-group">
                    <label className="field-label">Nombre del titular</label>
                    <input className="input" placeholder="Nombre completo"
                      value={form.nombre_del_titular} onChange={e=>setForm(p=>({...p,nombre_del_titular:e.target.value}))}/>
                  </div>
                  <div className="field-group">
                    <label className="field-label">Correo / usuario titular</label>
                    <input className="input" placeholder="correo@ejemplo.com"
                      value={form.correo_del_titular} onChange={e=>setForm(p=>({...p,correo_del_titular:e.target.value}))}/>
                  </div>
                </div>
              )}

              <div className="field-group" style={{marginBottom:14}}>
                <label className="field-label">Nota del pago</label>
                <input className="input" placeholder="Observaciones opcionales…"
                  value={form.nota_pago} onChange={e=>setForm(p=>({...p,nota_pago:e.target.value}))}/>
              </div>

              {/* Upload comprobante */}
              <div className="field-group">
                <label className="field-label">Comprobante de pago (Google Drive)</label>
                <div
                  className={`upload-zone${drag?' drag':''}${archivo?' has-file':''}`}
                  onClick={()=>fileRef.current?.click()}
                  onDragOver={e=>{e.preventDefault();setDrag(true)}}
                  onDragLeave={()=>setDrag(false)}
                  onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)onFileChange(f)}}>
                  <input ref={fileRef} type="file" accept="image/*,.pdf" style={{display:'none'}}
                    onChange={e=>onFileChange(e.target.files[0])}/>
                  {preview ? (
                    <img src={preview} alt="preview" style={{maxHeight:120,maxWidth:'100%',borderRadius:8,marginBottom:8}}/>
                  ) : (
                    <div style={{fontSize:28,marginBottom:6,color:'var(--txt3)'}}>↑</div>
                  )}
                  {archivo ? (
                    <div style={{fontSize:13,color:'var(--green)',fontWeight:500}}>{archivo.name}</div>
                  ) : (
                    <div style={{fontSize:13,color:'var(--txt3)'}}>Arrastra o haz clic para seleccionar imagen/PDF</div>
                  )}
                  {driveUrl&&<div style={{fontSize:11,color:'var(--green2)',marginTop:6}}>✓ Subido a Google Drive</div>}
                </div>
                {archivo&&!driveUrl&&(
                  <button className="btn btn-ghost btn-sm" style={{marginTop:8,width:'100%'}}
                    onClick={subirComprobante} disabled={uploading}>
                    {uploading?'Subiendo…':'☁ Subir a Google Drive'}
                  </button>
                )}
                {driveUrl&&(
                  <a href={driveUrl} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:12,color:'var(--green2)',textDecoration:'none',display:'block',marginTop:6}}>
                    Ver en Google Drive →
                  </a>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={()=>setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={guardar} disabled={saving||!form.cliente_id||!form.mes_cobro}>
                {saving?'Guardando…':'Registrar pago'}
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
                  <div key={k} style={{borderBottom:'1px solid var(--border)',paddingBottom:8}}>
                    <div style={{fontSize:10,color:'var(--txt3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.7px',marginBottom:3}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:500}}>{v}</div>
                  </div>
                ))}
              </div>
              {pagoActivo.nota_pago&&(
                <div style={{marginTop:14,padding:12,background:'var(--bg2)',borderRadius:8}}>
                  <div style={{fontSize:10,color:'var(--txt3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.7px',marginBottom:4}}>Nota</div>
                  <div style={{fontSize:13}}>{pagoActivo.nota_pago}</div>
                </div>
              )}
              {pagoActivo.capture_url&&(
                <div style={{marginTop:14}}>
                  <div style={{fontSize:10,color:'var(--txt3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.7px',marginBottom:8}}>Comprobante</div>
                  <a href={pagoActivo.capture_url} target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost" style={{width:'100%',justifyContent:'center'}}>
                    Ver comprobante en Google Drive →
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
              <div style={{padding:14,background:'var(--bg2)',borderRadius:10,marginBottom:16}}>
                <div style={{fontSize:13,fontWeight:600}}>{pagoActivo.nombre_cliente}</div>
                <div style={{fontSize:12,color:'var(--txt3)',marginTop:2}}>
                  {mesLabel(pagoActivo.mes_cobro)} · ${formatUSD(pagoActivo.monto_usd_real||pagoActivo.monto_facturado_usd)} · {pagoActivo.tipo_pago}
                </div>
                {pagoActivo.referencia&&<div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--txt2)',marginTop:4}}>Ref: {pagoActivo.referencia}</div>}
              </div>
              {pagoActivo.capture_url&&(
                <div style={{marginBottom:14}}>
                  <a href={pagoActivo.capture_url} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:13,color:'var(--green2)',textDecoration:'none',fontWeight:500}}>
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