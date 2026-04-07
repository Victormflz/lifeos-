import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { API_URL as API } from '../config'
import { exportToCsv } from '../utils/exportCsv'

const EMOJIS = ['⭐', '💧', '📚', '🏃', '🧘', '🥗', '😴', '💊', '🧹', '✍️']

function getStreak(completions, frequency = 'daily') {
  if (!completions || completions.length === 0) return 0

  const sorted = [...completions].sort((a, b) => (a > b ? -1 : 1))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (frequency === 'daily') {
    let streak = 0
    const cursor = new Date(today)

    for (let i = 0; i < 365; i++) {
      const dateStr = cursor.toISOString().split('T')[0]
      if (sorted.includes(dateStr)) {
        streak++
      } else if (i > 0) {
        break
      }
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }

  if (frequency === 'weekly') {
    const getMonday = (date) => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff)
      d.setHours(0, 0, 0, 0)
      return d
    }

    const completedWeeks = new Set(
      completions.map(dateStr => {
        const monday = getMonday(new Date(dateStr))
        return monday.toISOString().split('T')[0]
      })
    )

    let streak = 0
    const cursorWeek = getMonday(today)

    for (let i = 0; i < 52; i++) {
      const weekKey = cursorWeek.toISOString().split('T')[0]
      if (completedWeeks.has(weekKey)) {
        streak++
      } else if (i > 0) {
        break
      }
      cursorWeek.setDate(cursorWeek.getDate() - 7)
    }
    return streak
  }

  return 0
}

