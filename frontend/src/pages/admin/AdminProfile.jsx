import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import './Admin.css'

const AdminProfile = () => {
  const { user, updateCurrentUser } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setLoading(false)
    }
  }, [user])

  const handleSubmit = async (event) => {
    event.preventDefault()

    setSuccess('')
    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName || !trimmedEmail) {
      setError('All fields are required.')
      return
    }

    setSaving(true)

    try {
      const { data } = await api.put(
        '/users/admin-profile',
        {
          name: trimmedName,
          email: trimmedEmail,
        }
      )

      if (data.user) {
        updateCurrentUser(data.user)
      }

      setName(data.user?.name || trimmedName)
      setEmail(data.user?.email || trimmedEmail)

      setSuccess(
        data.message ||
          'Profile updated successfully!'
      )
    } catch (err) {
      setError(
        err.response?.data?.error ||
          'Could not update profile.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="admin-page-header">
          <div>
            <h1>Admin Profile Settings</h1>
          </div>
        </div>

        <p>Loading profile…</p>
      </div>
    )
  }

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Admin Profile Settings</h1>
        </div>
      </div>

      <div className="card profile-card">
        {success && (
          <div
            className="alert-success"
            role="status"
          >
            {success}
          </div>
        )}

        {error && (
          <div
            className="alert-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="admin-name">
              Admin Username
            </label>

            <input
              id="admin-name"
              type="text"
              className="form-control"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-email">
              Email Address
            </label>

            <input
              id="admin-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn--primary btn--full"
            disabled={saving}
          >
            {saving
              ? 'Saving…'
              : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default AdminProfile