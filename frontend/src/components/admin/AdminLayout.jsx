import { useState } from 'react'
import {
  NavLink,
  Outlet,
  useNavigate,
} from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../../pages/admin/Admin.css'

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Home',
    end: true,
  },
  {
    to: '/admin/dashboard',
    label: 'Dashboard',
    end: true,
  },
  {
    to: '/admin/customers',
    label: 'Customers',
    end: true,
  },
  {
    to: '/admin/suppliers',
    label: 'Suppliers',
    end: true,
  },
  {
    to: '/admin/categories',
    label: 'Categories',
    end: true,
  },
  {
    to: '/admin/results',
    label: 'Results',
    end: true,
  },
  {
    to: '/admin/certificates',
    label: 'Certificates',
    end: true,
  },
  {
    to: '/admin/profile',
    label: 'Profile',
    end: true,
  },
]

const AdminLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = () => {
    setDrawerOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="admin-shell">
      <a
        href="#admin-main"
        className="admin-skip-link"
      >
        Skip to content
      </a>

      <header className="admin-topbar">
        <button
          type="button"
          className="admin-menu-btn"
          aria-label={
            drawerOpen
              ? 'Close menu'
              : 'Open menu'
          }
          aria-expanded={drawerOpen}
          onClick={() =>
            setDrawerOpen((open) => !open)
          }
        >
          <span
            className="admin-menu-icon"
            aria-hidden="true"
          />
        </button>

        <span className="admin-topbar-brand">
          IT Quiz
        </span>
      </header>

      {drawerOpen && (
        <button
          type="button"
          className="admin-drawer-backdrop"
          aria-label="Close menu"
          onClick={closeDrawer}
        />
      )}

      <aside
        className={`admin-sidebar ${
          drawerOpen
            ? 'admin-sidebar--open'
            : ''
        }`}
      >
        <div className="admin-sidebar-brand">
          IT Quiz Admin
        </div>

        <nav
          className="admin-nav"
          aria-label="Admin navigation"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `admin-nav-link ${
                  isActive
                    ? 'admin-nav-link--active'
                    : ''
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <span className="admin-sidebar-user-name">
              {user?.name}
            </span>

            <span className="admin-sidebar-user-email">
              {user?.email}
            </span>
          </div>

          <button
            type="button"
            className="btn btn--danger-ghost btn--full"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>

      <main
        id="admin-main"
        className="admin-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout