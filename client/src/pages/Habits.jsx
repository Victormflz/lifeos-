import { useState, useEffect, useCallback, useRef } from 'react'

import { API_URL as API, authHeaders } from '../config'
import { exportToCsv } from '../utils/exportCsv'

const EMOJIS = ['⭐', '💧', '📚', '🏃', '🧘', '🥗', '😴', '💊', '🧹', '✍️']

const MOTIVATIONAL_PHRASES = [
  '¡Los grandes hábitos se construyen un día a la vez! 💪',
  '¡Hoy es el mejor momento para volver a empezar! 🚀',
  '¡Cada día es una nueva oportunidad para ser mejor! ✨',
  '¡No importa cuántas veces caigas, lo que importa es que te levantes! 🦅',
  '¡El progreso no siempre es lineal — sigue adelante! 🌱',
  '¡Un pequeño paso hoy es un gran salto mañana! 🎯',
  '¡La constancia vence al talento! 🔑',
  '¡Recuerda por qué empezaste, esa razón sigue ahí! 🌟',
  '¡Las rachas se rompen, pero los campeones las reconstruyen! 🏆',
  '¡Hoy empieza tu nueva racha más larga! ⚡',
]

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
      if (sorted.includes(dateStr)) { streak++ }
      else if (i > 0) break
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }

  if (frequency === 'weekly') {
    const getMonday = date => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = day === 0 ? -6 : 1 - day
      d.setDate(d.getDate() + diff)
      d.setHours(0, 0, 0, 0)
      return d
    }
    const completedWeeks = new Set(
      completions.map(dateStr => getMonday(new Date(dateStr)).toISOString().split('T')[0])
    )
    let streak = 0
    const cursorWeek = getMonday(today)
    for (let i = 0; i < 52; i++) {
      const weekKey = cursorWeek.toISOString().split('T')[0]
      if (completedWeeks.has(weekKey)) streak++
      else if (i > 0) break
      cursorWeek.setDate(cursorWeek.getDate() - 7)
    }
    return streak
  }
  return 0
}

function getBestStreak(completions) {
  if (!completions || completions.length === 0) return 0
  const sorted = [...completions].sort()
  if (sorted.length === 1) return 1
  let best = 1, current = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T12:00:00')
    const curr = new Date(sorted[i] + 'T12:00:00')
    const diff = Math.round((curr - prev) / 86400000)
    if (diff === 1) { current++; if (current > best) best = current }
    else current = 1
  }
  return best
}

