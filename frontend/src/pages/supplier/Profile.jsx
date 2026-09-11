import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './Supplier.css';

const Profile = () => {
  const {
    user,
    updateCurrentUser,
  } = useAuth();

  const [name, setName] = useState(
    user?.name || ''
  );

  const [email, setEmail] = useState(
    user?.email || ''
  );

  const [password, setPassword] = useState('');

  const [success, setSuccess] = useState('');

  const [error, setError] = useState('');

  const [saving, setSaving] = useState(false);


  /* =======================================================
     SAVE PROFILE
  ======================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccess('');
    setError('');

    /*
     * Same required fields as PHP.
     */
    if (
      !name.trim() ||
      !email.trim()
    ) {
      setError(
        'Name and Email are required fields.'
      );

      return;
    }

    try {
      setSaving(true);

      const { data } = await api.put(
        '/users/profile',
        {
          name: name.trim(),
          email: email.trim(),
          password,
        }
      );

      /*
       * Update React state and localStorage.
       */
      updateCurrentUser(data.user);

      /*
       * Update displayed fields.
       */
      setName(data.user.name);
      setEmail(data.user.email);

      /*
       * Clear password field after successful update.
       */
      setPassword('');

      setSuccess(
        'Profile updated successfully!'
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          'Error updating profile.'
      );
    } finally {
      setSaving(false);
    }
  };


  return (
    <div>

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="supplier-page-header">
        <div>
          <h1>Profile Settings</h1>
        </div>
      </div>


      {/* =================================================
          SUCCESS MESSAGE
      ================================================= */}

      {success && (
        <div
          className="supplier-inline-success"
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 8,
            background: '#ecfdf3',
            color: '#166534',
          }}
        >
          {success}
        </div>
      )}


      {/* =================================================
          ERROR MESSAGE
      ================================================= */}

      {error && (
        <div className="supplier-inline-error">
          {error}
        </div>
      )}


      {/* =================================================
          PROFILE FORM
      ================================================= */}

      <div
        className="card"
        style={{ maxWidth: 600 }}
      >
        <form onSubmit={handleSubmit}>

          {/* Full Name */}

          <div className="supplier-field">
            <label htmlFor="supplier-name">
              Full Name
            </label>

            <input
              id="supplier-name"
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              required
            />
          </div>


          {/* Email */}

          <div className="supplier-field">
            <label htmlFor="supplier-email">
              Email Address
            </label>

            <input
              id="supplier-email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />
          </div>


          {/* New Password */}

          <div className="supplier-field">
            <label htmlFor="supplier-password">
              New Password
            </label>

            <input
              id="supplier-password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter new password"
            />

            <small
              style={{
                display: 'block',
                marginTop: 6,
                color:
                  'var(--color-ink-soft)',
              }}
            >
              Leave blank if you do not want
              to change your password.
            </small>
          </div>


          {/* Save */}

          <div className="supplier-form-actions">
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : 'Save Profile Changes'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default Profile;