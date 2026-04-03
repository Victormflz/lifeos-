import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
        <p style={{ color: '#888', fontSize: 13, marginBottom: 32 }}>Tu sistema operativo personal</p>

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
            style={inputStyle}
            required
          />
          <input
            type="password"
            placeholder="Contraseña (mín. 8 caracteres)"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            style={inputStyle}
            required
          />
          {error && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  )
}

const wrapStyle = {
  minHeight: '100dvh', display: 'flex', alignItems: 'center',
  justifyContent: 'center', background: '#f7f7f7', padding: '1rem'
}
const cardStyle = {
  background: '#fff', borderRadius: 16, padding: '2rem',
  width: '100%', maxWidth: 360, boxShadow: '0 4px 24px rgba(0,0,0,0.07)'
}
const tabsStyle = {
  display: 'flex', marginBottom: 20,
  borderRadius: 8, overflow: 'hidden', border: '1px solid #e5e7eb'
}
const tabStyle = (active) => ({
  flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer', fontSize: 14,
  fontWeight: active ? 600 : 400,
  background: active ? '#18181b' : '#fff',
  color: active ? '#fff' : '#666',
  transition: 'all 0.15s'
})
const inputStyle = {
  padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd',
  fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box'
}
const buttonStyle = {
  padding: '12px', borderRadius: 8, background: '#18181b', color: '#fff',
  border: 'none', fontSize: 14, cursor: 'pointer', fontWeight: 500, marginTop: 4
}
