import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
} from 'chart.js'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { API_URL as API } from '../config'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

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

const SLEEP_QUALITY  = { 1: '😴', 2: '😪', 3: '😐', 4: '😊', 5: '🌟' }
const INSIGHT_ICONS  = { sleep: '😴', habits: '✅', gym: '🏋️' }

function sleepHoursColor(h) {
  if (h < 6) return '#ef4444'
  if (h < 7) return '#f59e0b'
  return '#10b981'
}

function maxDailyStreak(habits, todayStr) {
  let max = 0
  for (const h of habits.filter(h => h.frequency === 'daily')) {
    const sorted = [...h.completions].sort((a, b) => (a > b ? -1 : 1))
    let streak = 0
    const cursor = new Date(todayStr)
    for (let i = 0; i < 365; i++) {
      const key = cursor.toISOString().split('T')[0]
      if (sorted.includes(key)) { streak++ }
      else if (i > 0) break
      cursor.setDate(cursor.getDate() - 1)
    }
    if (streak > max) max = streak
  }
  return max
}

function getScoreColor(s) {
  if (s >= 80) return '#10b981'   // verde
  if (s >= 60) return '#f59e0b'   // naranja
  return '#ef4444'                // rojo
}

function ScoreChart({ history }) {
  const { theme } = useTheme()
  const tickColor = theme === 'dark' ? '#6b7280' : '#888888'
  const gridColor = theme === 'dark' ? '#2e2e32' : '#e5e7eb'

  const data = {
    labels: history.map(s => s.date.slice(5)),    // MM-DD
    datasets: [{
      data:            history.map(s => s.score),
      borderColor:     '#6366f1',
      backgroundColor: theme === 'dark' ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
      fill:            true,
      tension:         0.35,
      pointRadius:     history.length < 10 ? 4 : 2,
      pointHoverRadius: 6,
    }],
  }

  const options = {
    responsive:  true,
    plugins: {
      legend:  { display: false },
      tooltip: { callbacks: { label: ctx => `Score: ${ctx.parsed.y}` } },
    },
    scales: {
      y: {
        min:   0,
        max:   100,
        ticks: { stepSize: 25, color: tickColor },
        grid:  { color: gridColor },
      },
      x: {
        ticks: { color: tickColor, maxTicksLimit: 7 },
        grid:  { display: false },
      },
    },
  }

  return (
    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
        Evolución ({history.length} días)
      </p>
      <Line data={data} options={options} />
    </div>
  )
}

