import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../pages/admin/Admin.css';

/**
 * Shared shell for every /admin/* route — sidebar nav + topbar, with
 * <Outlet /> rendering whichever page matched. Mirrors
 * components/customer/CustomerLayout.jsx structurally (same skip link,
 * mobile drawer, aria pattern) per coding-phases.md's Phase 7 instruction
 * to reuse the sidebar-shell pattern from Phase 6 for visual consistency.
 *
 * Not a literal copy importing CustomerLayout/Customer.css, though —
 * kept self-contained with its own admin-* classes in Admin.css, the same
 * "one stylesheet per role area" split Customer.css itself already uses
 * (Auth.css for /login /register, Customer.css for /customer/*, this
 * pairing for /admin/*), so /admin/* never depends on customer code
 * having loaded first.
 *
 * Nav items originally matched coding-phases.md's Phase 7 list exactly:
 * Dashboard Overview, Manage Categories, Manage Questions, Manage
 * Suppliers, All Results, Logout. Phase 10's cross-check pass added two
 * more: "Public Homepage" — context.md Section 2 specs this as the
 * *first* sidebar item for the Customer shell, and Phase 7 silently
 * dropped it here (and Phase 6 dropped it for Customer too — see
 * CustomerLayout.jsx's own comment); added to all three role shells for
 * consistency, since without it there's no way back to "/" other than
 * logging out or editing the URL bar. "Manage FAQs" — the admin side of
 * this phase's new FAQ CRUD (backend/controllers/faqController.js).
 *
 * `end: true` on the Public Homepage entry matters more here than on
 * Dashboard Overview: without it, react-router's default NavLink
 * matching treats `to="/"` as active for every path (every path "starts
 * with" `/`), which would show this link permanently highlighted while
 * anywhere in `/admin/*`.
 */
const NAV_ITEMS = [
  { to: '/', label: 'Public Homepage', end: true },
  { to: '/admin/dashboard', label: 'Dashboard Overview', end: true },
  { to: '/admin/categories', label: 'Manage Categories' },
  { to: '/admin/questions', label: 'Manage Questions' },
  { to: '/admin/suppliers', label: 'Manage Suppliers' },
  { to: '/admin/results', label: 'All Results' },
  { to: '/admin/faqs', label: 'Manage FAQs' },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="admin-shell">
      <a href="#admin-main" className="admin-skip-link">
        Skip to content
      </a>

      <header className="admin-topbar">
        <button
          type="button"
          className="admin-menu-btn"
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <span className="admin-menu-icon" aria-hidden="true" />
        </button>
        <span className="admin-topbar-brand">IT Quiz</span>
      </header>

      {drawerOpen && (
        <button
          type="button"
          className="admin-drawer-backdrop"
          aria-label="Close menu"
          onClick={closeDrawer}
        />
      )}

      <aside className={`admin-sidebar ${drawerOpen ? 'admin-sidebar--open' : ''}`}>
        <div className="admin-sidebar-brand">IT Quiz</div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `admin-nav-link ${isActive ? 'admin-nav-link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <span className="admin-sidebar-user-name">{user?.name}</span>
            <span className="admin-sidebar-user-email">{user?.email}</span>
          </div>
          <button type="button" className="btn btn--danger-ghost btn--full" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main id="admin-main" className="admin-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
