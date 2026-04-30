import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/',        label: '🏠', name: 'Hoy'     },
  { to: '/habits',  label: '✅', name: 'Hábitos' },
  { to: '/gym',     label: '💪', name: 'Gym'     },
  { to: '/notes',   label: '📝', name: 'Notas'   },
  { to: '/sleep',   label: '😴', name: 'Sueño'   },
  { to: '/profile', label: '👤', name: 'Perfil'  },
]

export default function Nav() {
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
    </nav>
  )
}
