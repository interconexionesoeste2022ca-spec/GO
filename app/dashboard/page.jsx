'use client'
import { useEffect, useState } from 'react'
import { api, getSesion } from '@/lib/api'

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null)
  const [pagosRecientes, setPagosRecientes] = useState([])
  const [reportesAbiertos, setReportesAbiertos] = useState([])
  const [loading, setLoading] = useState(true)
  const sesion = getSesion()

  useEffect(() => {
    async function cargar() {
      try {
        const [clientes, pagos, reportes] = await Promise.all([
          api.get('/api/clientes'),
          api.get('/api/pagos?limite=200'),
          api.get('/api/reportes?estado=abierto&limite=5'),
        ])

        const cls = clientes.data || []
        const pgs = pagos.data || []
        const rps = reportes.data || []

        const activos   = cls.filter(c => c.estado_servicio === 'Activo').length
        const cortados  = cls.filter(c => c.estado_servicio === 'Cortado').length
        const pendientes = pgs.filter(p => p.estado_verificacion === 'Pendiente').length
        const mesActual = new Date().toISOString().slice(0, 7)
        const cobradoMes = pgs
          .filter(p => p.fecha_pago?.startsWith(mesActual) && p.estado_verificacion !== 'Rechazado')
          .reduce((s, p) => s + Number(p.monto_usd_real || p.monto_facturado_usd || 0), 0)

        setKpis({ total: cls.length, activos, cortados, pendientes, cobradoMes })
        setPagosRecientes(pgs.slice(0, 6))
        setReportesAbiertos(rps)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    cargar()
  }, [])

  const estadoBadge = {
    'Activo':   'badge badge-green',
    'Cortado':  'badge badge-red',
    'Moroso':   'badge badge-amber',
    'Pendiente':'badge badge-amber',
    'Verificado':'badge badge-blue',
    'Confirmado':'badge badge-green',
    'Rechazado':'badge badge-red',
  }

  if (loading) return <div className="empty">Cargando métricas…</div>

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Clientes</div>
          <div className="kpi-val">{kpis?.total ?? '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Activos</div>
          <div className="kpi-val" style={{ color: 'var(--green)' }}>{kpis?.activos ?? '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cortados</div>
          <div className="kpi-val" style={{ color: 'var(--red)' }}>{kpis?.cortados ?? '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pagos Pendientes</div>
          <div className="kpi-val" style={{ color: 'var(--amber)' }}>{kpis?.pendientes ?? '—'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cobrado este mes</div>
          <div className="kpi-val" style={{ color: 'var(--blue)', fontSize: 22 }}>
            ${kpis?.cobradoMes?.toFixed(2) ?? '0.00'}
          </div>
          <div className="kpi-sub">USD acumulado</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Reportes Abiertos</div>
          <div className="kpi-val" style={{ color: 'var(--amber)' }}>{reportesAbiertos.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-title">📋 Últimos Pagos Registrados</div>
          {pagosRecientes.length === 0 ? (
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
                {pagosRecientes.map(p => (
                  <tr key={p.id}>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nombre_cliente}
                    </td>
                    <td className="mono">{p.mes_cobro}</td>
                    <td className="mono">${Number(p.monto_facturado_usd || 0).toFixed(2)}</td>
                    <td>
                      <span className={estadoBadge[p.estado_verificacion] || 'badge badge-gray'}>
                        {p.estado_verificacion}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 14, textAlign: 'right' }}>
            <a href="/dashboard/pagos" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>Ver todos →</a>
          </div>
        </div>

        <div className="card">
          <div className="card-title">🔧 Reportes Abiertos</div>
          {reportesAbiertos.length === 0 ? (
            <div className="empty">✅ Sin reportes abiertos</div>
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
                {reportesAbiertos.map(r => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.titulo}
                    </td>
                    <td>
                      <span className={
                        r.prioridad === 'critica' ? 'badge badge-red' :
                        r.prioridad === 'alta' ? 'badge badge-amber' :
                        'badge badge-gray'
                      }>{r.prioridad}</span>
                    </td>
                    <td className="mono" style={{ fontSize: 12 }}>{r.fecha_reporte}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div style={{ marginTop: 14, textAlign: 'right' }}>
            <a href="/dashboard/reportes" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', fontWeight: 600 }}>Ver todos →</a>
          </div>
        </div>
      </div>
    </div>
  )
}
