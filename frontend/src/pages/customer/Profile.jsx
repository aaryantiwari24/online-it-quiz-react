import { useAuth } from '../../context/AuthContext'
import StatusPill from '../../components/customer/StatusPill'
import './Customer.css'

/**
 * /customer/profile — intentionally read-only. There is no PATCH/PUT
 * user-update endpoint anywhere in backend/routes/authRoutes.js (only
 * register, login, and GET /me), so an editable form here would have
 * nowhere to actually submit to. Sourced entirely from AuthContext's
 * `user`, which already holds the exact shape authController.js's
 * toSafeUser returns (id, name, email, role, phone) — no separate fetch
 * needed on this page, and nothing here shows a "member since" date
 * since toSafeUser deliberately doesn't include createdAt.
 */
const Profile = () => {
  const { user } = useAuth()

  return (
    <div>
      <div className="customer-page-header">
        <h1>Profile</h1>
        <p>Your account details.</p>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <div className="profile-field">
          <span className="profile-field-label">Full Name</span>
          <span className="profile-field-value">{user?.name}</span>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Email</span>
          <span className="profile-field-value">{user?.email}</span>
        </div>

        <div className="profile-field">
          <span className="profile-field-label">Phone</span>
          <span className="profile-field-value">{user?.phone || '—'}</span>
        </div>

        <div className="profile-field profile-field--last">
          <span className="profile-field-label">Role</span>
          <StatusPill label={user?.role} tone="neutral" />
        </div>
      </div>

      <p className="profile-note">
        Need to update your details? This account section is currently read-only.
      </p>
    </div>
  )
}

export default Profile
