import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL as API } from '../config'

export default function Login() {
  const { login, token } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) navigate('/', { replace: true })
  }, [token, navigate])

  function switchMode(m) {
    setMode(m)
    setError('')
    setForm({ email: '', password: '', confirm: '' })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'register' && form.password !== form.confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Algo salió mal')
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
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>LifeOS</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
            Tu sistema operativo personal
          </p>
        </div>

        <div style={tabsStyle}>
          <button
            type="button"
            onClick={() => switchMode('login')}
            style={tabStyle(mode === 'login')}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            style={tabStyle(mode === 'register')}
          >
            Crear cuenta
          </button>
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
              placeholder={mode === 'register' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="input-field"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </label>
          {mode === 'register' && (
            <label style={labelStyle}>
              Confirmar contraseña
              <input
                type="password"
                placeholder="Repite tu contraseña"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
                className="input-field"
                autoComplete="new-password"
                required
              />
            </label>
          )}

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
            {loading
              ? (mode === 'login' ? 'Entrando...' : 'Creando cuenta...')
              : (mode === 'login' ? 'Entrar' : 'Crear cuenta')}
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

const tabsStyle = {
  display: 'flex',
  marginBottom: 20,
  borderRadius: 10,
  overflow: 'hidden',
  border: '1.5px solid var(--color-border)',
}

const tabStyle = (active) => ({
  flex: 1,
  padding: '8px 0',
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  background: active ? 'var(--color-primary)' : 'transparent',
  color: active ? '#fff' : 'var(--color-text-secondary)',
  transition: 'background 0.2s, color 0.2s',
})
