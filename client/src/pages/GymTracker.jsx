import { useState, useEffect, useCallback } from 'react'
import WorkoutChart from '../WorkoutChart'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

export default function GymTracker() {
  const { token } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [form, setForm] = useState({ exercise: '', sets: '', reps: '', weight: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const authHeader = { Authorization: `Bearer ${token}` }

  const fetchWorkouts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/workouts`, { headers: authHeader })
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setWorkouts(data)
    } catch {
      setError('No se pudieron cargar los entrenamientos')
    }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchWorkouts() }, [fetchWorkouts])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
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
    try {
      await fetch(`${API}/workouts/${id}`, { method: 'DELETE', headers: authHeader })
      fetchWorkouts()
    } catch {
      setError('Error al eliminar el ejercicio')
    }
  }

  const today = new Date().toDateString()
  const todayWorkouts = workouts.filter(w => new Date(w.date).toDateString() === today)

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>💪 Gym Tracker</h1>
      <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Registra tus series del día</p>

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
      {todayWorkouts.length === 0
        ? <p style={{ color: '#aaa', fontSize: 14 }}>Sin registros hoy. ¡A entrenar!</p>
        : todayWorkouts.map(w => (
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
