import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

/**
 * Route guard used two ways:
 *
 *   1. Wrapping a single element (what App.jsx does today):
 *        <Route path="/customer" element={
 *          <ProtectedRoute allowedRoles={['customer']}><Customer /></ProtectedRoute>
 *        } />
 *
 *   2. As a layout route for a nested route tree — useful once Phase
 *      6/7/8 add real sub-routes under /customer/*, /admin/*, /supplier/*
 *      instead of one flat placeholder each:
 *        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
 *          <Route path="/admin/*" element={<AdminRoutes />} />
 *        </Route>
 *      — renders <Outlet /> when no `children` prop is passed.
 *
 * While AuthContext is still verifying a stored token (`loading`), this
 * renders nothing rather than redirecting — otherwise an already-logged-in
 * user with a valid token would flash through /login for one frame on
 * every refresh, since `isAuthenticated` is briefly false until the
 * GET /api/auth/me check resolves.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // No dedicated "Access Denied" page exists yet — not part of any phase
  // spec so far — so redirecting to Home is the safest default until one
  // does. Flagged in PHASE_5_VERIFICATION.md.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children ?? <Outlet />
}

export default ProtectedRoute
