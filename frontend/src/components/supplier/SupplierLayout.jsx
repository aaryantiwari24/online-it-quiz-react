import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../pages/supplier/Supplier.css';

/**
 * Shared shell for every /supplier/* route — sidebar nav + topbar, with
 * <Outlet /> rendering whichever page matched. Structurally identical to
 * components/admin/AdminLayout.jsx (same skip link, mobile topbar +
 * hamburger + drawer + backdrop, same sidebar with brand/nav/footer,
 * same <Outlet /> content area), per this phase's build-prompt Section 4
 * instruction to treat /supplier/* as a sibling of /admin/*, not a new
 * design language.
 *
 * Not a literal import of AdminLayout, though — kept self-contained with
 * its own supplier-* classes in Supplier.css, the same "one stylesheet
 * per role area, duplicated rather than imported" convention Admin.css's
 * own header comment documents (which itself duplicates Customer.css).
 * That keeps /supplier/* from ever depending on admin or customer code
 * having loaded first.
 *
 * Nav items originally were the three pages that phase built — narrower
 * than Admin's five, since suppliers manage questions only, not
 * categories or users (build-prompt Section 2/7). Phase 10's cross-check
 * pass added "Public Homepage" (`end: true`, for the same NavLink
 * always-active reason noted in AdminLayout.jsx/CustomerLayout.jsx's own
 * comments), giving suppliers a way back to "/" without logging out —
 * see CustomerLayout.jsx's comment for why context.md specs this one
 * explicitly and this file follows suit for consistency even though
 * context.md has no supplier-specific spec to match.
 */
const NAV_ITEMS = [
  { to: '/', label: 'Public Homepage', end: true },
  { to: '/supplier/dashboard', label: 'Dashboard Overview', end: true },
  { to: '/supplier/questions', label: 'My Questions' },
  { to: '/supplier/add-question', label: 'Add Question' },
];

const SupplierLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const closeDrawer = () => setDrawerOpen(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="supplier-shell">
      <a href="#supplier-main" className="supplier-skip-link">
        Skip to content
      </a>

      <header className="supplier-topbar">
        <button
          type="button"
          className="supplier-menu-btn"
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen((open) => !open)}
        >
          <span className="supplier-menu-icon" aria-hidden="true" />
        </button>
        <span className="supplier-topbar-brand">IT Quiz</span>
      </header>

      {drawerOpen && (
        <button
          type="button"
          className="supplier-drawer-backdrop"
          aria-label="Close menu"
          onClick={closeDrawer}
        />
      )}

      <aside className={`supplier-sidebar ${drawerOpen ? 'supplier-sidebar--open' : ''}`}>
        <div className="supplier-sidebar-brand">IT Quiz</div>

        <nav className="supplier-nav" aria-label="Supplier navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `supplier-nav-link ${isActive ? 'supplier-nav-link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="supplier-sidebar-footer">
          <div className="supplier-sidebar-user">
            <span className="supplier-sidebar-user-name">{user?.name}</span>
            <span className="supplier-sidebar-user-email">{user?.email}</span>
          </div>
          <button type="button" className="btn btn--danger-ghost btn--full" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      <main id="supplier-main" className="supplier-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
};

export default SupplierLayout;
