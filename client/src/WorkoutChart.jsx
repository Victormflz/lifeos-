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

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

export default function WorkoutChart({ workouts }) {
  if (workouts.length === 0) return null

  const sorted = [...workouts].sort((a, b) => new Date(a.date) - new Date(b.date))

  const labels = [...new Set(
    sorted.map(w => new Date(w.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }))
  )]

  const exercises = [...new Set(workouts.map(w => w.exercise))]
  const colors = ['#18181b', '#6366f1', '#f59e0b', '#10b981', '#ef4444']

  const datasets = exercises.map((ex, i) => {
    const byLabel = {}
    sorted
      .filter(w => w.exercise === ex)
      .forEach(w => {
        const label = new Date(w.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
        byLabel[label] = w.weight
      })

    return {
      label: ex,
      data: labels.map(l => byLabel[l] ?? null),
      borderColor: colors[i % colors.length],
      backgroundColor: colors[i % colors.length] + '22',
      tension: 0.3,
      pointRadius: 5,
      spanGaps: true
    }
  })

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 16, marginBottom: 12 }}>Progreso de carga</h2>
      <Line
        data={{ labels, datasets }}
        options={{
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: { title: { display: true, text: 'kg' } }
          }
        }}
      />
    </div>
  )
}