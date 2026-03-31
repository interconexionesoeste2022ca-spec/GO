'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, getSesion, mesLabel, formatUSD } from '@/lib/api'

const MESES = Array.from({length:12},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-i);return d.toISOString().slice(0,7)})

export default function RentabilidadPage() {
  const sesion = getSesion()
  const [pagos,setPagos]   = useState([])
  const [loading,setLoading] = useState(true)
  const [mesFilter,setMesFilter] = useState('')

  const cargar = useCallback(async()=>{
    setLoading(true)
    try {
      const res = await api.get('/api/pagos?per=500')
      setPagos(res.data||[])
    } catch(e){console.error(e)} finally{setLoading(false)}
  },[])

  useEffect(()=>{cargar()},[cargar])

  // Solo pagos confirmados/verificados con tasas válidas
  const pagosConTasa = pagos.filter(p =>
    ['Verificado','Confirmado','Pendiente'].includes(p.estado_verificacion) &&
    Number(p.tasa_bcv_facturacion) > 1 &&
    Number(p.tasa_bcv_pago) > 1
  )

  const filtrados = mesFilter
    ? pagosConTasa.filter(p => p.mes_cobro === mesFilter)
    : pagosConTasa

  // Calcular rentabilidad por pago
  // Si tasa_pago > tasa_facturación → GANASTE (cobraste más Bs de los que debías)
  // Si tasa_pago < tasa_facturación → PERDISTE (cobraste menos Bs)
  const pagosConAnalisis = filtrados.map(p => {
    const montoUSD     = Number(p.monto_usd_real || p.monto_facturado_usd || 0)
    const tasaFact     = Number(p.tasa_bcv_facturacion)
    const tasaPago     = Number(p.tasa_bcv_pago)
    const bsEsperados  = montoUSD * tasaFact
    const bsRecibidos  = Number(p.monto_pagado_bs || 0) || (montoUSD * tasaPago)
    const diferenciaBs = bsRecibidos - bsEsperados
    const diferenciaUSD = tasaPago > 0 ? diferenciaBs / tasaPago : 0
    const porcentaje    = bsEsperados > 0 ? ((diferenciaBs / bsEsperados) * 100) : 0

    return { ...p, montoUSD, tasaFact, tasaPago, bsEsperados, bsRecibidos, diferenciaBs, diferenciaUSD, porcentaje }
  }).sort((a,b) => Math.abs(b.diferenciaBs) - Math.abs(a.diferenciaBs))

  // KPIs
  const totalGanancia   = pagosConAnalisis.filter(p => p.diferenciaBs > 0).reduce((s, p) => s + p.diferenciaBs, 0)
  const totalPerdida    = pagosConAnalisis.filter(p => p.diferenciaBs < 0).reduce((s, p) => s + p.diferenciaBs, 0)
  const neto            = totalGanancia + totalPerdida
  const totalBsRecibido = pagosConAnalisis.reduce((s, p) => s + p.bsRecibidos, 0)
  const totalBsEsperado = pagosConAnalisis.reduce((s, p) => s + p.bsEsperados, 0)

  // Agregar por mes
  const porMes = {}
  pagosConAnalisis.forEach(p => {
    if (!porMes[p.mes_cobro]) porMes[p.mes_cobro] = { ganancia: 0, perdida: 0, neto: 0, pagos: 0 }
    const m = porMes[p.mes_cobro]
    if (p.diferenciaBs > 0) m.ganancia += p.diferenciaBs
    else m.perdida += p.diferenciaBs
    m.neto += p.diferenciaBs
    m.pagos++
  })
  const mesesConData = Object.entries(porMes).sort((a,b) => b[0].localeCompare(a[0]))
  const maxBarra = Math.max(...mesesConData.map(([,m]) => Math.max(Math.abs(m.ganancia), Math.abs(m.perdida))), 1)

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}>
      <div style={{width:24,height:24,border:'2px solid var(--outline)',borderTop:'2px solid var(--tertiary)',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24,flexWrap:'wrap'}}>
        <select className="select" style={{maxWidth:150}} value={mesFilter} onChange={e=>setMesFilter(e.target.value)}>
          <option value="">Todos los meses</option>
          {MESES.map(m=><option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
        <div style={{flex:1}}/>
        <span style={{fontSize:12,color:'var(--on-surface-variant)',fontFamily:'IBM Plex Mono,monospace'}}>
          {pagosConAnalisis.length} pagos con datos de tasa
        </span>
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺</button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{marginBottom:24}}>
        <div className="kpi-card">
          <div className="kpi-label">Bs Recibidos</div>
          <div className="kpi-val" style={{color:'var(--tertiary)',fontSize:22}}>Bs. {formatUSD(totalBsRecibido)}</div>
          <div className="kpi-sub">Total bolívares cobrados</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Bs Esperados</div>
          <div className="kpi-val" style={{color:'#334155',fontSize:22}}>Bs. {formatUSD(totalBsEsperado)}</div>
          <div className="kpi-sub">Según tasa de facturación</div>
        </div>
        <div className="kpi-card" style={{borderColor: neto >= 0 ? '#bbf7d0' : '#fecaca'}}>
          <div className="kpi-label">Diferencial neto</div>
          <div className="kpi-val" style={{color: neto >= 0 ? 'var(--tertiary)' : 'var(--error)', fontSize:22}}>
            {neto >= 0 ? '+' : ''}Bs. {formatUSD(neto)}
          </div>
          <div className="kpi-sub" style={{color: neto >= 0 ? 'var(--tertiary)' : 'var(--error)'}}>
            {neto >= 0 ? '✓ Ganancia por tasa' : '⚠ Pérdida por tasa'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Ganancia por tasa</div>
          <div className="kpi-val" style={{color:'var(--tertiary)',fontSize:22}}>+Bs. {formatUSD(totalGanancia)}</div>
          <div className="kpi-sub">Cuando tasa subió entre facturación y pago</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pérdida por tasa</div>
          <div className="kpi-val" style={{color:'#dc2626',fontSize:22}}>Bs. {formatUSD(totalPerdida)}</div>
          <div className="kpi-sub">Cuando tasa bajó entre facturación y pago</div>
        </div>
      </div>

      {/* Gráfico por mes */}
      {mesesConData.length > 0 && (
        <div className="card" style={{marginBottom:20}}>
          <div className="card-title"><div className="acc"/>Diferencial por mes</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {mesesConData.map(([mes, m]) => (
              <div key={mes}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#0f172a'}}>{mesLabel(mes)}</div>
                  <div style={{
                    fontFamily:'IBM Plex Mono,monospace', fontSize:12, fontWeight:700,
                    color: m.neto >= 0 ? 'var(--tertiary)' : 'var(--error)',
                  }}>
                    {m.neto >= 0 ? '+' : ''}Bs. {formatUSD(m.neto)} ({m.pagos} pagos)
                  </div>
                </div>
                <div style={{display:'flex',gap:4,height:20}}>
                  {m.ganancia > 0 && (
                    <div style={{
                      height:'100%', borderRadius:4,
                      background:'#dcfce7', border:'1px solid #bbf7d0',
                      width: `${(m.ganancia / maxBarra) * 100}%`,
                      minWidth:4, display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <span style={{fontSize:9,fontWeight:700,color:'#166534'}}>+{formatUSD(m.ganancia)}</span>
                    </div>
                  )}
                  {m.perdida < 0 && (
                    <div style={{
                      height:'100%', borderRadius:4,
                      background:'#fee2e2', border:'1px solid #fecaca',
                      width: `${(Math.abs(m.perdida) / maxBarra) * 100}%`,
                      minWidth:4, display:'flex', alignItems:'center', justifyContent:'center',
                    }}>
                      <span style={{fontSize:9,fontWeight:700,color:'#991b1b'}}>{formatUSD(m.perdida)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla detalle por pago */}
      <div className="card" style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'18px 20px 14px',borderBottom:'1px solid #f1f5f9'}}>
          <div className="card-title" style={{margin:0}}><div className="acc"/>Detalle por pago — efecto de tasa</div>
        </div>
        {pagosConAnalisis.length === 0 ? (
          <div className="empty">
            <div style={{marginBottom:8,fontSize:20}}>📊</div>
            Sin pagos con datos de tasa para analizar.<br/>
            <span style={{fontSize:12,color:'var(--on-surface-variant)'}}>Los pagos en divisas (Zelle, Binance, Efectivo $) no aplican tasa BCV.</span>
          </div>
        ) : (
          <div style={{overflowX:'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Mes</th>
                  <th>Monto USD</th>
                  <th>Tasa Fact.</th>
                  <th>Tasa Pago</th>
                  <th>Bs Esperados</th>
                  <th>Bs Recibidos</th>
                  <th>Diferencia</th>
                  <th>Efecto</th>
                </tr>
              </thead>
              <tbody>
                {pagosConAnalisis.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{fontWeight:500,fontSize:13}}>{p.nombre_cliente}</div>
                    </td>
                    <td className="mono">{mesLabel(p.mes_cobro)}</td>
                    <td className="mono" style={{fontWeight:600}}>${formatUSD(p.montoUSD)}</td>
                    <td className="mono" style={{fontSize:12}}>{p.tasaFact.toFixed(2)}</td>
                    <td className="mono" style={{fontSize:12,fontWeight:600,
                      color: p.tasaPago > p.tasaFact ? 'var(--tertiary)' : p.tasaPago < p.tasaFact ? 'var(--error)' : 'var(--on-surface-variant)'
                    }}>
                      {p.tasaPago.toFixed(2)}
                      {p.tasaPago > p.tasaFact ? ' ↑' : p.tasaPago < p.tasaFact ? ' ↓' : ''}
                    </td>
                    <td className="mono" style={{fontSize:12,color:'#64748b'}}>{formatUSD(p.bsEsperados)}</td>
                    <td className="mono" style={{fontSize:12}}>{formatUSD(p.bsRecibidos)}</td>
                    <td className="mono" style={{
                      fontSize:12, fontWeight:700,
                      color: p.diferenciaBs >= 0 ? 'var(--tertiary)' : 'var(--error)',
                    }}>
                      {p.diferenciaBs >= 0 ? '+' : ''}{formatUSD(p.diferenciaBs)}
                    </td>
                    <td>
                      <span className={`badge ${p.diferenciaBs >= 0 ? 'badge-green' : 'badge-red'}`}>
                        {p.diferenciaBs >= 0 ? 'Ganancia' : 'Pérdida'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
