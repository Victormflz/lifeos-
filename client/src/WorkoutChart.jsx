import { useState, useMemo } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend
} from 'chart.js'
import { useTheme } from './context/ThemeContext'

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

// Devuelve etiqueta "Sem DD/MM" del lunes de la semana de una fecha
function weekLabel(date) {
  const d = new Date(date)
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - day)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Genera etiquetas de las últimas N semanas (lunes)
function lastNWeekLabels(n) {
  const labels = []
  const now = new Date()
  const day = now.getDay() === 0 ? 6 : now.getDay() - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - day)
  monday.setHours(0, 0, 0, 0)
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(monday)
    d.setDate(monday.getDate() - i * 7)
    labels.push(`${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return labels
}

export default function WorkoutChart({ workouts, records = {} }) {
  const { theme } = useTheme()
  const exercises = useMemo(() => [...new Set(workouts.map(w => w.exercise))].sort(), [workouts])
  const [selectedEx, setSelectedEx] = useState('')

  const activeEx = selectedEx || exercises[0]

  if (workouts.length === 0 || !activeEx) return null

  const chartLine = theme === 'dark' ? '#818cf8' : '#6366f1'
  const chartArea = theme === 'dark' ? 'rgba(129,140,248,0.15)' : 'rgba(99,102,241,0.13)'
  const tickColor = theme === 'dark' ? '#6b7280' : '#888888'
  const gridColor = theme === 'dark' ? '#2e2e32' : '#e5e7eb'

  const WEEKS = 8
  const labels = lastNWeekLabels(WEEKS)
  const labelSet = new Set(labels)

  // Peso máximo por semana para el ejercicio seleccionado
  const weekMax = {}
  workouts
    .filter(w => w.exercise === activeEx)
    .forEach(w => {
      const lbl = weekLabel(w.date)
      if (labelSet.has(lbl)) {
        weekMax[lbl] = Math.max(weekMax[lbl] ?? 0, w.weight)
      }
    })

  const prWeight = records[activeEx]?.weight ?? null
  const dataPoints = labels.map(l => weekMax[l] ?? null)

  // Colores de puntos: dorado si es PR, color de línea si no
  const pointColors = labels.map(l => {
    const val = weekMax[l]
    if (val == null) return 'transparent'
    return prWeight != null && val >= prWeight ? '#f0b429' : chartLine
  })

  const pointRadii = labels.map(l => {
    const val = weekMax[l]
    if (val == null) return 0
    return prWeight != null && val >= prWeight ? 8 : 5
  })

  const chartData = {
    labels,
    datasets: [{
      label: activeEx,
      data: dataPoints,
      borderColor: chartLine,
      backgroundColor: chartArea,
      tension: 0.3,
      spanGaps: true,
      pointRadius: pointRadii,
      pointBackgroundColor: pointColors,
      pointBorderColor: pointColors
    }]
  }

  const options = {
    responsive: true,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#1c1c1f' : '#ffffff',
        titleColor: theme === 'dark' ? '#f0f0f3' : '#18181b',
        bodyColor: theme === 'dark' ? '#9ca3af' : '#555555',
        borderColor: theme === 'dark' ? '#2e2e32' : '#e5e7eb',
        borderWidth: 1,
        callbacks: {
          label: ctx => {
            const val = ctx.parsed.y
            const isPR = prWeight != null && val >= prWeight
            return ` ${val} kg${isPR ? '  🏆 PR' : ''}`
          }
        }
      }
    },
    scales: {
      y: {
        title: { display: true, text: 'kg', color: tickColor },
        beginAtZero: false,
        ticks: { color: tickColor },
        grid: { color: gridColor }
      },
      x: {
        ticks: { color: tickColor },
        grid: { color: gridColor }
      }
    }
  }

  return (
    <div style={{ marginTop: 28, borderTop: '1px solid var(--color-border)', paddingTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ fontSize: 15, margin: 0, fontWeight: 600 }}>
          📈 Progreso — <span style={{ color: chartLine }}>{activeEx}</span>
        </h2>
        <select
          value={activeEx}
          onChange={e => setSelectedEx(e.target.value)}
          style={selectStyle}
        >
          {exercises.map(ex => <option key={ex} value={ex}>{ex}</option>)}
        </select>
      </div>
      {prWeight && (
        <p style={{ fontSize: 12, color: 'var(--color-gold)', margin: '0 0 12px', fontWeight: 500 }}>
          🏆 Récord: {prWeight} kg — los puntos dorados marcan las sesiones en PR
        </p>
      )}
      <Line data={chartData} options={options} />
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 6, textAlign: 'right' }}>Últimas 8 semanas · peso máximo semanal</p>
    </div>
  )
}

const selectStyle = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid var(--color-border)',
  fontSize: 13, outline: 'none', cursor: 'pointer',
  background: 'var(--color-surface)', color: 'var(--color-text-primary)'
}
