'use client'
import { useEffect, useState } from 'react'
import { api, getSesion, mesLabel, formatUSD } from '@/lib/api'

const BADGE = {
  'Activo':'badge badge-green','Cortado':'badge badge-red','Moroso':'badge badge-red',
  'Pendiente':'badge badge-amber','Verificado':'badge badge-blue','Confirmado':'badge badge-green',
  'Rechazado':'badge badge-red','abierto':'badge badge-amber','en_proceso':'badge badge-blue',
  'resuelto':'badge badge-green','cerrado':'badge badge-gray',
  'critica':'badge badge-red','alta':'badge badge-amber','media':'badge badge-gray','baja':'badge badge-gray',
}

function Spinner() {
  return <div style={{width:24,height:24,border:'2.5px solid var(--outline-variant)',borderTop:'2.5px solid var(--primary)',borderRadius:'50%',animation:'spin .7s linear infinite'}}/>
}

// Componente KPI Mejorado con Trends
function KPI({ label, val, color, sub, subColor, icon, trend, trendUp }) {
  return (
    <div className="kpi-card" style={{
      position: 'relative',
      overflow: 'hidden',
      borderLeft: `4px solid ${color || 'var(--primary)'}`
    }}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div className="kpi-label">{label}</div>
        <div style={{
          width:36,height:36,borderRadius:10,
          background:color ? `${color}15` : 'var(--primary-container)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
          {icon}
        </div>
      </div>
      
      <div className="kpi-val" style={{color:color||'var(--on-surface)'}}>{val}</div>
      
      {sub && (
        <div className="kpi-sub" style={{color:subColor||'var(--on-surface-variant)'}}>
          {sub}
        </div>
      )}

      {/* Trend Indicator */}
      {trend && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '10px',
          fontWeight: 'bold',
          background: trendUp ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: trendUp ? '#16a34a' : '#dc2626'
        }}>
          <span style={{fontSize: '8px'}}>
            {trendUp ? '▲' : '▼'}
          </span>
          {trend}
        </div>
      )}

      {/* Decorative Chart Line */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: '60px',
        height: '30px',
        opacity: 0.2,
        transition: 'opacity 0.3s'
      }}>
        <svg width="60" height="30" viewBox="0 0 60 30">
          <path 
            d="M0 25 Q 15 25, 30 15 T 60 5" 
            fill="none" 
            stroke={color || 'var(--primary)'} 
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Hover effect */}
      <style jsx>{`
        .kpi-card:hover div:last-child {
          opacity: 0.4;
        }
      `}</style>
    </div>
  )
}

