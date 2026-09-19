import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../services/api'
import './Admin.css'
import '../customer/Certificate.css'

const AdminCertificate = () => {
  const { resultId } = useParams()

  const [result, setResult] = useState(null)
  const [certificate, setCertificate] = useState(null)
  const [error, setError] = useState('')
  const [errorStatus, setErrorStatus] = useState(null)

  const printTriggeredRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setError('')
        setErrorStatus(null)

        // Load the result first
        const { data: resultData } = await api.get(
          `/results/${resultId}`
        )

        if (cancelled) return

        const loadedResult = resultData.result
        setResult(loadedResult)

        if (loadedResult.status !== 'Pass') {
          return
        }

        // Get or create the certificate
        const { data: certificateData } = await api.post(
          `/certificates/result/${resultId}`
        )

        if (!cancelled) {
          setCertificate(certificateData.certificate)
        }
      } catch (err) {
        if (!cancelled) {
          setErrorStatus(err.response?.status ?? null)

          setError(
            err.response?.data?.error ||
              'Could not load this certificate.'
          )
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [resultId])

  const handlePrint = async () => {
    if (
      !printTriggeredRef.current &&
      certificate
    ) {
      printTriggeredRef.current = true

      try {
        await api.patch(
          `/certificates/${certificate._id}/download`
        )
      } catch {
        printTriggeredRef.current = false
      }
    }

    window.print()
  }

  if (error) {
    return (
      <div className="card empty-state">
        <h3>
          {errorStatus === 403
            ? "You don't have permission to view this certificate"
            : "Couldn't load this certificate"}
        </h3>

        <p>{error}</p>

        <Link
          to="/admin/certificates"
          className="btn btn--primary"
          style={{ marginTop: 16 }}
        >
          Back to Certificates
        </Link>
      </div>
    )
  }

  if (!result) {
    return <p>Loading certificate…</p>
  }

  if (result.status !== 'Pass') {
    return (
      <div className="card empty-state">
        <h3>No certificate available</h3>

        <p>
          Certificates are only issued for passing
          evaluations. This attempt scored{' '}
          {result.percentage}%.
        </p>

        <Link
          to="/admin/certificates"
          className="btn btn--primary"
          style={{ marginTop: 16 }}
        >
          Back to Certificates
        </Link>
      </div>
    )
  }

  if (!certificate) {
    return <p>Generating certificate…</p>
  }

  return (
    <div className="certificate-page">
      <div className="certificate-page-actions">
        <Link
          to="/admin/certificates"
          className="btn btn--ghost btn--sm"
        >
          ← Back to Certificates
        </Link>

        <button
          type="button"
          className="btn btn--primary"
          onClick={handlePrint}
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="certificate-sheet">
        <p className="certificate-eyebrow">
          Certificate of Completion
        </p>

        <h1 className="certificate-title">
          IT Quiz
        </h1>

        <p className="certificate-subtitle">
          Verified Professional Credential
        </p>

        <p className="certificate-presented-to-label">
          This certifies that
        </p>

        <p className="certificate-recipient">
          {result.customer?.name || 'Student'}
        </p>

        <div className="certificate-divider" />

        <p className="certificate-body-text">
          has successfully completed the official{' '}
          <strong>{result.difficulty}</strong>{' '}
          certification evaluation in{' '}
          <strong>
            {result.category?.category_name ||
              'this category'}
          </strong>
          , achieving a score of{' '}
          <strong>{result.percentage}%</strong>.
        </p>

        <div className="certificate-meta-row">
          <div>
            <p className="certificate-meta-label">
              Certificate No.
            </p>

            <p className="certificate-meta-value">
              {certificate.certificateNumber}
            </p>
          </div>

          <div>
            <p className="certificate-meta-label">
              Issued
            </p>

            <p className="certificate-meta-value">
              {new Date(
                certificate.issueDate
              ).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminCertificate