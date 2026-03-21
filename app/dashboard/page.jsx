'use client'
import { useEffect, useState } from 'react'
import { api, getSesion, mesLabel, formatUSD } from '@/lib/api'

const BADGE = {
  'Activo':'badge badge-green','Cortado':'badge badge-red','Moroso':'badge badge-amber',
  'Pendiente':'badge badge-amber','Verificado':'badge badge-blue','Confirmado':'badge badge-green',
  'Rechazado':'badge badge-red','abierto':'badge badge-amber','en_proceso':'badge badge-blue',
  'resuelto':'badge badge-green','cerrado':'badge badge-gray',
  'critica':'badge badge-red','alta':'badge badge-amber','media':'badge badge-gray','baja':'badge badge-gray',
}

function Spinner() {
  return <div style={{width:24,height:24,border:'2.5px solid #e2e8f0',borderTop:'2.5px solid #16a34a',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
}

function KPI({ label, val, color, sub, subColor, icon }) {
  return (
    <div className="kpi-card">
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div className="kpi-label">{label}</div>
        {icon && (
          <div style={{width:36,height:36,borderRadius:10,background:'#f8fafc',border:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17}}>
            {icon}
          </div>
        )}
      </div>
      <div className="kpi-val" style={{color:color||'#0f172a'}}>{val}</div>
      {sub && <div className="kpi-sub" style={{color:subColor||'#94a3b8'}}>{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const [stats,setStats] = useState(null)
  const [pagos,setPagos] = useState([])
  const [reps, setReps]  = useState([])
  const [tasa, setTasa]  = useState(null)
  const [load, setLoad]  = useState(true)
  const sesion = getSesion()

  useEffect(()=>{
    async function go(){
      try {
        const [e,p,r,t] = await Promise.all([
          api.get('/api/estadisticas'),
          api.get('/api/pagos?per=6'),
          api.get('/api/reportes?estado=abierto&per=5'),
          api.get('/api/tasa-bcv'),
        ])
        setStats(e.data); setPagos(p.data||[]); setReps(r.data||[]); setTasa(t.data)
      } catch(e){console.error(e)} finally{setLoad(false)}
    }
    go()
  },[])

  if(load) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:300}}><Spinner/></div>

  const s = stats||{}
  const v = s.pagos?.variacionIngresos

  return (
    <div>
      {/* Header saludo */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:26,gap:16,flexWrap:'wrap'}}>
        <div>
          <h1 style={{fontSize:26,fontWeight:700,letterSpacing:'-.5px',color:'#0f172a',lineHeight:1.2}}>
            Bienvenido, <span style={{color:'#16a34a'}}>{sesion?.usuario}</span> 👋
          </h1>
          <p style={{fontSize:13,color:'#94a3b8',marginTop:6,fontWeight:400}}>
            {new Date().toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>

        {/* Tasa BCV */}
        {tasa&&(
          <div style={{
            display:'flex',alignItems:'center',gap:14,
            background:'#fff',border:'1px solid #e2e8f0',borderRadius:14,
            padding:'12px 20px',boxShadow:'0 1px 4px rgba(0,0,0,0.05)',
          }}>
            <div style={{width:9,height:9,borderRadius:'50%',background:'#22c55e',boxShadow:'0 0 0 3px #dcfce7',flexShrink:0}}/>
            <div>
              <div style={{fontSize:10,color:'#94a3b8',fontWeight:600,textTransform:'uppercase',letterSpacing:'1px',marginBottom:2}}>Tasa BCV hoy</div>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:16,fontWeight:600,color:'#16a34a'}}>
                Bs. {Number(tasa.tasa_usd_bs).toLocaleString('es-VE',{minimumFractionDigits:2})} / USD
              </div>
            </div>
            <a href="/dashboard/tasa-bcv" style={{
              marginLeft:8,padding:'6px 14px',borderRadius:8,
              background:'#f0fdf4',color:'#16a34a',
              fontSize:12,fontWeight:600,textDecoration:'none',
              border:'1px solid #bbf7d0',
            }}>Actualizar</a>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="kpi-grid">
        <KPI label="Total clientes"    val={s.clientes?.total??'—'}    icon="👥"/>
        <KPI label="Activos"           val={s.clientes?.activos??'—'}  color="#16a34a" icon="✓"/>
        <KPI label="Cortados"          val={s.clientes?.cortados??'—'} color="#dc2626" icon="✕"/>
        <KPI label="Pagos pendientes"  val={s.pagos?.pendientes??'—'}  color="#d97706" icon="⏳"/>
        <KPI label={`Cobrado ${mesLabel(s.mesActual)}`}
          val={`$${formatUSD(s.pagos?.cobradoMes)}`} color="#16a34a"
          sub={v!=null?`${v>=0?'▲':'▼'} ${Math.abs(v)}% vs mes anterior`:null}
          subColor={v>=0?'#16a34a':'#dc2626'} icon="💵"/>
        <KPI label="Reportes abiertos"
          val={s.reportes?.abiertos??'—'}
          color={s.reportes?.criticos>0?'#dc2626':'#d97706'}
          sub={s.reportes?.criticos>0?`${s.reportes.criticos} crítico(s)`:null}
          subColor="#dc2626" icon="🔧"/>
      </div>

      {/* Zonas */}
      {s.porZona&&Object.keys(s.porZona).length>0&&(
        <div className="card" style={{marginBottom:20}}>
          <div className="card-title"><div className="acc"/>Clientes por zona</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {Object.entries(s.porZona).sort((a,b)=>b[1].total-a[1].total).map(([zona,d])=>(
              <div key={zona} style={{
                background:'#f8fafc',border:'1px solid #e2e8f0',
                borderRadius:10,padding:'8px 16px',
              }}>
                <div style={{fontSize:13,fontWeight:600,color:'#0f172a',marginBottom:2}}>{zona}</div>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'#94a3b8'}}>{d.activos}/{d.total} activos</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tablas */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'18px 20px 16px',borderBottom:'1px solid #f1f5f9'}}>
            <div className="card-title" style={{margin:0}}><div className="acc"/>Últimos pagos</div>
          </div>
          {pagos.length===0?(
            <div className="empty">Sin pagos recientes</div>
          ):(
            <table>
              <thead><tr><th>Cliente</th><th>Mes</th><th>Monto</th><th>Estado</th></tr></thead>
              <tbody>{pagos.map(p=>(
                <tr key={p.id}>
                  <td style={{maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:500}}>{p.nombre_cliente}</td>
                  <td className="mono">{mesLabel(p.mes_cobro)}</td>
                  <td className="mono" style={{color:'#16a34a',fontWeight:600}}>${formatUSD(p.monto_facturado_usd)}</td>
                  <td><span className={BADGE[p.estado_verificacion]||'badge badge-gray'}>{p.estado_verificacion}</span></td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <div style={{padding:'12px 20px',borderTop:'1px solid #f1f5f9'}}>
            <a href="/dashboard/pagos" style={{fontSize:13,color:'#16a34a',textDecoration:'none',fontWeight:600}}>Ver todos →</a>
          </div>
        </div>

        <div className="card" style={{padding:0,overflow:'hidden'}}>
          <div style={{padding:'18px 20px 16px',borderBottom:'1px solid #f1f5f9'}}>
            <div className="card-title" style={{margin:0}}><div className="acc"/>Reportes abiertos</div>
          </div>
          {reps.length===0?(
            <div className="empty">
              <div style={{width:40,height:40,borderRadius:'50%',background:'#dcfce7',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:20}}>✓</div>
              Todo en orden
            </div>
          ):(
            <table>
              <thead><tr><th>Título</th><th>Prioridad</th><th>Fecha</th></tr></thead>
              <tbody>{reps.map(r=>(
                <tr key={r.id}>
                  <td style={{maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:500}}>{r.titulo}</td>
                  <td><span className={BADGE[r.prioridad]||'badge badge-gray'}>{r.prioridad}</span></td>
                  <td className="mono" style={{fontSize:11,color:'#94a3b8'}}>{r.fecha_reporte}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <div style={{padding:'12px 20px',borderTop:'1px solid #f1f5f9'}}>
            <a href="/dashboard/reportes" style={{fontSize:13,color:'#16a34a',textDecoration:'none',fontWeight:600}}>Ver todos →</a>
          </div>
        </div>
      </div>

      {/* Métodos de pago */}
      {s.porTipoPago&&Object.keys(s.porTipoPago).length>0&&(
        <div className="card" style={{marginTop:20}}>
          <div className="card-title"><div className="acc"/>Métodos de pago — {mesLabel(s.mesActual)}</div>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            {Object.entries(s.porTipoPago).sort((a,b)=>b[1]-a[1]).map(([tipo,count])=>(
              <div key={tipo} style={{
                display:'flex',alignItems:'center',gap:10,
                background:'#f8fafc',border:'1px solid #e2e8f0',
                borderRadius:10,padding:'8px 16px',
              }}>
                <span style={{fontSize:13,fontWeight:500,color:'#334155'}}>{tipo}</span>
                <span style={{
                  fontFamily:'JetBrains Mono,monospace',fontSize:12,
                  color:'#16a34a',fontWeight:700,
                  background:'#dcfce7',padding:'1px 8px',borderRadius:20,
                }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}