import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { API_URL as API } from '../config'

export default function Login() {
  const { login, token } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Si ya hay sesión activa, ir directo al dashboard
  useEffect(() => {
    if (token) navigate('/', { replace: true })
  }, [token, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error desconocido')
      login(data.token)
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
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>🧠 LifeOS</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 32 }}>Tu sistema operativo personal</p>

        <div style={tabsStyle}>
          <button
            onClick={() => { setMode('login'); setError('') }}
            style={tabStyle(mode === 'login')}
          >
            Entrar
          </button>
          <button
            onClick={() => { setMode('register'); setError('') }}
            style={tabStyle(mode === 'register')}
          >
            Registrarse
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="input-field"
            required
          />
          <input
            type="password"
            placeholder="Contraseña (mín. 8 caracteres)"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="input-field"
            required
          />
          {error && <p style={{ color: 'var(--color-danger)', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 4 }}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}

const wrapStyle = {
  minHeight: '100dvh', display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: 'var(--color-bg)', padding: '1rem'
}
const cardStyle = {
  background: 'var(--color-surface)', borderRadius: 20, padding: '2rem',
  width: '100%', maxWidth: 360, boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
  border: '1.5px solid var(--color-border)'
}
const tabsStyle = {
  display: 'flex', marginBottom: 20,
  borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--color-border)'
}
const tabStyle = (active) => ({
  flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 14,
  fontWeight: active ? 600 : 400,
  background: active ? 'var(--color-accent)' : 'var(--color-surface)',
  color: active ? 'var(--color-accent-text)' : 'var(--color-text-secondary)',
  transition: 'all 0.15s',
  fontFamily: 'inherit'
})
