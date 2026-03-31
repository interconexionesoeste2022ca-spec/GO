'use client'
import { useEffect, useState, useCallback } from 'react'
import { api, getSesion, tienePermiso, alertaExito, alertaError } from '@/lib/api'

export default function TasaBcvPage() {
  const sesion   = getSesion()
  const canWrite = tienePermiso(sesion?.rol, 'write')

  const [tasaHoy,   setTasaHoy]   = useState(null)
  const [historial, setHistorial] = useState([])
  const [tasa,      setTasa]      = useState('')
  const [fuente,    setFuente]    = useState('BCV Oficial')
  const [saving,    setSaving]    = useState(false)
  const [loading,   setLoading]   = useState(true)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const hoy = await api.get('/api/tasa-bcv')
      setTasaHoy(hoy.data)
      if (hoy.data?.tasa_usd_bs) setTasa(String(hoy.data.tasa_usd_bs))

      // Últimos 10 días
      const { data } = await api.get('/api/tasa-bcv/historial')
      setHistorial(data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  async function guardar() {
    if (!tasa || isNaN(tasa) || Number(tasa) <= 0) {
      await alertaError('Tasa inválida', 'Ingresa un valor numérico mayor a 0.')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/tasa-bcv', { tasa_usd_bs: Number(tasa), fuente })
      await alertaExito('Tasa actualizada', `Bs. ${Number(tasa).toFixed(2)} / USD`)
      cargar()
    } catch (e) { await alertaError('Error', e.message) }
    finally { setSaving(false) }
  }

  const hoy = new Date().toISOString().split('T')[0]

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
        {/* Tasa actual */}
        <div className="card">
          <div className="card-title">Tasa BCV hoy — {hoy}</div>
          {loading ? <div className="empty">Cargando…</div> : tasaHoy ? (
            <div>
              <div style={{ fontFamily:'IBM Plex Mono,monospace', fontSize:36, fontWeight:700, color:'var(--primary)', margin:'12px 0 4px' }}>
                Bs. {Number(tasaHoy.tasa_usd_bs).toLocaleString('es-VE', { minimumFractionDigits:2 })}
              </div>
              <div style={{ fontSize:13, color:'var(--on-surface-variant)' }}>por 1 USD · Fuente: {tasaHoy.fuente}</div>
              <div style={{ fontSize:12, color:'var(--on-surface-variant)', marginTop:4 }}>Registrada por: {tasaHoy.registrado_por || '—'}</div>
            </div>
          ) : (
            <div className="empty" style={{ padding:20 }}>Sin tasa registrada hoy</div>
          )}
        </div>

        {/* Registrar nueva tasa */}
        {canWrite && (
          <div className="card">
            <div className="card-title">Registrar / Actualizar tasa</div>
            <div className="form-row" style={{ marginTop:12 }}>
              <div className="field-group">
                <label className="field-label">Tasa BCV (Bs/USD)</label>
                <input className="input" type="number" step="0.01" min="0" placeholder="Ej: 45.20"
                  value={tasa} onChange={e => setTasa(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">Fuente</label>
                <select className="select" value={fuente} onChange={e => setFuente(e.target.value)}>
                  <option>BCV Oficial</option>
                  <option>Monitor Dólar</option>
                  <option>Paralelo</option>
                  <option>manual</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop:14, width:'100%' }}
              onClick={guardar} disabled={saving}>
              {saving ? 'Guardando…' : '💾 Guardar tasa del día'}
            </button>
            <p style={{ fontSize:12, color:'var(--on-surface-variant)', marginTop:8 }}>
              Si ya existe una tasa para hoy, se sobreescribirá.
            </p>
          </div>
        )}
      </div>

      {/* Historial */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(124,58,237,0.08)' }}>
          <div className="card-title" style={{ margin:0 }}>📅 Historial de tasas</div>
        </div>
        {historial.length === 0 ? (
          <div className="empty">Sin historial</div>
        ) : (
          <table>
            <thead>
              <tr><th>Fecha</th><th>Tasa Bs/USD</th><th>Fuente</th><th>Registrada por</th></tr>
            </thead>
            <tbody>
              {historial.map(t => (
                <tr key={t.id}>
                  <td className="mono">{t.fecha}</td>
                  <td className="mono" style={{ color:'var(--primary)', fontWeight:600 }}>
                    Bs. {Number(t.tasa_usd_bs).toLocaleString('es-VE', { minimumFractionDigits:2 })}
                  </td>
                  <td>{t.fuente}</td>
                  <td style={{ color:'var(--on-surface-variant)' }}>{t.registrado_por || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
