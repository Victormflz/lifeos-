import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { API_URL as API, authHeaders } from '../config'
import { apiFetch } from '../utils/apiFetch'

export default function Profile() {
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [joinedDate, setJoinedDate] = useState('')
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    apiFetch(`${API}/auth/me`, { headers: authHeaders() })
      .then(data => {
        setEmail(data.email)
        setJoinedDate(new Date(data.createdAt).toLocaleDateString('es-ES', {
          day: 'numeric', month: 'long', year: 'numeric',
        }))
      })
      .catch(() => {})
  }, [])

  async function handleChangePassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (form.newPass !== form.confirm) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }
    setLoading(true)
    try {
      await apiFetch(`${API}/auth/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ currentPassword: form.current, newPassword: form.newPass }),
      })
      setSuccess('Contraseña actualizada')
      setForm({ current: '', newPass: '', confirm: '' })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, marginBottom: 4 }}>👤 Perfil</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, marginBottom: 28 }}>
        Configuración de tu cuenta
      </p>

      {/* Account info */}
      <div style={sectionStyle}>
        <p style={labelStyle}>Email</p>
        <p style={{ fontWeight: 600, fontSize: 15 }}>{email || '—'}</p>
        {joinedDate && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Cuenta creada el {joinedDate}
          </p>
        )}
      </div>

      {/* Theme toggle */}
      <div style={{ ...sectionStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={labelStyle}>Tema</p>
          <p style={{ fontWeight: 600, fontSize: 15 }}>{theme === 'dark' ? 'Oscuro' : 'Claro'}</p>
        </div>
        <button onClick={toggleTheme} className="btn btn-secondary btn-sm">
          {theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro'}
        </button>
      </div>

      {/* Change password */}
      <div style={sectionStyle}>
        <p style={{ ...labelStyle, marginBottom: 14 }}>Cambiar contraseña</p>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="password"
            placeholder="Contraseña actual"
            value={form.current}
            onChange={e => setForm({ ...form, current: e.target.value })}
            className="input-field"
            autoComplete="current-password"
            required
          />
          <input
            type="password"
            placeholder="Nueva contraseña (mín. 8 caracteres)"
            value={form.newPass}
            onChange={e => setForm({ ...form, newPass: e.target.value })}
            className="input-field"
            autoComplete="new-password"
            required
          />
          <input
            type="password"
            placeholder="Confirmar nueva contraseña"
            value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })}
            className="input-field"
            autoComplete="new-password"
            required
          />
          {error && (
            <p role="alert" style={{ color: 'var(--color-danger)', fontSize: 13, margin: 0 }}>
              {error}
            </p>
          )}
          {success && (
            <p style={{ color: 'var(--color-success)', fontSize: 13, margin: 0 }}>
              {success}
            </p>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>

      {/* Logout */}
      <div style={{ marginTop: 32 }}>
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ width: '100%', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </div>
  )
}

const sectionStyle = {
  padding: '16px',
  borderRadius: 14,
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-surface)',
  marginBottom: 12,
}

const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--color-text-muted)',
  margin: '0 0 6px',
}