export default function Habits() {
  const { token } = useAuth()
  const [habits, setHabits] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', emoji: '⭐', frequency: 'daily' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', emoji: '⭐', frequency: 'daily' })

  const authHeader = { Authorization: `Bearer ${token}` }
  const today = new Date().toISOString().split('T')[0]

  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch(`${API}/habits`, { headers: authHeader })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setHabits(data)
    } catch {
      setError('No se pudieron cargar los hábitos')
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchHabits() }, [fetchHabits])

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error()
      setForm({ name: '', emoji: '⭐', frequency: 'daily' })
      setShowForm(false)
      fetchHabits()
    } catch {
      setError('Error al crear el hábito')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(id) {
    try {
      const res = await fetch(`${API}/habits/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ date: today })
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setHabits(prev => prev.map(h => h._id === id ? updated : h))
    } catch {
      setError('Error al actualizar el hábito')
    }
  }

  async function handleDelete(id) {
    try {
      await fetch(`${API}/habits/${id}`, { method: 'DELETE', headers: authHeader })
      setHabits(prev => prev.filter(h => h._id !== id))
    } catch {
      setError('Error al eliminar el hábito')
    }
  }

  function startEditHabit(habit) {
    setEditingId(habit._id)
    setEditForm({ name: habit.name, emoji: habit.emoji, frequency: habit.frequency })
  }

  async function handleEditHabitSave(id) {
    if (!editForm.name.trim()) return
    try {
      const res = await fetch(`${API}/habits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(editForm)
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setHabits(prev => prev.map(h => h._id === id ? updated : h))
      setEditingId(null)
    } catch {
      setError('Error al actualizar el hábito')
    }
  }

  const completed = habits.filter(h => h.completions.includes(today)).length

  function handleExport() {
    const rows = habits.map(h => ({
      nombre:       h.name,
      emoji:        h.emoji,
      frecuencia:   h.frequency,
      racha_actual: getStreak(h.completions, h.frequency),
      total_completados: h.completions.length,
      ultima_vez:   h.completions.sort((a, b) => (a > b ? -1 : 1))[0] || '',
    }))
    exportToCsv(rows, `habitos_lifeos_${today}`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>✅ Hábitos</h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {habits.length > 0 && (
            <button onClick={handleExport} className="btn btn-secondary btn-sm" title="Exportar CSV">⬇️ CSV</button>
          )}
          <button onClick={() => setShowForm(v => !v)} className="btn btn-primary btn-sm">
            {showForm ? '✕' : '+ Nuevo'}
          </button>
        </div>
      </div>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>
        {habits.length === 0 ? 'Sin hábitos aún' : `${completed} / ${habits.length} completados hoy`}
      </p>

      {showForm && (
        <form onSubmit={handleCreate} style={formStyle}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {EMOJIS.map(em => (
              <button
                key={em} type="button"
                onClick={() => setForm({ ...form, emoji: em })}
                style={{ fontSize: 22, background: form.emoji === em ? 'var(--color-surface-2)' : 'none', border: form.emoji === em ? '2px solid var(--color-accent)' : '2px solid transparent', borderRadius: 8, cursor: 'pointer', padding: 4 }}
              >
                {em}
              </button>
            ))}
          </div>
          <input
            placeholder="Nombre del hábito (ej: Beber 2L de agua)"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="input-field"
            required
          />
          <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="input-field">
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
          </select>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
            {loading ? 'Guardando...' : 'Crear hábito'}
          </button>
        </form>
      )}

      {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {habits.length === 0 && !showForm && (
        <div style={emptyStyle}>
          <p style={{ fontSize: 40, margin: 0 }}>🌱</p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 8 }}>Crea tu primer hábito para empezar</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.map(habit => {
          const done = habit.completions.includes(today)
          const streak = getStreak(habit.completions, habit.frequency)
          return (
            <div key={habit._id} style={{ ...cardStyle, opacity: done ? 0.75 : 1, flexDirection: editingId === habit._id ? 'column' : 'row', alignItems: editingId === habit._id ? 'stretch' : 'center' }}>
              {editingId === habit._id ? (
                <>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {EMOJIS.map(em => (
                      <button
                        key={em} type="button"
                        onClick={() => setEditForm({ ...editForm, emoji: em })}
                        style={{ fontSize: 20, background: editForm.emoji === em ? 'var(--color-surface-2)' : 'none', border: editForm.emoji === em ? '2px solid var(--color-accent)' : '2px solid transparent', borderRadius: 8, cursor: 'pointer', padding: 3 }}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                  <input
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    className="input-field"
                    autoFocus
                  />
                  <select
                    value={editForm.frequency}
                    onChange={e => setEditForm({ ...editForm, frequency: e.target.value })}
                    className="input-field"
                    style={{ marginTop: 6 }}
                  >
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                  </select>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={() => handleEditHabitSave(habit._id)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>Guardar</button>
                    <button onClick={() => setEditingId(null)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => handleToggle(habit._id)} style={checkStyle(done)}>
                    {done ? '✓' : ''}
                  </button>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--color-text-muted)' : 'var(--color-text-primary)' }}>
                      {habit.emoji} {habit.name}
                    </span>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {habit.frequency === 'daily' ? 'Diario' : 'Semanal'}
                      {streak > 0 && ` · 🔥 ${streak} ${habit.frequency === 'weekly' ? `sem${streak > 1 ? '.' : '.'}` : `día${streak > 1 ? 's' : ''}`}`}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <button onClick={() => startEditHabit(habit)} className="btn btn-ghost">✏️</button>
                    <button onClick={() => handleDelete(habit._id)} className="btn btn-ghost">✕</button>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const formStyle = {
  display: 'flex', flexDirection: 'column', gap: 10,
  marginBottom: 24, padding: '16px', borderRadius: 14,
  border: '1.5px solid var(--color-border)', background: 'var(--color-surface-2)'
}
const cardStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--color-border)',
  background: 'var(--color-surface)',
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
}
const checkStyle = (done) => ({
  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
  border: `2px solid ${done ? 'var(--color-accent)' : 'var(--color-border)'}`,
  background: done ? 'var(--color-accent)' : 'transparent',
  color: 'var(--color-accent-text)', fontSize: 14, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s'
})
const emptyStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '48px 0', borderRadius: 12,
  border: '2px dashed var(--color-border)', background: 'var(--color-surface-2)'
}

