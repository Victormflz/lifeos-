import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const tabs = [
  { to: '/',       label: '🏠', name: 'Hoy'     },
  { to: '/habits', label: '✅', name: 'Hábitos' },
  { to: '/gym',    label: '💪', name: 'Gym'     },
  { to: '/notes',  label: '📝', name: 'Notas'   },
  { to: '/sleep',  label: '😴', name: 'Sueño'   },
]

export default function Nav() {
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav className="app-nav">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
        >
          <span style={{ fontSize: 22 }}>{tab.label}</span>
          <span>{tab.name}</span>
        </NavLink>
      ))}
      <button onClick={toggleTheme} className="nav-tab">
        <span style={{ fontSize: 22 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
        <span>{theme === 'dark' ? 'Luz' : 'Noche'}</span>
      </button>
      <button onClick={handleLogout} className="nav-tab">
        <span style={{ fontSize: 22 }}>🚪</span>
        <span>Salir</span>
      </button>
    </nav>
  )
}
