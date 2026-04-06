import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import WorkoutChart from '../WorkoutChart'
import { useAuth } from '../context/AuthContext'
import { API_URL as API } from '../config'

export default function GymTracker() {
  const { token } = useAuth()
  const [workouts, setWorkouts] = useState([])
  const [form, setForm] = useState({ exercise: '', sets: '', reps: '', weight: '', notes: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [routines, setRoutines] = useState([])
  const [activeRoutine, setActiveRoutine] = useState(null)
  // Records
  const [records, setRecords] = useState({})
  const [prBanner, setPrBanner] = useState('')
  const prTimerRef = useRef(null)
  // Comparativa semanal
  const [weeklySummary, setWeeklySummary] = useState([])
  const [showWeekly, setShowWeekly] = useState(false)
  const [showRecords, setShowRecords] = useState(false)
  // Edición inline
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ exercise: '', sets: '', reps: '', weight: '', notes: '' })

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  )

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

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`${API}/workouts/records`, { headers: authHeader })
      if (!res.ok) return
      const data = await res.json()
      const map = {}
      data.forEach(r => { map[r.exercise] = { weight: r.weight, date: r.date } })
      setRecords(map)
    } catch { /* silencioso — records son opcionales */ }
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchWorkouts()
    fetchRecords()
    fetch(`${API}/routines`)
      .then(r => r.json())
      .then(setRoutines)
      .catch(() => setError('No se pudieron cargar las rutinas'))
    return () => {
      if (prTimerRef.current) clearTimeout(prTimerRef.current)
    }
  }, [fetchWorkouts, fetchRecords])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const isNewPR = Number(form.weight) > 0 &&
      (!records[form.exercise] || Number(form.weight) > records[form.exercise].weight)
    try {
      const res = await fetch(`${API}/workouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(form)
      })
      if (!res.ok) throw new Error('Error al guardar')
      setForm({ exercise: '', sets: '', reps: '', weight: '', notes: '' })
      fetchWorkouts()
      if (isNewPR) {
        if (prTimerRef.current) clearTimeout(prTimerRef.current)
        setPrBanner(form.exercise)
        prTimerRef.current = setTimeout(() => setPrBanner(''), 4000)
        fetchRecords()
      }
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
      fetchRecords()
    } catch {
      setError('Error al eliminar el ejercicio')
    }
  }

  function startEdit(w) {
    setEditingId(w._id)
    setEditForm({ exercise: w.exercise, sets: String(w.sets), reps: String(w.reps), weight: String(w.weight), notes: w.notes || '' })
  }

  async function handleEditSave(id) {
    try {
      const res = await fetch(`${API}/workouts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(editForm)
      })
      if (!res.ok) throw new Error('Error al actualizar')
      setEditingId(null)
      fetchWorkouts()
      fetchRecords()
    } catch {
      setError('Error al actualizar el ejercicio')
    }
  }

  const today = new Date().toDateString()
  const todayWorkouts = workouts.filter(w => new Date(w.date).toDateString() === today)

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>💪 Gym Tracker</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>Registra tus series del día</p>

      {/* Banner nuevo PR */}
      {prBanner && (
        <div style={prBannerStyle}>
          🏆 ¡Nuevo récord personal en <strong>{prBanner}</strong>!
        </div>
      )}

      {/* Selector de plantillas */}
      {routines.length > 0 && (
        <div style={routineSectionStyle}>
          <p style={routineTitleStyle}>¿Qué entrenas hoy?</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: activeRoutine ? 14 : 0 }}>
            {routines.map(r => (
              <button
                key={r._id}
                type="button"
                onClick={() => setActiveRoutine(activeRoutine?._id === r._id ? null : r)}
                style={routineChipStyle(activeRoutine?._id === r._id)}
              >
                {ROUTINE_EMOJIS[r.name] || '🏋️'} {r.name}
              </button>
            ))}
          </div>
          {activeRoutine && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {activeRoutine.exercises.map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, exercise: ex }))}
                  style={exChipStyle}
                  title="Clic para cargar en el formulario"
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
          <div style={routineDividerStyle} />
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        <input
          placeholder="Ejercicio (ej: Press banca)"
          value={form.exercise}
          onChange={e => setForm({ ...form, exercise: e.target.value })}
          className="input-field"
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <input placeholder="Series" type="number" value={form.sets}
            onChange={e => setForm({ ...form, sets: e.target.value })} className="input-field" />
          <input placeholder="Reps" type="number" value={form.reps}
            onChange={e => setForm({ ...form, reps: e.target.value })} className="input-field" />
          <input placeholder="Kg" type="number" value={form.weight}
            onChange={e => setForm({ ...form, weight: e.target.value })} className="input-field" />
        </div>
        {form.exercise && records[form.exercise] && (
          <p style={{ fontSize: 12, color: 'var(--color-gold)', margin: 0 }}>
            🏆 Récord actual: <strong>{records[form.exercise].weight} kg</strong>
          </p>
        )}
        {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, margin: 0 }}>{error}</p>}
        <textarea
          placeholder="Notas de la sesión (opcional)"
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          rows={2}
          className="input-field"
          style={{ resize: 'vertical' }}
        />
        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
          {loading ? 'Guardando...' : '+ Registrar serie'}
        </button>
      </form>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Sesión de hoy</h2>
      {todayWorkouts.length === 0
        ? <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Sin registros hoy. ¡A entrenar!</p>
        : todayWorkouts.map(w => (
          <div key={w._id} style={cardStyle}>
            {editingId === w._id ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={editForm.exercise}
                  onChange={e => setEditForm({ ...editForm, exercise: e.target.value })}
                  className="input-field"
                  placeholder="Ejercicio"
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <input type="number" value={editForm.sets} placeholder="Series"
                    onChange={e => setEditForm({ ...editForm, sets: e.target.value })} className="input-field" />
                  <input type="number" value={editForm.reps} placeholder="Reps"
                    onChange={e => setEditForm({ ...editForm, reps: e.target.value })} className="input-field" />
                  <input type="number" value={editForm.weight} placeholder="Kg"
                    onChange={e => setEditForm({ ...editForm, weight: e.target.value })} className="input-field" />
                </div>
                <textarea
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Notas (opcional)"
                  rows={2}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleEditSave(w._id)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>Guardar</button>
                  <button onClick={() => setEditingId(null)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: 15 }}>{w.exercise}</strong>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {w.sets} series × {w.reps} reps — <strong>{w.weight} kg</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => startEdit(w)} className="btn btn-ghost">✏️</button>
                  <button onClick={() => handleDelete(w._id)} className="btn btn-ghost">✕</button>
                </div>
              </>
            )}
          </div>
        ))
      }

      {/* Sección: Mis Récords */}
      <div style={sectionStyle}>
        <button type="button" onClick={() => setShowRecords(v => !v)} style={sectionToggleStyle}>
          🏅 Mis récords <span style={{ color: 'var(--color-text-muted)', fontSize: 11, marginLeft: 4 }}>{showRecords ? '▲' : '▼'}</span>
        </button>
        {showRecords && (
          Object.keys(records).length === 0
            ? <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 10 }}>Sin registros aún</p>
            : <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Ejercicio</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Récord</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(records)
                    .sort((a, b) => b[1].weight - a[1].weight)
                    .map(([ex, r]) => (
                      <tr key={ex}>
                        <td style={tdStyle}>{ex}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{r.weight} kg</td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>
                          {new Date(r.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
        )}
      </div>

      {/* Sección: Comparativa semanal */}
      <div style={sectionStyle}>
        <button
          type="button"
          onClick={() => {
            const next = !showWeekly
            setShowWeekly(next)
            if (next && weeklySummary.length === 0) {
              fetch(`${API}/workouts/weekly-summary`, { headers: authHeader })
                .then(r => r.json())
                .then(setWeeklySummary)
                .catch(() => {})
            }
          }}
          style={sectionToggleStyle}
        >
          📊 Esta semana vs semana pasada <span style={{ color: 'var(--color-text-muted)', fontSize: 11, marginLeft: 4 }}>{showWeekly ? '▲' : '▼'}</span>
        </button>
        {showWeekly && (
          weeklySummary.filter(r => r.thisWeek != null && r.lastWeek != null).length === 0
            ? <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 10 }}>Necesitas datos de dos semanas para ver la comparativa</p>
            : <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Ejercicio</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Pasada</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Esta</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklySummary
                    .filter(r => r.thisWeek != null && r.lastWeek != null)
                    .map(row => {
                      const diff = row.thisWeek - row.lastWeek
                      const color = diff > 0 ? 'var(--color-success)' : diff < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)'
                      return (
                        <tr key={row.exercise}>
                          <td style={tdStyle}>{row.exercise}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-text-muted)' }}>{row.lastWeek} kg</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{row.thisWeek} kg</td>
                          <td style={{ ...tdStyle, textAlign: 'right', color, fontWeight: 700 }}>
                            {diff > 0 ? `↑ +${diff}` : diff < 0 ? `↓ ${diff}` : '='}
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
        )}
      </div>

      <WorkoutChart workouts={workouts} records={records} />
    </div>
  )
}

