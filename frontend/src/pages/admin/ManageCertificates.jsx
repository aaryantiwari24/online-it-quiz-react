import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import './Admin.css'

const ManageCertificates = () => {
  const [certificates, setCertificates] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    const loadCertificates = async () => {
      try {
        setError('')

        const { data } = await api.get('/results', {
          params: {
            status: 'Pass',
          },
        })

        if (!cancelled) {
          setCertificates(data.results || [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.error ||
              'Could not load certificates.'
          )
        }
      }
    }

    loadCertificates()

    return () => {
      cancelled = true
    }
  }, [])

  const handleViewCertificate = (resultId) => {
    navigate(`/admin/certificates/${resultId}`)
  }

  const loading =
    certificates === null && !error

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1>Issued Certificates & Verification</h1>
        </div>
      </div>

      {error && (
        <p
          className="admin-inline-error"
          role="alert"
        >
          {error}
        </p>
      )}

      {loading && (
        <p>Loading certificates…</p>
      )}

      {!loading &&
        certificates?.length === 0 && (
          <div className="empty-state card">
            <h3>No certificates issued yet.</h3>
            <p>
              Certificates will appear here when
              customers pass a quiz.
            </p>
          </div>
        )}

      {certificates?.length > 0 && (
        <div className="card admin-table-card">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cert ID</th>
                <th>Student Name</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Score</th>
                <th>Date Earned</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {certificates.map((result) => (
                <tr key={result._id}>
                  <td data-label="Cert ID">
                    #CERT-{result._id}
                  </td>

                  <td data-label="Student Name">
                    <strong>
                      {result.customer?.name ||
                        'Unknown'}
                    </strong>
                  </td>

                  <td data-label="Category">
                    {result.category?.category_name ||
                      'General'}
                  </td>

                  <td data-label="Difficulty">
                    {result.difficulty || 'Standard'}
                  </td>

                  <td data-label="Score">
                    <strong>
                      {result.percentage}%
                    </strong>
                  </td>

                  <td data-label="Date Earned">
                    {result.attemptDate
                      ? new Date(
                          result.attemptDate
                        ).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          }
                        )
                      : '—'}
                  </td>

                  <td
                    data-label="Actions"
                    className="admin-table-actions"
                  >
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() =>
                        handleViewCertificate(
                          result._id
                        )
                      }
                    >
                      View Certificate
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

export default ManageCertificates