export default function Today() {
  const { token } = useAuth()
  const { theme } = useTheme()

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
  const [weekSleep,    setWeekSleep]    = useState([])
  const [sleepLoading, setSleepLoading] = useState(true)

  const fetchSleep = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/sleep/week`, { headers: authHeader })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setWeekSleep(data)
      const found = data.find(r => r.date === todayStr || r.date === yesterdayStr)
      setLastSleep(found || null)
    } catch {
      // silencioso
    } finally {
      setSleepLoading(false)
    }
  }, [authHeader, todayStr, yesterdayStr])

  // ── Gym Records ───────────────────────────────────────────────────────────
  const [gymRecords, setGymRecords] = useState([])

  const fetchGymRecords = useCallback(async () => {
    try {
      const res = await fetch(`${API}/workouts/records`, { headers: authHeader })
      if (!res.ok) throw new Error()
      setGymRecords(await res.json())
    } catch { /* silencioso */ }
  }, [authHeader])

  // ── Insights ──────────────────────────────────────────────────────────────
  const [insights,        setInsights]        = useState([])
  const [insightsStats,   setInsightsStats]   = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [lifeScore,       setLifeScore]       = useState(null)
  const [scoreHistory,    setScoreHistory]    = useState([])

  const fetchInsights = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/insights`, { headers: authHeader })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setInsights(data.insights || [])
      setInsightsStats(data.stats || null)
      setLifeScore(data.score ?? null)
    } catch { /* silencioso */ } finally {
      setInsightsLoading(false)
    }
  }, [authHeader])

  const fetchScoreHistory = useCallback(async () => {
    try {
      const res  = await fetch(`${API}/insights/score/history`, { headers: authHeader })
      if (!res.ok) throw new Error()
      setScoreHistory(await res.json())
    } catch { /* silencioso */ }
  }, [authHeader])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchHabits()
    fetchWorkouts()
    fetchSleep()
    fetchGymRecords()
    fetchInsights()
    fetchScoreHistory()
  }, [fetchHabits, fetchWorkouts, fetchSleep, fetchGymRecords, fetchInsights, fetchScoreHistory])

  // ── Stats derivados ───────────────────────────────────────────────────────
  const longestStreak   = useMemo(() => maxDailyStreak(habits, todayStr), [habits, todayStr])
  const avgSleep        = useMemo(() => {
    if (!weekSleep.length) return null
    return Math.round((weekSleep.reduce((s, r) => s + r.hoursTotal, 0) / weekSleep.length) * 10) / 10
  }, [weekSleep])
  const monthStr        = todayStr.slice(0, 7)
  const prsThisMonth    = useMemo(
    () => gymRecords.filter(r => r.date && new Date(r.date).toISOString().slice(0, 7) === monthStr).length,
    [gymRecords, monthStr]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.page}>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header style={styles.header}>
        <p style={styles.greeting}>{getGreeting()}</p>
        <h1 style={styles.date}>{getTodayLabel()}</h1>
      </header>
      {/* ── Life Score ─────────────────────────────────────────────── */}
      <section style={{ ...styles.card, ...styles.scoreCard }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ ...styles.cardTitle, marginBottom: '0.25rem' }}>Life Score</h2>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Hábitos · Sueño · Gym
            </p>
          </div>
          {lifeScore === null ? (
            <div style={{ ...styles.skeleton, height: '2.5rem', width: '5rem', marginBottom: 0 }} />
          ) : (
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontSize:   '2.5rem',
                fontWeight: 800,
                lineHeight: 1,
                color:      getScoreColor(lifeScore),
                transition: 'color 0.3s ease',
              }}>
                {lifeScore}
              </span>
              <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                 / 100
              </span>
            </div>
          )}
        </div>

        {lifeScore !== null && (
          <div style={styles.scoreBar}>
            <div style={{
              height:       '100%',
              width:        `${lifeScore}%`,
              background:   getScoreColor(lifeScore),
              borderRadius: 4,
              transition:   'width 0.6s ease',
            }} />
          </div>
        )}

        {/* ── Evolución ───────────────────────────────────────── */}
        {scoreHistory.length > 1 && (
          <ScoreChart history={scoreHistory} />
        )}
      </section>
      {/* ── Stats strip ─────────────────────────────────────────────── */}
      <div style={styles.statsStrip}>
        <div style={styles.statChip}>
          <span style={styles.statChipIcon}>🔥</span>
          <span style={styles.statChipValue}>{longestStreak > 0 ? longestStreak : '—'}</span>
          <span style={styles.statChipLabel}>racha días</span>
        </div>
        <div style={styles.statChip}>
          <span style={styles.statChipIcon}>😴</span>
          <span style={styles.statChipValue}>{avgSleep !== null ? `${avgSleep}h` : '—'}</span>
          <span style={styles.statChipLabel}>media 7d</span>
        </div>
        <div style={styles.statChip}>
          <span style={styles.statChipIcon}>🏆</span>
          <span style={styles.statChipValue}>{prsThisMonth > 0 ? prsThisMonth : '—'}</span>
          <span style={styles.statChipLabel}>PRs este mes</span>
        </div>
      </div>

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

      {/* ── Insights ────────────────────────────────────────────────── */}
      <section style={styles.card}>
        <h2 style={{ ...styles.cardTitle, marginBottom: '0.75rem' }}>✨ Insights</h2>

        {insightsLoading ? (
          <>
            <div style={styles.skeleton} />
            <div style={styles.skeleton} />
            <div style={{ ...styles.skeleton, width: '60%' }} />
          </>
        ) : insights.length === 0 ? (
          <p style={styles.muted}>No hay datos suficientes aún</p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {insights.map((ins, i) => (
              <li key={i} style={styles.insightRow}>
                <span style={styles.insightIcon}>{INSIGHT_ICONS[ins.type] ?? '📊'}</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{ins.message}</span>
              </li>
            ))}
          </ul>
        )}

        {insightsStats && !insightsLoading && (
          <div style={styles.insightStats}>
            <span>😴 {insightsStats.avgSleep > 0 ? `${insightsStats.avgSleep.toFixed(1)}h` : '—'}</span>
            <span>✅ {insightsStats.habitCompletionRate > 0 ? `${insightsStats.habitCompletionRate}%` : '—'}</span>
            <span>🏋️ {insightsStats.prsThisWeek > 0 ? `${insightsStats.prsThisWeek} PR` : '— PR'}</span>
          </div>
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
  statsStrip: {
    display:       'flex',
    gap:           '0.75rem',
  },
  statChip: {
    flex:          1,
    display:       'flex',
    flexDirection: 'column',
    alignItems:    'center',
    gap:           '0.1rem',
    padding:       '0.75rem 0.5rem',
    background:    'var(--color-surface)',
    border:        '1px solid var(--color-border)',
    borderRadius:  12,
    boxShadow:     'var(--color-shadow)',
  },
  statChipIcon: {
    fontSize: '1.2rem',
  },
  skeleton: {
    height:       '0.75rem',
    background:   'var(--color-border)',
    borderRadius: 4,
    marginBottom: '0.5rem',
    opacity:      0.6,
  },
  insightRow: {
    display:    'flex',
    alignItems: 'flex-start',
    gap:        '0.5rem',
    lineHeight: 1.4,
  },
  insightIcon: {
    fontSize:   '1.1rem',
    flexShrink: 0,
    marginTop:  '0.05rem',
  },
  insightStats: {
    display:        'flex',
    gap:            '1rem',
    marginTop:      '0.85rem',
    paddingTop:     '0.75rem',
    borderTop:      '1px solid var(--color-border)',
    fontSize:       '0.82rem',
    color:          'var(--color-text-secondary)',
    flexWrap:       'wrap',
  },
  scoreCard: {
    borderLeft: '3px solid var(--color-accent)',
  },
  scoreBar: {
    height:       '6px',
    background:   'var(--color-border)',
    borderRadius: 4,
    marginTop:    '0.85rem',
    overflow:     'hidden',
  },
  statChipValue: {
    fontSize:   '1.3rem',
    fontWeight: 700,
    color:      'var(--color-text-primary)',
    lineHeight: 1.2,
  },
  statChipLabel: {
    fontSize: '0.7rem',
    color:    'var(--color-text-secondary)',
    textAlign: 'center',
    lineHeight: 1.2,
  },
}
