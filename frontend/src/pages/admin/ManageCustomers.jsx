import { useEffect, useState } from 'react'
import api from '../../services/api'
import './Admin.css'

const ManageCustomers = () => {
  const [customers, setCustomers] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [rowError, setRowError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let cancelled = false

    const loadCustomers = async () => {
      try {
        setLoadError('')

        const { data } = await api.get('/users', {
          params: { role: 'customer' },
        })

        if (!cancelled) {
          setCustomers(data.users || [])
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err.response?.data?.error ||
              'Could not load customers.'
          )
        }
      }
    }

    loadCustomers()

    return () => {
      cancelled = true
    }
  }, [])

  const handleDelete = async (customer) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${customer.name}"?`
    )

    if (!confirmed) {
      return
    }

    setRowError('')
    setDeletingId(customer._id)

    try {
      await api.delete(`/users/${customer._id}`)

      setCustomers((prev) =>
        prev.filter(
          (customerItem) =>
            customerItem._id !== customer._id
        )
      )
    } catch (err) {
      setRowError(
        err.response?.data?.error ||
          'Could not delete this customer.'
      )
    } finally {
      setDeletingId(null)
    }
  }

  const loading =
    customers === null && !loadError

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Customers</h1>
          <p>View and manage registered customers.</p>
        </div>
      </div>

      {loadError && (
        <p
          className="admin-inline-error"
          role="alert"
        >
          {loadError}
        </p>
      )}

      {rowError && (
        <p
          className="admin-inline-error"
          role="alert"
        >
          {rowError}
        </p>
      )}

      {loading && (
        <p>Loading customers…</p>
      )}

      {!loading &&
        customers?.length === 0 && (
          <div className="empty-state card">
            <h3>No customers yet</h3>
            <p>
              No customers have registered yet.
            </p>
          </div>
        )}

      {customers?.length > 0 && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th aria-label="Actions" />
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer._id}>
                  <td data-label="ID">
                    {customer._id}
                  </td>

                  <td data-label="Name">
                    {customer.name}
                  </td>

                  <td data-label="Email">
                    {customer.email}
                  </td>

                  <td
                    data-label="Actions"
                    className="admin-table-actions"
                  >
                    <button
                      type="button"
                      className="btn btn--danger-ghost btn--sm"
                      onClick={() =>
                        handleDelete(customer)
                      }
                      disabled={
                        deletingId === customer._id
                      }
                    >
                      {deletingId === customer._id
                        ? 'Deleting…'
                        : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ManageCustomers