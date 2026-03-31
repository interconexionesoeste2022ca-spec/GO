'use client'
import { useState, useCallback } from 'react'
import { api, alertaExito, alertaError } from '@/lib/api'

export default function FotosClienteModule({ clienteId, onFotoAgregada }) {
  const [modal, setModal] = useState(false)
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    drive_url: '',
    drive_file_id: '',
    titulo: '',
    es_referencia_casa: true,
    es_documento: false,
    notas: '',
  })

  // Cargar fotos del cliente
  const cargarFotos = useCallback(async () => {
    try {
      const res = await api.get(`/api/clientes/${clienteId}/fotos-drive`)
      setFotos(res.data || [])
    } catch (e) {
      console.error(e)
    }
  }, [clienteId])

  // Agregar foto
  const agregarFoto = async (e) => {
    e.preventDefault()
    if (!form.drive_url || !form.drive_file_id) {
      await alertaError('Error', 'La URL y el ID de Google Drive son requeridos')
      return
    }

    setLoading(true)
    try {
      const res = await api.post(`/api/clientes/${clienteId}/fotos-drive`, form)
      if (res.ok) {
        await alertaExito('Foto agregada', 'La foto se agregó correctamente')
        setForm({
          drive_url: '',
          drive_file_id: '',
          titulo: '',
          es_referencia_casa: true,
          es_documento: false,
          notas: '',
        })
        await cargarFotos()
      }
    } catch (e) {
      await alertaError('Error', e.message)
    } finally {
      setLoading(false)
    }
  }

  // Eliminar foto
  const eliminarFoto = async (fotoId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta foto?')) return
    try {
      await api.delete(`/api/clientes/${clienteId}/fotos-drive?foto_id=${fotoId}`)
      await alertaExito('Foto eliminada')
      await cargarFotos()
    } catch (e) {
      await alertaError('Error', e.message)
    }
  }

  const handleModalOpen = () => {
    cargarFotos()
    setModal(true)
  }

  return (
    <>
      <button 
        className="btn btn-ghost btn-sm"
        onClick={handleModalOpen}
        style={{ fontSize: 12 }}>
        📸 Fotos Drive
      </button>

      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, maxWidth: 600, width: '90%',
            maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px', borderBottom: '1px solid #e2e8f0'
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                📸 Fotos del cliente
              </h2>
              <button onClick={() => setModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8' }}>
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: 20 }}>
              {/* Formulario agregar foto */}
              <form onSubmit={agregarFoto} style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Agregar foto desde Google Drive
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    URL pública de la foto
                  </label>
                  <input
                    className="input"
                    type="url"
                    placeholder="https://drive.google.com/uc?id=..."
                    value={form.drive_url}
                    onChange={(e) => setForm({ ...form, drive_url: e.target.value })}
                    style={{ fontSize: 12, width: '100%' }}
                  />
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
                    📝 Comparte el archivo en Google Drive, copia el ID y usa: https://drive.google.com/uc?id=FILE_ID
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    ID del archivo en Google Drive
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="1A2B3C4D5E6F..."
                    value={form.drive_file_id}
                    onChange={(e) => setForm({ ...form, drive_file_id: e.target.value })}
                    style={{ fontSize: 12, width: '100%' }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Título (opcional)
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="ej: Foto de entrada"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    style={{ fontSize: 12, width: '100%' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={form.es_referencia_casa}
                      onChange={(e) => setForm({ ...form, es_referencia_casa: e.target.checked })}
                    />
                    <span>Referencia de casa</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12 }}>
                    <input
                      type="checkbox"
                      checked={form.es_documento}
                      onChange={(e) => setForm({ ...form, es_documento: e.target.checked })}
                    />
                    <span>Documento/Cédula</span>
                  </label>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
                    Notas (opcional)
                  </label>
                  <textarea
                    className="textarea"
                    placeholder="ej: Fachada principal"
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    style={{ fontSize: 12, width: '100%', minHeight: 60 }}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={loading}
                  style={{ width: '100%' }}>
                  {loading ? 'Agregando…' : '➕ Agregar foto'}
                </button>
              </form>

              {/* Lista de fotos */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 12 }}>
                  Fotos agregadas ({fotos.length})
                </div>

                {fotos.length === 0 ? (
                  <div style={{ fontSize: 12, color: '#94a3b8', padding: 20, textAlign: 'center', background: '#f6f8fa', borderRadius: 10 }}>
                    No hay fotos agregadas aún
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                    {fotos.map((foto) => (
                      <div key={foto.id} style={{
                        border: '1px solid #e2e8f0', borderRadius: 10, padding: 12,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        hover: { background: '#f6f8fa' }
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                            {foto.titulo || 'Sin título'}
                          </div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                            {foto.es_referencia_casa && '📸 Referencia '}
                            {foto.es_documento && '📄 Documento'}
                            {foto.notas && ` • ${foto.notas}`}
                          </div>
                          <a href={foto.drive_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', marginTop: 4, display: 'block' }}>
                            Ver en Google Drive →
                          </a>
                        </div>
                        <button
                          onClick={() => eliminarFoto(foto.id)}
                          style={{
                            background: 'none', border: 'none', color: '#dc2626',
                            cursor: 'pointer', fontSize: 18, padding: 8
                          }}>
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
