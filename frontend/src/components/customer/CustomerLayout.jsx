import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import '../../pages/customer/Customer.css'

// Nav items shared between the desktop sidebar and the mobile drawer, so
// adding a page only means editing this one array. `end` matches
// NavLink's own prop name — passed straight through — so only
// /customer/dashboard gets the active style on an exact match while
// /customer/history/anything still lights up "History".
//
// "Public Homepage" (Phase 10 addition) was actually the *first* item in
// context.md Section 2's own list for this exact sidebar — "Public
// Homepage, Dashboard Overview, Available Quizzes, Evaluation History,
// My Profile" — but Phase 6's build silently dropped it, leaving no way
// back to "/" short of logging out or editing the URL bar. Phase 10's
// cross-check pass restored it, in its originally-specified first
// position, and added the same link to Admin/Supplier's shells too for
// consistency even though context.md never specs those (they weren't in
// the reference video — see that section's own note). `end: true` here
// isn't optional the way it might look: without it, react-router's
// default NavLink matching treats `to="/"` as active for every path
// (every path "starts with" `/`), which would show this link permanently
// highlighted while anywhere in /customer/*.
const NAV_ITEMS = [
  { to: '/', label: 'Public Homepage', end: true },
  { to: '/customer/dashboard', label: 'Dashboard', end: true },
  { to: '/customer/quizzes', label: 'Available Quizzes' },
  { to: '/customer/history', label: 'Evaluation History' },
  { to: '/customer/profile', label: 'Profile' },
]

/**
 * Shared shell for every /customer/* page: a persistent sidebar on
 * desktop, a slide-out drawer behind a hamburger on mobile, and an
 * <Outlet /> for the actual page content. Mounted once by App.jsx as the
 * layout route for the whole /customer/* subtree (see App.jsx's comment
 * on the route nesting) rather than each page importing its own copy of
 * the nav — matches ProtectedRoute's existing layout-route pattern.
 *
 * Each nav link closes the mobile drawer on click (see closeDrawer below)
 * — without it, tapping a nav link on mobile would navigate correctly but
 * leave the drawer covering the new page until the user tapped the
 * backdrop separately. Closing it directly in each nav link's onClick
 * (rather than in a useEffect keyed on location.pathname) means the
 * close happens as part of the same click that caused the navigation,
 * not as a second render reacting to it afterward — oxlint's
 * set-state-in-effect rule flags the effect-based version for exactly
 * this reason: "update it from the event that caused the change."
 */
const CustomerLayout = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = () => setDrawerOpen(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="customer-shell">
      <a href="#customer-main" className="customer-skip-link">
        Skip to content
      </a>

      <header className="customer-topbar">
        <button
          type="button"
          className="customer-menu-btn"
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <span className="customer-menu-icon" aria-hidden="true" />
        </button>
        <span className="customer-topbar-brand">IT Quiz</span>
      </header>

      {drawerOpen && (
        <button
          type="button"
          className="customer-drawer-backdrop"
          aria-label="Close menu"
          onClick={closeDrawer}
        />
      )}

      <aside className={`customer-sidebar ${drawerOpen ? 'customer-sidebar--open' : ''}`}>
        <div className="customer-sidebar-brand">IT Quiz</div>

        <nav className="customer-nav" aria-label="Customer navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `customer-nav-link ${isActive ? 'customer-nav-link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="customer-sidebar-footer">
          <div className="customer-sidebar-user">
            <span className="customer-sidebar-user-name">{user?.name}</span>
            <span className="customer-sidebar-user-email">{user?.email}</span>
          </div>
          <button type="button" className="btn btn--danger-ghost btn--full" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main id="customer-main" className="customer-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}

export default CustomerLayout
