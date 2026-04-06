import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_URL as API } from '../config'

function parseTags(str) {
  return str.split(',').map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 5)
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function Notes() {
  const { token } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newNote, setNewNote] = useState({ title: '', content: '', tags: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', content: '', tags: '' })
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')

  const authHeader = { Authorization: `Bearer ${token}` }

  const fetchNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/notes`, { headers: authHeader })
      if (!res.ok) throw new Error()
      setNotes(await res.json())
    } catch {
      setError('No se pudieron cargar las notas')
    } finally {
      setLoading(false)
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchNotes() }, [fetchNotes])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newNote.title.trim()) return
    setError('')
    try {
      const res = await fetch(`${API}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ ...newNote, tags: parseTags(newNote.tags) })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al crear')
      }
      setNewNote({ title: '', content: '', tags: '' })
      fetchNotes()
    } catch (err) {
      setError(err.message)
    }
  }

  function startEdit(note) {
    setEditingId(note._id)
    setExpandedId(null)
    setEditForm({ title: note.title, content: note.content, tags: note.tags.join(', ') })
  }

  async function handleEditSave(id) {
    if (!editForm.title.trim()) return
    setError('')
    try {
      const res = await fetch(`${API}/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ ...editForm, tags: parseTags(editForm.tags) })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al guardar')
      }
      const updated = await res.json()
      setNotes(prev => prev.map(n => n._id === id ? updated : n))
      setEditingId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    setError('')
    try {
      const res = await fetch(`${API}/notes/${id}`, { method: 'DELETE', headers: authHeader })
      if (!res.ok) throw new Error('Error al eliminar')
      setNotes(prev => prev.filter(n => n._id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  // Filtrado local por búsqueda y tag activo
  const visibleNotes = notes.filter(n => {
    const matchSearch = search.trim() === '' || n.title.toLowerCase().includes(search.trim().toLowerCase())
    const matchTag    = activeTag === '' || n.tags.includes(activeTag)
    return matchSearch && matchTag
  })

  // Todas las tags únicas de todas las notas para el panel de filtros
  const allTags = [...new Set(notes.flatMap(n => n.tags))].sort()

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>📝 Notas</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>
        {notes.length === 0 ? 'Sin notas aún' : `${visibleNotes.length} de ${notes.length} nota${notes.length > 1 ? 's' : ''}`}
      </p>

      {/* Formulario de creación */}
      <form onSubmit={handleCreate} style={formStyle}>
        <input
          placeholder="Título de la nota"
          value={newNote.title}
          onChange={e => setNewNote({ ...newNote, title: e.target.value })}
          className="input-field"
          required
        />
        <textarea
          placeholder="Contenido (opcional)"
          value={newNote.content}
          onChange={e => setNewNote({ ...newNote, content: e.target.value })}
          rows={3}
          className="input-field"
          style={{ resize: 'vertical' }}
        />
        <div>
          <input
            placeholder="Etiquetas separadas por comas (ej: ideas, trabajo)"
            value={newNote.tags}
            onChange={e => setNewNote({ ...newNote, tags: e.target.value })}
            className="input-field"
          />
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Máximo 5 etiquetas · {Math.max(0, 5 - parseTags(newNote.tags).length)} restante{5 - parseTags(newNote.tags).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>+ Añadir nota</button>
      </form>

      {/* Barra de búsqueda */}
      <div style={{ marginBottom: 12 }}>
        <input
          placeholder="🔍 Buscar por título..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      {/* Filtro por etiquetas */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(prev => prev === tag ? '' : tag)}
              style={{
                ...tagStyle,
                cursor: 'pointer',
                background: activeTag === tag
                  ? 'color-mix(in srgb, var(--color-accent) 30%, transparent)'
                  : 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                fontWeight: activeTag === tag ? 700 : 500,
                border: activeTag === tag
                  ? '1px solid var(--color-accent)'
                  : '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)'
              }}
            >
              {tag}
            </button>
          ))}
          {activeTag && (
            <button
              onClick={() => setActiveTag('')}
              style={{ fontSize: 11, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
            >
              ✕ limpiar
            </button>
          )}
        </div>
      )}

      {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {loading && notes.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>Cargando...</p>
      )}

      {!loading && notes.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ fontSize: 40, margin: 0 }}>📄</p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 8 }}>Crea tu primera nota</p>
        </div>
      )}

      {!loading && notes.length > 0 && visibleNotes.length === 0 && (
        <div style={emptyStyle}>
          <p style={{ fontSize: 32, margin: 0 }}>🔍</p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 8 }}>Sin resultados para esa búsqueda</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visibleNotes.map(note => (
          <div key={note._id} style={cardStyle}>
            {editingId === note._id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <input
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="input-field"
                  autoFocus
                  placeholder="Título"
                />
                <textarea
                  value={editForm.content}
                  onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                  rows={4}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                  placeholder="Contenido"
                />
                <input
                  value={editForm.tags}
                  onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                  className="input-field"
                  placeholder="Etiquetas separadas por comas"
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleEditSave(note._id)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>Guardar</button>
                  <button onClick={() => setEditingId(null)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                {/* Cabecera clickable para expandir */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer', width: '100%' }}
                  onClick={() => toggleExpand(note._id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ fontSize: 15, display: 'block', marginBottom: 2 }}>{note.title}</strong>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{formatDate(note.updatedAt)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginLeft: 8, flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); startEdit(note) }}
                      className="btn btn-ghost"
                    >✏️</button>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(note._id) }}
                      className="btn btn-ghost"
                    >🗑️</button>
                  </div>
                </div>

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                    {note.tags.map(tag => (
                      <button
                        key={tag}
                        onClick={e => { e.stopPropagation(); setActiveTag(prev => prev === tag ? '' : tag) }}
                        style={{
                          ...tagStyle,
                          cursor: 'pointer',
                          background: activeTag === tag
                            ? 'color-mix(in srgb, var(--color-accent) 30%, transparent)'
                            : 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
                          border: activeTag === tag
                            ? '1px solid var(--color-accent)'
                            : '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)'
                        }}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* Contenido expandible */}
                {expandedId === note._id && note.content && (
                  <p style={{ marginTop: 10, fontSize: 14, color: 'var(--color-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', width: '100%' }}>
                    {note.content}
                  </p>
                )}
                {expandedId === note._id && !note.content && (
                  <p style={{ marginTop: 10, fontSize: 13, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sin contenido</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

const formStyle = {
  display: 'flex', flexDirection: 'column', gap: 10,
  marginBottom: 24, padding: '18px', borderRadius: 14,
  border: '1.5px solid var(--color-border)', background: 'var(--color-surface-2)'
}
const cardStyle = {
  display: 'flex', flexDirection: 'column',
  padding: '14px', borderRadius: 12,
  border: '1.5px solid var(--color-border)', background: 'var(--color-surface)',
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
}
const tagStyle = {
  display: 'inline-block', padding: '2px 10px', borderRadius: 20,
  fontSize: 11, fontWeight: 500,
  background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)',
  color: 'var(--color-text-secondary)',
  border: '1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)'
}
const emptyStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '48px 0', borderRadius: 14,
  border: '2px dashed var(--color-border)', background: 'var(--color-surface-2)'
}

