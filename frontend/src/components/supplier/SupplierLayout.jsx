import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../pages/supplier/Supplier.css';

const NAV_ITEMS = [
{ to: '/', label: 'Home', end: true },
  { to: '/supplier/dashboard', label: 'Dashboard', end: true },
  { to: '/supplier/questions', label: 'Manage Questions' },
  { to: '/supplier/profile', label: 'Profile Settings' },
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

      {/* Mobile top bar */}
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

      {/* Mobile backdrop */}
      {drawerOpen && (
        <button
          type="button"
          className="supplier-drawer-backdrop"
          aria-label="Close menu"
          onClick={closeDrawer}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`supplier-sidebar ${
          drawerOpen ? 'supplier-sidebar--open' : ''
        }`}
      >
        <div className="supplier-sidebar-brand">
          IT Quiz
        </div>

        <nav
          className="supplier-nav"
          aria-label="Supplier navigation"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeDrawer}
              className={({ isActive }) =>
                `supplier-nav-link ${
                  isActive ? 'supplier-nav-link--active' : ''
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="supplier-sidebar-footer">
          <div className="supplier-sidebar-user">
            <span className="supplier-sidebar-user-name">
              {user?.name}
            </span>

            <span className="supplier-sidebar-user-email">
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

      {/* Page content */}
      <main
        id="supplier-main"
        className="supplier-content"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default SupplierLayout;