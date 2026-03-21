'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, calcularFidelidad, BADGE_FIDELIDAD } from '@/lib/api'

const ORDEN_NIVEL = { PLATINO:0, ORO:1, PLATA:2, BRONCE:3, NUEVO:4 }

export default function FidelidadPage() {
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroNivel, setFiltroNivel] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [clientes, pagos] = await Promise.all([api.get('/api/clientes'), api.get('/api/pagos?limite=2000')])
      const pgs = pagos.data || []
      const cls = clientes.data || []

      const result = cls.map(c => {
        const pagosCliente = pgs.filter(p => p.cliente_id === c.id && ['Verificado','Confirmado'].includes(p.estado_verificacion))
        const cortes = (c.historial_cortes || []).filter(e => e.tipo === 'Corte').length
        const { score, nivel } = calcularFidelidad(pagosCliente.length, cortes)
        return { ...c, pagosVerificados: pagosCliente.length, cortes, score, nivel }
      })

      result.sort((a, b) => {
        if (ORDEN_NIVEL[a.nivel] !== ORDEN_NIVEL[b.nivel]) return ORDEN_NIVEL[a.nivel] - ORDEN_NIVEL[b.nivel]
        return b.score - a.score
      })
      setRanking(result)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const filtrado = ranking.filter(c => {
    const q = busqueda.toLowerCase()
    return (!q || c.nombre_razon_social?.toLowerCase().includes(q)) && (!filtroNivel || c.nivel === filtroNivel)
  })

  const stats = {
    platino: ranking.filter(c => c.nivel === 'PLATINO').length,
    oro:     ranking.filter(c => c.nivel === 'ORO').length,
    plata:   ranking.filter(c => c.nivel === 'PLATA').length,
    bronce:  ranking.filter(c => c.nivel === 'BRONCE').length,
    nuevo:   ranking.filter(c => c.nivel === 'NUEVO').length,
  }

  const colorNivel = { PLATINO:'#7c3aed', ORO:'#d97706', PLATA:'#6b7280', BRONCE:'#92400e', NUEVO:'#8b82a8' }
  const bgNivel    = { PLATINO:'rgba(124,58,237,0.1)', ORO:'rgba(217,119,6,0.1)', PLATA:'rgba(107,114,128,0.1)', BRONCE:'rgba(146,64,14,0.1)', NUEVO:'rgba(139,130,168,0.08)' }

  return (
    <div>
      {/* Resumen niveles */}
      <div className="kpi-grid" style={{ marginBottom:24 }}>
        {[['PLATINO','💎',stats.platino],['ORO','🥇',stats.oro],['PLATA','🥈',stats.plata],['BRONCE','🥉',stats.bronce],['NUEVO','🔘',stats.nuevo]].map(([n,b,v]) => (
          <div key={n} className="kpi-card" style={{ borderTop:`3px solid ${colorNivel[n]}` }}>
            <div className="kpi-label">{b} {n}</div>
            <div className="kpi-val" style={{ color: colorNivel[n], fontSize:32 }}>{v}</div>
            <div className="kpi-sub">clientes</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <input className="input" style={{ maxWidth:240 }} placeholder="Buscar cliente…"
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select className="select" style={{ maxWidth:160 }} value={filtroNivel} onChange={e => setFiltroNivel(e.target.value)}>
          <option value="">Todos los niveles</option>
          {['PLATINO','ORO','PLATA','BRONCE','NUEVO'].map(n => <option key={n}>{n}</option>)}
        </select>
        <div style={{ flex:1 }} />
        <button className="btn btn-ghost btn-sm" onClick={cargar}>↺ Recalcular</button>
      </div>

      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Cliente</th>
              <th>Nivel</th>
              <th>Score</th>
              <th>Pagos Verificados</th>
              <th>Cortes</th>
              <th>Plan</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="loading-row">Calculando fidelidad…</td></tr>}
            {!loading && filtrado.length === 0 && <tr><td colSpan={8}><div className="empty">Sin resultados</div></td></tr>}
            {filtrado.map((c, i) => (
              <tr key={c.id}>
                <td className="mono" style={{ color:'var(--txt-2)', width:40 }}>
                  {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`}
                </td>
                <td style={{ fontWeight:600 }}>{c.nombre_razon_social}</td>
                <td>
                  <span style={{
                    display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
                    borderRadius:20, fontSize:12, fontWeight:700,
                    background: bgNivel[c.nivel], color: colorNivel[c.nivel],
                    fontFamily:'IBM Plex Mono, monospace', textTransform:'uppercase',
                  }}>
                    {BADGE_FIDELIDAD[c.nivel]} {c.nivel}
                  </span>
                </td>
                <td className="mono" style={{ fontWeight:700, color: c.score >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {c.score > 0 ? '+' : ''}{c.score}
                </td>
                <td className="mono" style={{ textAlign:'center' }}>{c.pagosVerificados}</td>
                <td className="mono" style={{ textAlign:'center', color: c.cortes > 0 ? 'var(--red)' : 'inherit' }}>{c.cortes}</td>
                <td style={{ fontSize:13, color:'var(--txt-1)' }}>{c.plan_id || '—'}</td>
                <td>
                  <span className={`badge ${c.estado_servicio === 'Activo' ? 'badge-green' : c.estado_servicio === 'Cortado' ? 'badge-red' : 'badge-amber'}`}>
                    {c.estado_servicio}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop:16, padding:'14px 18px', background:'rgba(124,58,237,0.06)', borderRadius:10, fontSize:13, color:'var(--txt-1)', lineHeight:1.7 }}>
        <strong>Reglas de fidelidad:</strong> Score = (pagos verificados × 10) − (cortes × 15) &nbsp;·&nbsp;
        🔘 NUEVO (score=0, pagos=0) &nbsp;·&nbsp; 🥉 BRONCE (pagos≥1) &nbsp;·&nbsp; 🥈 PLATA (cortes≤1, pagos≥3) &nbsp;·&nbsp; 🥇 ORO (sin cortes, pagos≥6) &nbsp;·&nbsp; 💎 PLATINO (sin cortes, pagos≥12)
      </div>
    </div>
  )
}
