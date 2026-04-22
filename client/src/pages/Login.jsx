import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL as API } from '../config'

export default function Login() {
  const { login, token } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) navigate('/', { replace: true })
  }, [token, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Credenciales incorrectas')
      login(data.accessToken, data.refreshToken)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>LifeOS</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginTop: 4, margin: '4px 0 0' }}>
            Tu sistema operativo personal
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={labelStyle}>
            Email
            <input
              type="email"
              placeholder="tu@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="input-field"
              autoComplete="email"
              inputMode="email"
              required
            />
          </label>
          <label style={labelStyle}>
            Contraseña
            <input
              type="password"
              placeholder="Tu contraseña"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="input-field"
              autoComplete="current-password"
              required
            />
          </label>

          {error && (
            <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 13, margin: 0, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ marginTop: 4, width: '100%' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const wrapStyle = {
  minHeight: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--color-bg)',
  padding: '1.5rem',
}

const cardStyle = {
  background: 'var(--color-surface)',
  borderRadius: 20,
  padding: '2rem',
  width: '100%',
  maxWidth: 360,
  boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
  border: '1.5px solid var(--color-border)',
}

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 13,
  fontWeight: 500,
  color: 'var(--color-text-secondary)',
}
