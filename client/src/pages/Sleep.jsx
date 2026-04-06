import { useState, useEffect, useCallback, useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  LineElement,
  PointElement,
} from 'chart.js'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { API_URL as API } from '../config'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, LineElement, PointElement)

const QUALITY_EMOJIS = { 1: '😴', 2: '😪', 3: '😐', 4: '😊', 5: '🌟' }

function sleepColor(h) {
  if (h < 6) return '#ef4444'
  if (h < 7) return '#f59e0b'
  return '#10b981'
}

function dayAbbr(dateStr) {
  return new Intl.DateTimeFormat('es-ES', { weekday: 'short' })
    .format(new Date(dateStr + 'T12:00:00'))
    .replace('.', '')
}

function formatRecordDate(dateStr) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long', day: 'numeric', month: 'short',
  }).format(new Date(dateStr + 'T12:00:00'))
}

function emptyForm() {
  return { date: new Date().toISOString().split('T')[0], bedtime: '', wakeTime: '', quality: 3, notes: '' }
}

// ── Shared form fields (used for create and inline edit) ──────────────────────
function SleepFormFields({ form, setForm }) {
  return (
    <>
      <div>
        <label style={labelStyle}>Fecha</label>
        <input
          type="date"
          value={form.date}
          onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          className="input-field"
          required
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Me dormí a las</label>
          <input
            type="time"
            value={form.bedtime}
            onChange={e => setForm(f => ({ ...f, bedtime: e.target.value }))}
            className="input-field"
            required
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Me desperté a las</label>
          <input
            type="time"
            value={form.wakeTime}
            onChange={e => setForm(f => ({ ...f, wakeTime: e.target.value }))}
            className="input-field"
            required
          />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Calidad del sueño</label>
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          {[1, 2, 3, 4, 5].map(q => (
            <button
              key={q}
              type="button"
              onClick={() => setForm(f => ({ ...f, quality: q }))}
              style={{
                fontSize:    24,
                padding:     '6px 10px',
                borderRadius: 10,
                cursor:      'pointer',
                background:  form.quality === q ? 'var(--color-surface-2)' : 'none',
                border:      form.quality === q ? '2px solid var(--color-accent)' : '2px solid transparent',
                transition:  'border-color 0.15s',
              }}
            >
              {QUALITY_EMOJIS[q]}
            </button>
          ))}
        </div>
      </div>
      <textarea
        placeholder="Notas opcionales (ej: me desperté 2 veces)"
        value={form.notes}
        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
        className="input-field"
        maxLength={300}
        rows={2}
        style={{ resize: 'vertical', minHeight: 56 }}
      />
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Sleep() {
  const { token }  = useAuth()
  const { theme }  = useTheme()

  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  )

  const [records,    setRecords]    = useState([])
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState(emptyForm)
  const [editingId,  setEditingId]  = useState(null)
  const [editForm,   setEditForm]   = useState(emptyForm)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const fetchRecords = useCallback(async () => {
    try {
      const res = await fetch(`${API}/sleep`, { headers: authHeader })
      if (!res.ok) throw new Error()
      setRecords(await res.json())
    } catch {
      setError('No se pudieron cargar los registros de sueño')
    }
  }, [authHeader])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  async function handleCreate(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/sleep`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body:    JSON.stringify({ ...form, quality: Number(form.quality) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al crear el registro'); return }
      setForm(emptyForm())
      setShowForm(false)
      fetchRecords()
    } catch {
      setError('Error al crear el registro')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id) {
    try {
      await fetch(`${API}/sleep/${id}`, { method: 'DELETE', headers: authHeader })
      setRecords(prev => prev.filter(r => r._id !== id))
    } catch {
      setError('Error al eliminar el registro')
    }
  }

  function startEdit(record) {
    setEditingId(record._id)
    setEditForm({
      date:     record.date,
      bedtime:  record.bedtime,
      wakeTime: record.wakeTime,
      quality:  record.quality,
      notes:    record.notes || '',
    })
  }

  async function handleEditSave(id) {
    setError('')
    try {
      const res = await fetch(`${API}/sleep/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body:    JSON.stringify({ ...editForm, quality: Number(editForm.quality) }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error al actualizar'); return }
      setRecords(prev => prev.map(r => r._id === id ? data : r))
      setEditingId(null)
    } catch {
      setError('Error al actualizar el registro')
    }
  }

  // ── Chart ──────────────────────────────────────────────────────────────────
  const tickColor = theme === 'dark' ? '#6b7280' : '#888888'
  const gridColor = theme === 'dark' ? '#2e2e32' : '#e5e7eb'

  const last7 = useMemo(() => [...records].slice(0, 7).reverse(), [records])

  const chartData = useMemo(() => {
    const sleepData = last7.map(r => r.hoursTotal)
    return {
      labels: last7.map(r => dayAbbr(r.date)),
      datasets: [
        {
          type:            'bar',
          data:            sleepData,
          backgroundColor: sleepData.map(h => sleepColor(h)),
          borderRadius:    6,
          barPercentage:   0.6,
        },
        {
          type:        'line',
          data:        Array(last7.length).fill(7),
          borderColor: '#9ca3af',
          borderDash:  [5, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          tension:     0,
        },
      ],
    }
  }, [last7])

  const chartOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        filter:    item => item.datasetIndex === 0,
        callbacks: { label: ctx => `${ctx.parsed.y}h` },
      },
    },
    scales: {
      y: {
        min:  0,
        max:  10,
        ticks: { stepSize: 2, color: tickColor },
        grid:  { color: gridColor },
      },
      x: {
        ticks: { color: tickColor },
        grid:  { display: false },
      },
    },
  }), [tickColor, gridColor])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, margin: 0 }}>😴 Sueño</h1>
        <button onClick={() => { setShowForm(v => !v); setError('') }} className="btn btn-primary btn-sm">
          {showForm ? '✕' : '+ Registrar'}
        </button>
      </div>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 24 }}>
        {records.length === 0
          ? 'Sin registros de sueño aún'
          : `${records.length} ${records.length === 1 ? 'registro' : 'registros'}`}
      </p>

      {/* ── Create form ─────────────────────────────────────────────── */}
      {showForm && (
        <form onSubmit={handleCreate} style={formStyle}>
          <SleepFormFields form={form} setForm={setForm} />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
            {loading ? 'Guardando...' : 'Registrar sueño'}
          </button>
        </form>
      )}

      {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      {/* ── Weekly chart ────────────────────────────────────────────── */}
      {last7.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 16, padding: '16px 12px 10px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            Últimos 7 días
          </p>
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {records.length === 0 && !showForm && (
        <div style={emptyStyle}>
          <p style={{ fontSize: 40, margin: 0 }}>😴</p>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginTop: 8 }}>
            Sin registros de sueño aún
          </p>
        </div>
      )}

      {/* ── Records list ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {records.map(record =>
          editingId === record._id ? (
            <div key={record._id} style={{ ...cardStyle, flexDirection: 'column', gap: 10 }}>
              <SleepFormFields form={editForm} setForm={setEditForm} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => handleEditSave(record._id)}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1 }}
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div key={record._id} style={{ ...cardStyle, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {/* Hours */}
              <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: sleepColor(record.hoursTotal), lineHeight: 1 }}>
                  {record.hoursTotal}h
                </span>
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', textTransform: 'capitalize' }}>
                  {formatRecordDate(record.date)}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  {record.bedtime} → {record.wakeTime} · {QUALITY_EMOJIS[record.quality]}
                </p>
                {record.notes ? (
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
                    {record.notes.length > 60 ? record.notes.slice(0, 60) + '…' : record.notes}
                  </p>
                ) : null}
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <button onClick={() => startEdit(record)} className="btn btn-ghost">✏️</button>
                <button onClick={() => handleDelete(record._id)} className="btn btn-ghost">✕</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const formStyle = {
  display:       'flex',
  flexDirection: 'column',
  gap:           10,
  marginBottom:  24,
  padding:       '16px',
  borderRadius:  14,
  border:        '1.5px solid var(--color-border)',
  background:    'var(--color-surface-2)',
}
const cardStyle = {
  display:       'flex',
  flexDirection: 'column',
  padding:       '16px',
  borderRadius:  14,
  border:        '1.5px solid var(--color-border)',
  background:    'var(--color-surface)',
}
const emptyStyle = {
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'center',
  justifyContent: 'center',
  padding:        '48px 0',
  borderRadius:   12,
  border:         '2px dashed var(--color-border)',
  background:     'var(--color-surface-2)',
}
const labelStyle = {
  display:      'block',
  fontSize:     12,
  fontWeight:   500,
  color:        'var(--color-text-secondary)',
  marginBottom: 4,
}