function getLast30Days() {
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function getMonthRate(completions) {
  const now = new Date()
  const dayOfMonth = now.getDate()
  const monthStr = now.toISOString().slice(0, 7)
  const done = completions.filter(c => c.startsWith(monthStr)).length
  return Math.round((done / dayOfMonth) * 100)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HabitCalendar({ completions }) {
  const days = getLast30Days()
  return (
    <div>
      <p style={{ margin: '10px 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>
        ÚLTIMOS 30 DÍAS
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {days.map(day => (
          <div
            key={day}
            title={day}
            style={{
              width: 13,
              height: 13,
              borderRadius: 3,
              background: completions.includes(day) ? 'var(--color-accent)' : 'var(--color-border)',
              opacity: completions.includes(day) ? 1 : 0.45,
            }}
          />
        ))}
      </div>
    </div>
  )
}

function MotivationalToast({ message, habitNames, onDismiss }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: 96,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'var(--color-surface)',
      border: '2px solid var(--color-accent)',
      borderRadius: 18,
      padding: '16px 18px',
      maxWidth: 340,
      width: 'calc(100% - 32px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
      zIndex: 1000,
    }}>
      <p style={{ margin: '0 0 3px', fontSize: 12, color: 'var(--color-text-muted)' }}>
        Racha reiniciada en{' '}
        {habitNames.length === 1 ? habitNames[0] : `${habitNames.length} hábitos`}
      </p>
      <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: 1.45 }}>
        {message}
      </p>
      <button onClick={onDismiss} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
        ¡A por la nueva racha! 💪
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Habits() {
  const [habits,     setHabits]     = useState([])
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState({ name: '', emoji: '⭐', frequency: 'daily' })
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [editingId,  setEditingId]  = useState(null)
  const [editForm,   setEditForm]   = useState({ name: '', emoji: '⭐', frequency: 'daily' })
  const [expandedId, setExpandedId] = useState(null)
  const [toast,      setToast]      = useState(null)
  const toastShownRef = useRef(false)

  const today = new Date().toISOString().split('T')[0]

  const twoWeeksAgoStr = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d.toISOString().split('T')[0]
  })()

  const fetchHabits = useCallback(async () => {
    try {
      const res = await fetch(`${API}/habits`, { headers: authHeaders() })
      if (!res.ok) throw new Error()
      setHabits(await res.json())
    } catch {
      setError('No se pudieron cargar los hábitos')
    }
  }, [])

  useEffect(() => { fetchHabits() }, [fetchHabits])

  // Show motivational toast once per session when broken streaks are detected
  useEffect(() => {
    if (habits.length === 0 || toastShownRef.current) return
    const broken = habits.filter(h =>
      h.frequency === 'daily' &&
      h.completions.length > 0 &&
      getStreak(h.completions, 'daily') === 0 &&
      h.completions.some(c => c >= twoWeeksAgoStr)
    )
    if (broken.length > 0) {
      const phrase = MOTIVATIONAL_PHRASES[Math.floor(Math.random() * MOTIVATIONAL_PHRASES.length)]
      setToast({ message: phrase, habitNames: broken.map(h => `${h.emoji} ${h.name}`) })
      toastShownRef.current = true
    }
  }, [habits, twoWeeksAgoStr])

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/habits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(form),
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
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ date: today }),
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
      await fetch(`${API}/habits/${id}`, { method: 'DELETE', headers: authHeaders() })
      setHabits(prev => prev.filter(h => h._id !== id))
      if (expandedId === id) setExpandedId(null)
    } catch {
      setError('Error al eliminar el hábito')
    }
  }

  function startEditHabit(habit) {
    setEditingId(habit._id)
    setExpandedId(null)
    setEditForm({ name: habit.name, emoji: habit.emoji, frequency: habit.frequency })
  }

  async function handleEditHabitSave(id) {
    if (!editForm.name.trim()) return
    try {
      const res = await fetch(`${API}/habits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setHabits(prev => prev.map(h => h._id === id ? updated : h))
      setEditingId(null)
    } catch {
      setError('Error al actualizar el hábito')
    }
  }

  function handleExport() {
    const rows = habits.map(h => ({
      nombre:            h.name,
      emoji:             h.emoji,
      frecuencia:        h.frequency,
      racha_actual:      getStreak(h.completions, h.frequency),
      racha_maxima:      getBestStreak(h.completions),
      total_completados: h.completions.length,
      ultima_vez:        h.completions.sort((a, b) => (a > b ? -1 : 1))[0] || '',
    }))
    exportToCsv(rows, `habitos_lifeos_${today}`)
  }

  const completed = habits.filter(h => h.completions.includes(today)).length
  const progressPct = habits.length > 0 ? Math.round((completed / habits.length) * 100) : 0

  return (
    <div>
      {/* Motivational toast */}
      {toast && (
        <MotivationalToast
          message={toast.message}
          habitNames={toast.habitNames}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Header */}
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

      {/* Daily progress bar */}
      {habits.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: 0 }}>
              {completed} / {habits.length} completados hoy
            </p>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              color: progressPct === 100 ? '#10b981' : 'var(--color-text-muted)',
            }}>
              {progressPct === 100 ? '¡Todo listo! 🎉' : `${progressPct}%`}
            </span>
          </div>
          <div style={{ height: 7, background: 'var(--color-border)', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: progressPct === 100 ? '#10b981' : 'var(--color-accent)',
              borderRadius: 6,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {habits.length === 0 && (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 20 }}>Sin hábitos aún</p>
      )}

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} style={formStyle}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            {EMOJIS.map(em => (
              <button
                key={em}
                type="button"
                onClick={() => setForm({ ...form, emoji: em })}
                style={{
                  fontSize: 22,
                  background: form.emoji === em ? 'var(--color-surface-2)' : 'none',
                  border: form.emoji === em ? '2px solid var(--color-accent)' : '2px solid transparent',
                  borderRadius: 8,
                  cursor: 'pointer',
                  padding: 4,
                }}
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
          <select
            value={form.frequency}
            onChange={e => setForm({ ...form, frequency: e.target.value })}
            className="input-field"
          >
            <option value="daily">Diario</option>
            <option value="weekly">Semanal</option>
          </select>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
            {loading ? 'Guardando...' : 'Crear hábito'}
          </button>
        </form>
      )}

      {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {/* Empty state */}
      {habits.length === 0 && !showForm && (
        <div style={emptyStyle}>
          <p style={{ fontSize: 40, margin: 0 }}>🌱</p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 8 }}>
            Crea tu primer hábito para empezar
          </p>
        </div>
      )}

      {/* Habit list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {habits.map(habit => {
          const done       = habit.completions.includes(today)
          const streak     = getStreak(habit.completions, habit.frequency)
          const best       = getBestStreak(habit.completions)
          const monthRate  = getMonthRate(habit.completions)
          const isExpanded = expandedId === habit._id
          const isEditing  = editingId  === habit._id
          const brokeStreak = habit.completions.length > 0 && streak === 0

          return (
            <div
              key={habit._id}
              style={{
                ...cardStyle,
                borderColor: isExpanded ? 'var(--color-accent)' : 'var(--color-border)',
              }}
            >
              {isEditing ? (
                // ── Edit mode ──────────────────────────────────────────
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    {EMOJIS.map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, emoji: em })}
                        style={{
                          fontSize: 20,
                          background: editForm.emoji === em ? 'var(--color-surface-2)' : 'none',
                          border: editForm.emoji === em ? '2px solid var(--color-accent)' : '2px solid transparent',
                          borderRadius: 8,
                          cursor: 'pointer',
                          padding: 3,
                        }}
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
                  >
                    <option value="daily">Diario</option>
                    <option value="weekly">Semanal</option>
                  </select>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleEditHabitSave(habit._id)} className="btn btn-primary btn-sm" style={{ flex: 1 }}>Guardar</button>
                    <button onClick={() => setEditingId(null)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* ── Main row ─────────────────────────────────────── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Check button */}
                    <button
                      onClick={() => handleToggle(habit._id)}
                      style={checkStyle(done)}
                      aria-label={done ? 'Desmarcar' : 'Completar hábito'}
                    >
                      {done ? '✓' : ''}
                    </button>

                    {/* Name + metadata — tap to expand */}
                    <div
                      style={{ flex: 1, cursor: 'pointer', minWidth: 0 }}
                      onClick={() => setExpandedId(prev => prev === habit._id ? null : habit._id)}
                    >
                      <span style={{
                        fontSize: 15,
                        fontWeight: 500,
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textDecoration: done ? 'line-through' : 'none',
                        color: done ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      }}>
                        {habit.emoji} {habit.name}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {habit.frequency === 'daily' ? 'Diario' : 'Semanal'}
                        </span>
                        {streak > 0 && (
                          <span style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: streak >= 7 ? '#f59e0b' : 'var(--color-text-secondary)',
                            background: streak >= 7 ? 'rgba(245,158,11,0.13)' : 'transparent',
                            padding: streak >= 7 ? '1px 7px' : '0',
                            borderRadius: 20,
                          }}>
                            🔥 {streak} {habit.frequency === 'weekly' ? 'sem' : 'd'}
                          </span>
                        )}
                        {brokeStreak && (
                          <span style={{ fontSize: 11, color: 'var(--color-danger)', opacity: 0.75 }}>
                            racha perdida
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Edit / Delete */}
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                      <button onClick={() => startEditHabit(habit)} className="btn btn-ghost">✏️</button>
                      <button onClick={() => handleDelete(habit._id)} className="btn btn-ghost">✕</button>
                    </div>
                  </div>

                  {/* ── Expanded detail ───────────────────────────────── */}
                  {isExpanded && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: 8, marginBottom: 2 }}>
                        <div style={statBoxStyle}>
                          <span style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: streak > 0 ? '#f59e0b' : 'var(--color-text-muted)',
                          }}>
                            {streak > 0 ? `🔥 ${streak}` : '—'}
                          </span>
                          <span style={statLabelStyle}>RACHA ACTUAL</span>
                        </div>
                        <div style={statBoxStyle}>
                          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            🏆 {best}
                          </span>
                          <span style={statLabelStyle}>MEJOR RACHA</span>
                        </div>
                        <div style={statBoxStyle}>
                          <span style={{
                            fontSize: 17,
                            fontWeight: 700,
                            color: monthRate >= 80 ? '#10b981' : monthRate >= 50 ? '#f59e0b' : '#ef4444',
                          }}>
                            {monthRate}%
                          </span>
                          <span style={statLabelStyle}>ESTE MES</span>
                        </div>
                      </div>

                      {/* 30-day dot calendar */}
                      <HabitCalendar completions={habit.completions} />

                      {/* Streak progress toward next milestone */}
                      {streak > 0 && (() => {
                        const milestones = [7, 14, 21, 30, 60, 90, 180, 365]
                        const next = milestones.find(m => m > streak) || streak + 1
                        const prev = milestones.filter(m => m <= streak).pop() || 0
                        const pct = Math.round(((streak - prev) / (next - prev)) * 100)
                        return (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                Próximo hito: {next} días
                              </span>
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                {next - streak} días más
                              </span>
                            </div>
                            <div style={{ height: 5, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: '#f59e0b',
                                borderRadius: 4,
                                transition: 'width 0.4s ease',
                              }} />
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const formStyle = {
  display: 'flex', flexDirection: 'column', gap: 10,
  marginBottom: 20, padding: '16px', borderRadius: 14,
  border: '1.5px solid var(--color-border)', background: 'var(--color-surface-2)',
}
const cardStyle = {
  display: 'flex',
  flexDirection: 'column',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-surface)',
  transition: 'border-color 0.2s ease',
}
const checkStyle = done => ({
  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
  border: `2px solid ${done ? 'var(--color-accent)' : 'var(--color-border)'}`,
  background: done ? 'var(--color-accent)' : 'transparent',
  color: 'var(--color-accent-text)', fontSize: 14, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
})
const emptyStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', padding: '48px 0', borderRadius: 12,
  border: '2px dashed var(--color-border)', background: 'var(--color-surface-2)',
}
const statBoxStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  padding: '8px 4px',
  background: 'var(--color-surface-2)',
  borderRadius: 10,
  border: '1px solid var(--color-border)',
}
const statLabelStyle = {
  fontSize: 9,
  fontWeight: 700,
  color: 'var(--color-text-muted)',
  letterSpacing: '0.06em',
}
