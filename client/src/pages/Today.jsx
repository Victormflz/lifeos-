import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL as API } from '../config'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días 👋'
  if (hour < 19) return 'Buenas tardes 👋'
  return 'Buenas noches 👋'
}

function getTodayLabel() {
  const str = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  }).format(new Date())
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const SLEEP_QUALITY = { 1: '😴', 2: '😪', 3: '😐', 4: '😊', 5: '🌟' }

function sleepHoursColor(h) {
  if (h < 6) return '#ef4444'
  if (h < 7) return '#f59e0b'
  return '#10b981'
}

export default function Today() {
  const { token } = useAuth()

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  )

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])

  const yesterdayStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().split('T')[0]
  }, [])

  // ── Habits ──────────────────────────────────────────────────────────────
  const [habits, setHabits]               = useState([])
  const [habitsLoading, setHabitsLoading] = useState(true)

  const fetchHabits = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/habits`, { headers: authHeader })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setHabits(data.filter(h => !h.frequency || h.frequency === 'daily'))
    } catch {
      // silencioso — la UI muestra estado vacío
    } finally {
      setHabitsLoading(false)
    }
  }, [authHeader])

  async function toggleHabit(id) {
    try {
      const res = await fetch(`${API}/habits/${id}/toggle`, {
        method:  'PATCH',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: todayStr }),
      })
      if (!res.ok) return
      const updated = await res.json()
      setHabits(prev => prev.map(h => h._id === id ? updated : h))
    } catch { /* silencioso */ }
  }

  const dailyDone = habits.filter(h => h.completions?.includes(todayStr)).length

  // ── Workouts ─────────────────────────────────────────────────────────────
  const [workoutCount,    setWorkoutCount]    = useState(null)
  const [workoutsLoading, setWorkoutsLoading] = useState(true)

  const fetchWorkouts = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/workouts?date=${todayStr}`, { headers: authHeader })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setWorkoutCount(data.length)
    } catch {
      setWorkoutCount(0)
    } finally {
      setWorkoutsLoading(false)
    }
  }, [authHeader, todayStr])

  // ── Sleep ─────────────────────────────────────────────────────────────────
  const [lastSleep,    setLastSleep]    = useState(null)
  const [sleepLoading, setSleepLoading] = useState(true)

  const fetchSleep = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/sleep/week`, { headers: authHeader })
      if (!res.ok) throw new Error()
      const data = await res.json()
      const found = data.find(r => r.date === todayStr || r.date === yesterdayStr)
      setLastSleep(found || null)
    } catch {
      // silencioso
    } finally {
      setSleepLoading(false)
    }
  }, [authHeader, todayStr, yesterdayStr])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchHabits()
    fetchWorkouts()
    fetchSleep()
  }, [fetchHabits, fetchWorkouts, fetchSleep])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header style={styles.header}>
        <p style={styles.greeting}>{getGreeting()}</p>
        <h1 style={styles.date}>{getTodayLabel()}</h1>
      </header>

      {/* ── Hábitos de hoy ──────────────────────────────────────────── */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Hábitos de hoy</h2>
          <Link to="/habits" style={styles.link}>Ver todos →</Link>
        </div>

        {habitsLoading ? (
          <p style={styles.muted}>Cargando…</p>
        ) : habits.length === 0 ? (
          <p style={styles.muted}>Sin hábitos diarios configurados</p>
        ) : (
          <>
            <p style={styles.counter}>
              {dailyDone} / {habits.length} completados
            </p>
            <ul style={styles.list}>
              {habits.map(habit => {
                const done = habit.completions?.includes(todayStr) ?? false
                return (
                  <li key={habit._id}>
                    <label style={styles.habitLabel}>
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleHabit(habit._id)}
                        style={styles.checkbox}
                      />
                      <span style={{
                        opacity:        done ? 0.45 : 1,
                        textDecoration: done ? 'line-through' : 'none',
                        transition:     'opacity 0.15s',
                      }}>
                        {habit.emoji} {habit.name}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      {/* ── Sueño de anoche ─────────────────────────────────────────── */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Sueño de anoche</h2>
          {lastSleep && <Link to="/sleep" style={styles.link}>Ver →</Link>}
        </div>

        {sleepLoading ? (
          <p style={styles.muted}>Cargando…</p>
        ) : lastSleep ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              fontSize:   28,
              fontWeight: 700,
              lineHeight: 1,
              color:      sleepHoursColor(lastSleep.hoursTotal),
            }}>
              {lastSleep.hoursTotal}h
            </span>
            <span style={{ fontSize: '1.3rem' }}>{SLEEP_QUALITY[lastSleep.quality]}</span>
            <span style={styles.muted}>
              {lastSleep.date === todayStr ? 'esta noche' : 'anoche'}
            </span>
          </div>
        ) : (
          <div style={styles.placeholderRow}>
            <span style={styles.placeholderIcon}>😴</span>
            <span style={styles.muted}>No has registrado tu sueño aún</span>
            <Link to="/sleep" style={styles.btnOutline}>Registrar</Link>
          </div>
        )}
      </section>

      {/* ── Estudio de hoy ──────────────────────────────────────────── */}
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Estudio de hoy</h2>
        <div style={styles.placeholderRow}>
          <span style={styles.placeholderIcon}>📚</span>
          <span style={styles.muted}>Sin sesión de estudio registrada hoy</span>
          <Link to="/study" style={styles.btnOutline}>Empezar sesión</Link>
        </div>
      </section>

      {/* ── Entreno de hoy ──────────────────────────────────────────── */}
      <section style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Entreno de hoy</h2>
          <Link to="/gym" style={styles.link}>Ver gym →</Link>
        </div>

        {workoutsLoading ? (
          <p style={styles.muted}>Cargando…</p>
        ) : workoutCount > 0 ? (
          <p style={styles.statText}>
            {workoutCount} {workoutCount === 1 ? 'serie registrada hoy' : 'series registradas hoy'}
          </p>
        ) : (
          <p style={styles.muted}>Sin entreno registrado hoy</p>
        )}
      </section>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    maxWidth:      600,
    margin:        '0 auto',
    padding:       '1.5rem 1rem',
    display:       'flex',
    flexDirection: 'column',
    gap:           '1rem',
  },
  header: {
    marginBottom: '0.25rem',
  },
  greeting: {
    margin:    0,
    fontSize:  '0.95rem',
    color:     'var(--color-text-secondary)',
  },
  date: {
    margin:     '0.2rem 0 0',
    fontSize:   '1.6rem',
    fontWeight: 700,
    color:      'var(--color-text-primary)',
  },
  card: {
    background:   'var(--color-surface)',
    border:       '1px solid var(--color-border)',
    borderRadius: 12,
    padding:      '1rem 1.25rem',
    boxShadow:    'var(--color-shadow)',
  },
  cardHeader: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   '0.75rem',
  },
  cardTitle: {
    margin:     0,
    fontSize:   '0.95rem',
    fontWeight: 600,
    color:      'var(--color-text-primary)',
  },
  link: {
    fontSize:       '0.85rem',
    color:          'var(--color-text-secondary)',
    textDecoration: 'none',
    fontWeight:     500,
  },
  counter: {
    margin:    '0 0 0.75rem',
    fontSize:  '0.8rem',
    color:     'var(--color-text-secondary)',
  },
  list: {
    listStyle:     'none',
    margin:        0,
    padding:       0,
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.5rem',
  },
  habitLabel: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.5rem',
    cursor:     'pointer',
    fontSize:   '0.95rem',
    color:      'var(--color-text-primary)',
  },
  checkbox: {
    width:       18,
    height:      18,
    cursor:      'pointer',
    accentColor: 'var(--color-accent)',
    flexShrink:  0,
  },
  muted: {
    margin:   0,
    color:    'var(--color-text-secondary)',
    fontSize: '0.9rem',
  },
  placeholderRow: {
    display:    'flex',
    alignItems: 'center',
    gap:        '0.75rem',
    marginTop:  '0.5rem',
    flexWrap:   'wrap',
  },
  placeholderIcon: {
    fontSize: '1.4rem',
  },
  btnOutline: {
    marginLeft:     'auto',
    padding:        '0.3rem 0.8rem',
    border:         '1px solid var(--color-border)',
    borderRadius:   8,
    background:     'transparent',
    color:          'var(--color-text-primary)',
    fontSize:       '0.85rem',
    cursor:         'pointer',
    textDecoration: 'none',
    fontWeight:     500,
    whiteSpace:     'nowrap',
  },
  statText: {
    margin:     0,
    fontSize:   '0.95rem',
    color:      'var(--color-text-primary)',
    fontWeight: 500,
  },
}