const cardStyle = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 14px', borderRadius: 10, border: '1.5px solid var(--color-border)',
  marginBottom: 8, background: 'var(--color-surface-2)',
  transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
}
const prBannerStyle = {
  background: 'var(--color-gold-bg)', border: '1px solid var(--color-gold-border)', borderRadius: 10,
  padding: '10px 14px', fontSize: 14, color: 'var(--color-gold-text)',
  marginBottom: 20, fontWeight: 500
}
const sectionStyle = {
  marginTop: 24, borderTop: '1px solid var(--color-border)', paddingTop: 16
}
const sectionToggleStyle = {
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center'
}
const tableStyle = {
  width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 12
}
const thStyle = {
  textAlign: 'left', padding: '6px 8px', color: 'var(--color-text-muted)',
  fontWeight: 600, fontSize: 11, textTransform: 'uppercase',
  borderBottom: '1px solid var(--color-border)'
}
const tdStyle = {
  padding: '8px 8px', borderBottom: '1px solid var(--color-border-light)'
}
const ROUTINE_EMOJIS = { 'Push': '💪', 'Pull': '🏋️', 'Legs': '🦵', 'Full Body': '🔥' }
const routineSectionStyle = {
  background: 'var(--color-routine-bg)', borderRadius: 14, padding: '16px 16px 4px',
  marginBottom: 24, border: '1px solid var(--color-routine-border)'
}
const routineTitleStyle = {
  fontSize: 13, color: 'var(--color-routine-title)', margin: '0 0 12px', fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.06em'
}
const routineChipStyle = (active) => ({
  padding: '10px 20px', borderRadius: 22, fontSize: 14, cursor: 'pointer',
  fontWeight: active ? 700 : 500, transition: 'all 0.15s ease',
  background: active ? 'var(--color-gold)' : 'var(--color-routine-chip-bg)',
  color: active ? '#111' : 'var(--color-routine-chip-text)',
  border: active ? '2px solid var(--color-gold)' : '2px solid var(--color-routine-chip-border)'
})
const exChipStyle = {
  padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
  background: 'var(--color-routine-ex-bg)', color: 'var(--color-routine-ex-text)',
  border: '1px solid var(--color-routine-ex-border)'
}
const routineDividerStyle = {
  height: 1, background: 'var(--color-routine-divider)', margin: '16px -16px 0'
}