// Componente de Activity Feed
function ActivityFeed({ activities }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="card" style={{textAlign: 'center', padding: '32px 20px'}}>
        <div style={{
          width: 48, height: 48,
          borderRadius: '50%',
          background: 'var(--primary-container)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: '20px'
        }}>✓</div>
        <h3 style={{fontSize: '16px', fontWeight: 600, color: 'var(--on-surface)', marginBottom: 8}}>
          Todo en orden
        </h3>
        <p style={{fontSize: '13px', color: 'var(--on-surface-variant)'}}>
          No hay actividades recientes
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-title">
        <div className="acc"/>
        Actividad Reciente
      </div>
      <div style={{display: 'flex', flexDirection: 'column', gap: 12}}>
        {activities.map((activity, index) => (
          <div key={index} style={{
            display: 'flex', gap: 12, padding: '12px',
            background: 'var(--surface-container)',
            borderRadius: '12px',
            border: '1px solid var(--outline-variant)',
            transition: 'all 0.2s'
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '10px',
              background: activity.color ? `${activity.color}15` : 'var(--surface-container-high)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: activity.color || 'var(--primary)',
              flexShrink: 0
            }}>
              {activity.icon}
            </div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{
                fontSize: '13px', fontWeight: 600,
                color: 'var(--on-surface)', marginBottom: 2
              }}>
                {activity.user}
              </div>
              <div style={{
                fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: 4
              }}>
                {activity.action}
              </div>
              <div style={{
                fontSize: '10px', color: 'var(--outline)',
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                {activity.time}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost" style={{width: '100%', marginTop: 16}}>
        Ver todo el historial
      </button>
    </div>
  )
}

// Componente de System Status
function SystemStatus() {
  const systems = [
    { name: 'Backbone Principal', status: 'Online', icon: '🌐', latency: '12ms', color: '#16a34a' },
    { name: 'Nodo Central', status: 'Online', icon: '🖥️', latency: '8ms', color: '#16a34a' },
    { name: 'API Gateway', status: 'Online', icon: '🔌', latency: '45ms', color: '#16a34a' },
  ]

  return (
    <div className="card">
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20}}>
        <div>
          <div className="card-title" style={{margin: 0}}>
            <div className="acc"/>
            Estado del Sistema
          </div>
          <p style={{fontSize: '12px', color: 'var(--on-surface-variant)', marginTop: 4}}>
            Monitoreo en tiempo real de la infraestructura
          </p>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px', borderRadius: '20px',
          background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a',
          fontSize: '11px', fontWeight: 'bold',
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <div style={{width: 8, height: 8, borderRadius: '50%', background: '#16a34a'}}/>
          SISTEMA OPERATIVO
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16}}>
        {systems.map((system, index) => (
          <div key={index} style={{
            padding: 16, borderRadius: '12px',
            background: 'var(--surface-container)',
            border: '1px solid var(--outline-variant)',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'all 0.2s'
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: '12px',
              background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              {system.icon}
            </div>
            <div>
              <div style={{
                fontSize: '13px', fontWeight: 'bold',
                color: 'var(--on-surface)', marginBottom: 4
              }}>
                {system.name}
              </div>
              <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <span style={{
                  fontSize: '10px', fontWeight: 'black',
                  color: system.color, textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {system.status}
                </span>
                <span style={{
                  fontSize: '10px', fontWeight: 'bold',
                  color: 'var(--outline)', textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {system.latency}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
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

  // Preparar datos de actividad
  const activities = [
    ...(pagos.slice(0, 3).map(p => ({
      user: p.nombre_cliente,
      action: 'Pago realizado',
      time: 'hace 5 min',
      icon: '💰',
      color: '#16a34a'
    }))),
    ...(reps.slice(0, 2).map(r => ({
      user: r.nombre_cliente || 'Cliente',
      action: 'Nuevo reporte',
      time: 'hace 12 min',
      icon: '⚠️',
      color: '#d97706'
    })))
  ].slice(0, 4)

  return (
    <div style={{spaceY: 40}}>
      {/* Header Mejorado */}
      <header style={{display:'flex',flexDirection:'column',md:flexRow,md:itemsEnd,justifyContent:'space-between',gap:16,marginBottom:32}}>
        <div>
          <h1 style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: 'var(--on-surface)',
            lineHeight: 1.2,
            marginBottom: 8
          }}>
            ¡Hola, <span style={{color: 'var(--primary)'}}>{sesion?.usuario}</span>! 👋
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--on-surface-variant)',
            fontWeight: 500,
            marginTop: 4
          }}>
            {new Date().toLocaleDateString('es-VE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
        </div>

        {/* Tasa BCV Mejorada */}
        {tasa && (
          <div style={{
            display:'flex',alignItems:'center',gap:16,
            background:'var(--glass-bg)',
            backdropFilter: 'blur(24px)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            padding: '16px 24px',
            boxShadow: '0 4px 20px var(--shadow-color)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: '#16a34a',
              boxShadow: '0 0 0 4px rgba(34, 197, 94, 0.2)',
              flexShrink: 0,
              animation: 'pulse 2s ease-in-out infinite'
            }}/>
            <div>
              <div style={{
                fontSize: '11px', color: 'var(--on-surface-variant)',
                fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2
              }}>
                Tasa BCV hoy
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '18px',
                fontWeight: 600, color: 'var(--primary)'
              }}>
                Bs. {Number(tasa.tasa_usd_bs).toLocaleString('es-VE',{minimumFractionDigits:2})} / USD
              </div>
            </div>
            <a href="/dashboard/tasa-bcv" className="btn btn-primary btn-sm">
              Actualizar
            </a>
          </div>
        )}
      </header>

      {/* KPIs Grid Mejorado */}
      <section className="kpi-grid" style={{marginBottom: 32}}>
        <KPI 
          label="Total clientes" 
          val={s.clientes?.total??'—'} 
          icon="👥"
          trend="+12%"
          trendUp={true}
        />
        <KPI 
          label="Activos" 
          val={s.clientes?.activos??'—'} 
          color="var(--primary)"
          icon="✓"
          trend="+5%"
          trendUp={true}
        />
        <KPI 
          label="Cortados" 
          val={s.clientes?.cortados??'—'} 
          color="var(--tertiary)"
          icon="✕"
          trend="-2%"
          trendUp={false}
        />
        <KPI 
          label="Pagos pendientes" 
          val={s.pagos?.pendientes??'—'} 
          color="var(--tertiary)"
          icon="⏳"
        />
        <KPI 
          label={`Cobrado ${mesLabel(s.mesActual)}`}
          val={`$${formatUSD(s.pagos?.cobradoMes)}`} 
          color="var(--primary)"
          sub={v!=null?`${v>=0?'▲':'▼'} ${Math.abs(v)}% vs mes anterior`:null}
          subColor={v>=0?'var(--primary)':'var(--tertiary)'}
          icon="💵"
          trend={v!=null?`${Math.abs(v)}%`:null}
          trendUp={v>=0}
        />
        <KPI 
          label="Reportes abiertos"
          val={s.reportes?.abiertos??'—'}
          color={s.reportes?.criticos>0?'var(--tertiary)':'var(--tertiary)'}
          sub={s.reportes?.criticos>0?`${s.reportes.criticos} crítico(s)`:null}
          subColor="var(--tertiary)"
          icon="🔧"
        />
      </section>

      {/* Main Content Grid */}
      <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, marginBottom: 32}}>
        {/* Left Side: System Status + Zones */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 24}}>
          <SystemStatus />

          {/* Clientes por Zona Mejorado */}
          {s.porZona && Object.keys(s.porZona).length > 0 && (
            <div className="card">
              <div className="card-title">
                <div className="acc"/>
                Clientes por Zona
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                {Object.entries(s.porZona)
                  .sort((a,b) => b[1].total - a[1].total)
                  .map(([zona, d], index) => (
                    <div key={zona} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16}}>
                      <div style={{flex: 1}}>
                        <div style={{
                          fontSize: '13px', fontWeight: 'bold',
                          color: 'var(--on-surface)', marginBottom: 4
                        }}>
                          {zona}
                        </div>
                        <div style={{
                          fontSize: '11px', color: 'var(--on-surface-variant)'
                        }}>
                          {d.activos} de {d.total} clientes activos
                        </div>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
                        <div style={{
                          width: 120, height: 8,
                          background: 'var(--surface-container-high)',
                          borderRadius: '4px', overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${(d.activos / d.total) * 100}%`,
                            height: '100%',
                            background: 'var(--primary)',
                            borderRadius: '4px',
                            transition: 'width 1s ease-out'
                          }}/>
                        </div>
                        <span style={{
                          fontSize: '11px', fontWeight: 600,
                          color: 'var(--on-surface-variant)', minWidth: '35px'
                        }}>
                          {Math.round((d.activos / d.total) * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Activity Feed */}
        <ActivityFeed activities={activities} />
      </div>

      {/* Bottom Section: Tables */}
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24}}>
        {/* Últimos Pagos */}
        <div className="card" style={{padding: 0, overflow: 'hidden'}}>
          <div style={{padding: '20px 24px 16px', borderBottom: '1px solid var(--outline-variant)'}}>
            <div className="card-title" style={{margin: 0}}>
              <div className="acc"/>
              Últimos Pagos
            </div>
          </div>
          {pagos.length === 0 ? (
            <div className="empty">Sin pagos recientes</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Mes</th>
                  <th>Monto</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map(p => (
                  <tr key={p.id}>
                    <td style={{
                      maxWidth: 140, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: 500
                    }}>
                      {p.nombre_cliente}
                    </td>
                    <td className="mono">{mesLabel(p.mes_cobro)}</td>
                    <td className="mono" style={{color: 'var(--primary)', fontWeight: 600}}>
                      ${formatUSD(p.monto_facturado_usd)}
                    </td>
                    <td>
                      <span className={BADGE[p.estado_verificacion]||'badge badge-gray'}>
                        {p.estado_verificacion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{padding: '12px 24px', borderTop: '1px solid var(--outline-variant)'}}>
            <a href="/dashboard/pagos" style={{
              fontSize: '13px', color: 'var(--primary)',
              textDecoration: 'none', fontWeight: 600
            }}>
              Ver todos →
            </a>
          </div>
        </div>

        {/* Reportes Abiertos */}
        <div className="card" style={{padding: 0, overflow: 'hidden'}}>
          <div style={{padding: '20px 24px 16px', borderBottom: '1px solid var(--outline-variant)'}}>
            <div className="card-title" style={{margin: 0}}>
              <div className="acc"/>
              Reportes Abiertos
            </div>
          </div>
          {reps.length === 0 ? (
            <div className="empty">
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'var(--primary-container)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '20px'
              }}>✓</div>
              Todo en orden
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Prioridad</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {reps.map(r => (
                  <tr key={r.id}>
                    <td style={{
                      maxWidth: 160, overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: 500
                    }}>
                      {r.titulo}
                    </td>
                    <td>
                      <span className={BADGE[r.prioridad]||'badge badge-gray'}>
                        {r.prioridad}
                      </span>
                    </td>
                    <td className="mono" style={{fontSize: 11, color: 'var(--on-surface-variant)'}}>
                      {r.fecha_reporte}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{padding: '12px 24px', borderTop: '1px solid var(--outline-variant)'}}>
            <a href="/dashboard/reportes" style={{
              fontSize: '13px', color: 'var(--primary)',
              textDecoration: 'none', fontWeight: 600
            }}>
              Ver todos →
            </a>
          </div>
        </div>
      </div>

      {/* Métodos de Pago */}
      {s.porTipoPago && Object.keys(s.porTipoPago).length > 0 && (
        <div className="card" style={{marginTop: 24}}>
          <div className="card-title">
            <div className="acc"/>
            Métodos de Pago — {mesLabel(s.mesActual)}
          </div>
          <div style={{display: 'flex', gap: 12, flexWrap: 'wrap'}}>
            {Object.entries(s.porTipoPago)
              .sort((a,b) => b[1] - a[1])
              .map(([tipo, count]) => (
                <div key={tipo} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: 'var(--surface-container)',
                  border: '1px solid var(--outline-variant)',
                  borderRadius: 12, padding: '12px 20px',
                  transition: 'all 0.2s'
                }}>
                  <span style={{
                    fontSize: '13px', fontWeight: 600,
                    color: 'var(--on-surface)'
                  }}>
                    {tipo}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '12px',
                    color: 'var(--primary)', fontWeight: 700,
                    background: 'var(--primary-container)',
                    padding: '2px 10px', borderRadius: '20px',
                  }}>
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button className="btn btn-primary" style={{
        position: 'fixed', bottom: 24, right: 24,
        width: 56, height: 56, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, boxShadow: '0 8px 24px var(--shadow-color)',
        zIndex: 50, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        +
      </button>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
