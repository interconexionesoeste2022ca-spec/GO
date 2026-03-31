'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, getSesion, mesLabel, formatUSD, alertaExito, alertaError } from '@/lib/api'

const MESES = Array.from({ length: 6 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - i)
  return d.toISOString().slice(0, 7)
})

const ESTADO_CFG = {
  pagado:                   { label: 'Pagado',          bg: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)', dot: 'var(--tertiary)' },
  pendiente_verificacion:   { label: 'Por verificar',   bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  por_vencer:               { label: 'Por vencer',      bg: '#fef9c3', color: '#854d0e', dot: '#eab308' },
  sin_pagar:                { label: 'Sin pagar',       bg: '#fee2e2', color: '#991b1b', dot: '#dc2626' },
}

export default function CobranzaPage() {
  const [mes, setMes]           = useState(new Date().toISOString().slice(0, 7))
  const [data, setData]         = useState([])
  const [resumen, setResumen]   = useState(null)
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [zona, setZona]         = useState('')
  const sesion = getSesion()

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/api/cobranza?mes=${mes}`)
      setData(res.data || [])
      setResumen(res.resumen)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [mes])

  useEffect(() => { cargar() }, [cargar])

  const zonas = [...new Set(data.map(c => c.zona_sector).filter(Boolean))]

  const filtrados = data.filter(c => {
    const q = busqueda.toLowerCase()
    const okQ = !q || c.nombre_razon_social?.toLowerCase().includes(q) || c.documento_identidad?.includes(q) || c.telefono?.includes(q)
    const okF = filtro === 'todos' || c.estado_cobro === filtro
    const okZ = !zona || c.zona_sector === zona
    return okQ && okF && okZ
  })

  const porcentaje = resumen ? Math.round((resumen.pagados / resumen.total) * 100) || 0 : 0

  return (
    <div>
      {/* Selector mes + filtros */}
      <div style={{ display:'flex', gap:10, marginBottom:22, flexWrap:'wrap', alignItems:'center' }}>
        <select className="select" style={{ maxWidth:160 }} value={mes} onChange={e => setMes(e.target.value)}>
          {MESES.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
        <select className="select" style={{ maxWidth:170 }} value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="sin_pagar">Sin pagar</option>
          <option value="por_vencer">Por vencer</option>
          <option value="pendiente_verificacion">Por verificar</option>
          <option value="pagado">Pagados</option>
        </select>
        {zonas.length > 0 && (
          <select className="select" style={{ maxWidth:150 }} value={zona} onChange={e => setZona(e.target.value)}>
            <option value="">Todas las zonas</option>
            {zonas.map(z => <option key={z}>{z}</option>)}
          </select>
        )}
        <input className="input" style={{ maxWidth:240 }} placeholder="Buscar cliente…"
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <div style={{ flex:1 }} />
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺ Actualizar</button>
      </div>

      {/* KPIs de cobranza */}
      {resumen && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:14, marginBottom:22 }}>
          {/* Barra de progreso */}
          <div className="card" style={{ gridColumn:'1 / -1', padding:'18px 22px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>Recaudación {mesLabel(mes)}</div>
                <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>
                  {resumen.pagados} de {resumen.total} clientes · ${formatUSD(resumen.monto_cobrado)} / ${formatUSD(resumen.monto_esperado)} USD
                </div>
              </div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:26, fontWeight:700,
                color: porcentaje >= 80 ? 'var(--tertiary)' : porcentaje >= 50 ? 'var(--error)' : 'var(--error)' }}>
                {porcentaje}%
              </div>
            </div>
            <div style={{ height:10, background:'#f1f5f9', borderRadius:20, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:20,
                width:`${porcentaje}%`,
                background: porcentaje >= 80 ? 'var(--tertiary)' : porcentaje >= 50 ? 'var(--error)' : 'var(--error)',
                transition:'width .6s ease',
              }} />
            </div>
          </div>

          {[
            { label:'Sin pagar',    key:'sin_pagar',              cfg: ESTADO_CFG.sin_pagar },
            { label:'Por vencer',   key:'por_vencer',             cfg: ESTADO_CFG.por_vencer },
            { label:'Por verificar',key:'pendiente_verificacion', cfg: ESTADO_CFG.pendiente_verificacion },
            { label:'Pagados',      key:'pagados',                cfg: ESTADO_CFG.pagado },
          ].map(({ label, key, cfg }) => (
            <div key={key} className="kpi-card" style={{ cursor:'pointer', borderLeft:`3px solid ${cfg.dot}` }}
              onClick={() => setFiltro(filtro === key ? 'todos' : key)}>
              <div className="kpi-label">{label}</div>
              <div className="kpi-val" style={{ color: cfg.dot, fontSize:28 }}>{resumen[key] ?? resumen.pagados}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div className="empty">
            <div style={{ width:24, height:24, border:'2px solid var(--outline)', borderTop:'2px solid var(--tertiary)', borderRadius:'50%', animation:'spin .7s linear infinite', margin:'0 auto' }} />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="empty">Sin clientes para mostrar</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Zona</th>
                  <th>Plan / Monto</th>
                  <th>Vence día</th>
                  <th>Estado</th>
                  <th>Pago registrado</th>
                  <th>Contacto</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(c => {
                  const cfg = ESTADO_CFG[c.estado_cobro] || ESTADO_CFG.sin_pagar
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{c.nombre_razon_social}</div>
                        <div style={{ fontSize:11, color:'var(--on-surface-variant)', fontFamily:'IBM Plex Mono,monospace' }}>{c.documento_identidad}</div>
                      </td>
                      <td style={{ fontSize:12, color:'#64748b' }}>{c.zona_sector || '—'}</td>
                      <td>
                        <div style={{ fontSize:12, fontWeight:500 }}>{c.plan_nombre}</div>
                        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:12, color:'var(--tertiary)', fontWeight:600 }}>${formatUSD(c.monto_usd)}</div>
                      </td>
                      <td>
                        <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:13, fontWeight:600, color:'var(--on-surface)' }}>
                          Día {c.dia_corte || 1}
                        </div>
                        {c.estado_cobro === 'sin_pagar' && (
                          <div style={{ fontSize:10, color:'#dc2626', fontWeight:500 }}>
                            {Math.abs(c.dias_restantes)}d de mora
                          </div>
                        )}
                        {c.estado_cobro === 'por_vencer' && (
                          <div style={{ fontSize:10, color:'#d97706', fontWeight:500 }}>
                            Vence en {c.dias_restantes}d
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display:'inline-flex', alignItems:'center', gap:6,
                          padding:'3px 10px', borderRadius:20,
                          fontSize:11, fontWeight:600,
                          background: cfg.bg, color: cfg.color,
                        }}>
                          <span style={{ width:6, height:6, borderRadius:'50%', background: cfg.dot, flexShrink:0 }} />
                          {cfg.label}
                        </span>
                        {c.notas_cobro && (
                          <div style={{ fontSize:10, color:'#94a3b8', marginTop:3 }} title={c.notas_cobro}>
                            📝 {c.notas_cobro.slice(0, 25)}{c.notas_cobro.length > 25 ? '…' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        {c.pago ? (
                          <div>
                            <div style={{ fontSize:12, fontWeight:600, color:'var(--tertiary)' }}>
                              ${formatUSD(c.pago.monto_usd_real || c.pago.monto_facturado_usd)}
                            </div>
                            <div style={{ fontSize:11, color:'#94a3b8' }}>{c.pago.tipo_pago} · {c.pago.fecha_pago}</div>
                          </div>
                        ) : (
                          <span style={{ fontSize:12, color:'#cbd5e1' }}>Sin pago</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          {c.telefono && (
                            <a href={`tel:${c.telefono}`}
                              style={{ padding:'4px 9px', borderRadius:7, background:'var(--tertiary-container)', border:'none', color:'var(--on-tertiary-container)', fontSize:11, fontWeight:600, textDecoration:'none' }}>
                              📞
                            </a>
                          )}
                          {(c.whatsapp || c.telefono) && (
                            <a href={`https://wa.me/${(c.whatsapp || c.telefono).replace(/\D/g,'')}`}
                              target="_blank" rel="noopener noreferrer"
                              style={{ padding:'4px 9px', borderRadius:7, background:'#f0fff4', border:'1px solid #86efac', color:'#15803d', fontSize:11, fontWeight:600, textDecoration:'none' }}>
                              💬
                            </a>
                          )}
                          <a href={`/dashboard/pagos?cliente=${c.id}`}
                            style={{ padding:'4px 9px', borderRadius:7, background:'#eff6ff', border:'1px solid #bfdbfe', color:'#1e40af', fontSize:11, fontWeight:600, textDecoration:'none' }}>
                            + Pago
                          </a>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Resumen por zona */}
      {!loading && zonas.length > 0 && (
        <div className="card" style={{ marginTop:20 }}>
          <div className="card-title"><div className="acc"/>Resumen por zona — {mesLabel(mes)}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
            {zonas.map(z => {
              const clientesZona = data.filter(c => c.zona_sector === z)
              const pagadosZona  = clientesZona.filter(c => c.estado_cobro === 'pagado').length
              const montoZona    = clientesZona.filter(c => c.estado_cobro === 'pagado')
                .reduce((s, c) => s + Number(c.pago?.monto_usd_real || c.pago?.monto_facturado_usd || 0), 0)
              const pct = Math.round((pagadosZona / clientesZona.length) * 100) || 0
              return (
                <div key={z} style={{ background:'#f8fafc', borderRadius:12, padding:'14px 16px', border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#0f172a', marginBottom:8 }}>{z}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#64748b', marginBottom:8 }}>
                    <span>{pagadosZona}/{clientesZona.length} pagados</span>
                    <span style={{ fontFamily:'IBM Plex Mono,monospace', color:'var(--tertiary)', fontWeight:600 }}>{pct}%</span>
                  </div>
                  <div style={{ height:6, background:'#e2e8f0', borderRadius:10, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'var(--tertiary)', borderRadius:10 }} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--on-surface-variant)', marginTop:6, fontFamily:'IBM Plex Mono,monospace' }}>
                    ${formatUSD(montoZona)} cobrado
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}