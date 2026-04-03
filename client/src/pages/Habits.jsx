import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

const EMOJIS = ['⭐', '💧', '📚', '🏃', '🧘', '🥗', '😴', '💊', '🧹', '✍️']

function getStreak(completions) {
  if (!completions.length) return 0
  const sorted = [...completions].sort().reverse()
  const today = new Date().toISOString().split('T')[0]
  let streak = 0
  let cursor = new Date(today)

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

export default function Habits() {
  const { token } = useAuth()
  const [habits, setHabits] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', emoji: '⭐', frequency: 'daily' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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

  const completed = habits.filter(h => h.completions.includes(today)).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>✅ Hábitos</h1>
        <button onClick={() => setShowForm(v => !v)} style={addBtnStyle}>
          {showForm ? '✕' : '+ Nuevo'}
        </button>
      </div>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>
        {habits.length === 0 ? 'Sin hábitos aún' : `${completed} / ${habits.length} completados hoy`}
      </p>

      {showForm && (
        <form onSubmit={handleCreate} style={formStyle}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {EMOJIS.map(em => (
              <button
                key={em} type="button"
                onClick={() => setForm({ ...form, emoji: em })}
                style={{ fontSize: 22, background: form.emoji === em ? '#f0f0f0' : 'none', border: form.emoji === em ? '2px solid #18181b' : '2px solid transparent', borderRadius: 8, cursor: 'pointer', padding: 4 }}
              >
                {em}
              </button>
            ))}
          </div>
          <input
            placeholder="Nombre del hábito (ej: Beber 2L de agua)"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            style={inputStyle}
            required
          />
          <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} style={inputStyle}>
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
          </select>
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Guardando...' : 'Crear hábito'}
          </button>
        </form>
      )}

      {error && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {habits.length === 0 && !showForm && (
        <div style={emptyStyle}>
          <p style={{ fontSize: 40, margin: 0 }}>🌱</p>
          <p style={{ color: '#888', fontSize: 14, marginTop: 8 }}>Crea tu primer hábito para empezar</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {habits.map(habit => {
          const done = habit.completions.includes(today)
          const streak = getStreak(habit.completions)
          return (
            <div key={habit._id} style={{ ...cardStyle, opacity: done ? 0.75 : 1 }}>
              <button onClick={() => handleToggle(habit._id)} style={checkStyle(done)}>
                {done ? '✓' : ''}
              </button>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 15, fontWeight: 500, textDecoration: done ? 'line-through' : 'none', color: done ? '#aaa' : '#18181b' }}>
                  {habit.emoji} {habit.name}
                </span>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#aaa' }}>
                  {habit.frequency === 'daily' ? 'Diario' : 'Semanal'}
                  {streak > 0 && ` · 🔥 ${streak} día${streak > 1 ? 's' : ''}`}
                </p>
              </div>
              <button onClick={() => handleDelete(habit._id)} style={deleteStyle}>✕</button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const formStyle = {
  display: 'flex', flexDirection: 'column', gap: 10,
  marginBottom: 24, padding: '16px', borderRadius: 12,
  border: '1px solid #eee', background: '#fafafa'
}
const inputStyle = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd',
  fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box'
}
const buttonStyle = {
  padding: '11px', borderRadius: 8, background: '#18181b', color: '#fff',
  border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 500
}
const addBtnStyle = {
  padding: '7px 14px', borderRadius: 8, background: '#18181b', color: '#fff',
  border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 500
}
const cardStyle = {
  display: 'flex', alignItems: 'center', gap: 12,
  padding: '12px 14px', borderRadius: 10, border: '1px solid #eee', background: '#fff'
}
const checkStyle = (done) => ({
  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
  border: `2px solid ${done ? '#18181b' : '#ddd'}`,
  background: done ? '#18181b' : 'transparent',
  color: '#fff', fontSize: 14, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s'
})
const deleteStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#ccc', fontSize: 16, padding: 4, flexShrink: 0
}
const emptyStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '48px 0', borderRadius: 12,
  border: '2px dashed #eee', background: '#fafafa'
}

