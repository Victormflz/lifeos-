import { useState, useEffect } from 'react'
import WorkoutChart from './WorkoutChart'

const API = 'https://lifeos-production-08cb.up.railway.app/api'

export default function App() {
  const [workouts, setWorkouts] = useState([])
  const [form, setForm] = useState({ exercise: '', sets: '', reps: '', weight: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchWorkouts() }, [])

  async function fetchWorkouts() {
    const res = await fetch(`${API}/workouts`)
    const data = await res.json()
    setWorkouts(data)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Error al guardar')
      setForm({ exercise: '', sets: '', reps: '', weight: '' })
      fetchWorkouts()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    await fetch(`${API}/workouts/${id}`, { method: 'DELETE' })
    fetchWorkouts()
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>💪 Gym Tracker</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>LifeOS Personal</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        <input
          placeholder="Ejercicio (ej: Press banca)"
          value={form.exercise}
          onChange={e => setForm({ ...form, exercise: e.target.value })}
          style={inputStyle}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input placeholder="Series" type="number" value={form.sets}
            onChange={e => setForm({ ...form, sets: e.target.value })} style={inputStyle} />
          <input placeholder="Reps" type="number" value={form.reps}
            onChange={e => setForm({ ...form, reps: e.target.value })} style={inputStyle} />
          <input placeholder="Kg" type="number" value={form.weight}
            onChange={e => setForm({ ...form, weight: e.target.value })} style={inputStyle} />
        </div>
        {error && <p style={{ color: 'red', fontSize: 13, margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? 'Guardando...' : '+ Registrar serie'}
        </button>
      </form>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Sesión de hoy</h2>
      {workouts.length === 0
        ? <p style={{ color: '#aaa', fontSize: 14 }}>Sin registros aún. ¡A entrenar!</p>
        : workouts.map(w => (
          <div key={w._id} style={cardStyle}>
            <div>
              <strong style={{ fontSize: 15 }}>{w.exercise}</strong>
              <p style={{ margin: '2px 0 0', fontSize: 13, color: '#666' }}>
                {w.sets} series × {w.reps} reps — <strong>{w.weight} kg</strong>
              </p>
            </div>
            <button onClick={() => handleDelete(w._id)} style={deleteStyle}>✕</button>
          </div>
        ))
      }

      <WorkoutChart workouts={workouts} />

    </div>
  )
}

const inputStyle = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd',
  fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box'
}
const buttonStyle = {
  padding: '11px', borderRadius: 8, background: '#18181b', color: '#fff',
  border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 500
}
const cardStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 14px', borderRadius: 8, border: '1px solid #eee',
  marginBottom: 8, background: '#fafafa'
}
const deleteStyle = {
  background: 'none', border: 'none', cursor: 'pointer',
  color: '#aaa', fontSize: 16, padding: 4
}