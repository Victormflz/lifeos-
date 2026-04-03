import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const tabs = [
  { to: '/',       label: '💪', name: 'Gym'     },
  { to: '/habits', label: '✅', name: 'Hábitos' },
  { to: '/notes',  label: '📝', name: 'Notas'   }
]

export default function Nav() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <nav style={navStyle}>
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          style={({ isActive }) => ({
            ...tabStyle,
            color: isActive ? '#18181b' : '#aaa',
            fontWeight: isActive ? 600 : 400
          })}
        >
          <span style={{ fontSize: 22 }}>{tab.label}</span>
          <span style={{ fontSize: 11, marginTop: 2 }}>{tab.name}</span>
        </NavLink>
      ))}
      <button onClick={handleLogout} style={{ ...tabStyle, border: 'none', background: 'none', cursor: 'pointer', color: '#aaa' }}>
        <span style={{ fontSize: 22 }}>🚪</span>
        <span style={{ fontSize: 11, marginTop: 2 }}>Salir</span>
      </button>
    </nav>
  )
}

const navStyle = {
  position: 'fixed', bottom: 0, left: 0, right: 0,
  display: 'flex', justifyContent: 'space-around',
  background: '#fff', borderTop: '1px solid #eee',
  padding: '8px 0 env(safe-area-inset-bottom, 8px)',
  zIndex: 100
}

const tabStyle = {
  display: 'flex', flexDirection: 'column', alignItems: 'center',
  textDecoration: 'none', padding: '4px 24px', fontSize: 12,
  transition: 'color 0.15s'
}
