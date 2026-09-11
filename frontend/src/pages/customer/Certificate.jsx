import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import './Customer.css'
import './Certificate.css'

/**
 * /customer/certificate/:resultId — reached from Results.jsx's "View
 * Certificate" link, which only renders when result.status === 'Pass',
 * but this page re-fetches and re-checks that itself rather than trusting
 * the referring page, since it's reachable directly by URL too (a
 * bookmarked link, browser back/forward, etc.).
 *
 * Two backend calls, in sequence rather than parallel: GET /results/:id
 * first (to read status — generateCertificate 400s on a non-passing
 * result, so checking client-side first avoids a request we already know
 * will fail), then POST /certificates/result/:resultId, which is the
 * idempotent get-or-create described in that route's own comment — safe
 * to call every time this page loads, not just the first time.
 *
 * downloadStatus: markCertificateDownloaded (Phase 6 addition — see that
 * function's own comment in certificateController.js) is called when the
 * user actually prints, not on page load, since "viewed the certificate
 * page" and "downloaded/printed it" are different actions and the field
 * exists to distinguish them.
 */
const Certificate = () => {
  const { resultId } = useParams()
  const { user } = useAuth()

  const [result, setResult] = useState(null)
  const [certificate, setCertificate] = useState(null)
  const [error, setError] = useState('')
  const [errorStatus, setErrorStatus] = useState(null)
  const printTriggeredRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const { data: resultData } = await api.get(`/results/${resultId}`)
        if (cancelled) return

        if (resultData.result.status !== 'Pass') {
          setResult(resultData.result)
          return
        }

        setResult(resultData.result)

        const { data: certData } = await api.post(`/certificates/result/${resultId}`)
        if (!cancelled) setCertificate(certData.certificate)
      } catch (err) {
        if (!cancelled) {
          setErrorStatus(err.response?.status ?? null)
          setError(err.response?.data?.error || 'Could not load your certificate.')
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [resultId])

  const handlePrint = async () => {
    if (!printTriggeredRef.current && certificate) {
      printTriggeredRef.current = true
      // Fire-and-forget-ish: don't block opening the print dialog on this
      // request finishing, but do report a failure if it doesn't succeed
      // rather than silently pretending it did.
      try {
        await api.patch(`/certificates/${certificate._id}/download`)
        setCertificate((prev) => (prev ? { ...prev, downloadStatus: 'Downloaded' } : prev))
      } catch {
        printTriggeredRef.current = false
      }
    }
    window.print()
  }

  if (error) {
    return (
      <div className="card empty-state">
        <h3>{errorStatus === 403 ? "This certificate isn't yours to view" : "Couldn't load your certificate"}</h3>
        <p>{error}</p>
        <Link to="/customer/history" className="btn btn--primary" style={{ marginTop: 16 }}>
          Back to History
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
          Certificates are only issued for passing evaluations. This attempt scored{' '}
          {result.percentage}%.
        </p>
        <Link to={`/customer/results/${resultId}`} className="btn btn--primary" style={{ marginTop: 16 }}>
          Back to Results
        </Link>
      </div>
    )
  }

  if (!certificate) {
    return <p>Generating your certificate…</p>
  }

  return (
    <div className="certificate-page">
      <div className="certificate-page-actions">
        <Link to={`/customer/results/${resultId}`} className="btn btn--ghost btn--sm">
          ← Back to Results
        </Link>
        <button type="button" className="btn btn--primary" onClick={handlePrint}>
          Print / Save as PDF
        </button>
      </div>

      <div className="certificate-sheet">
        <p className="certificate-eyebrow">Certificate of Completion</p>
        <h1 className="certificate-title">IT Quiz</h1>
        <p className="certificate-subtitle">Verified Professional Credential</p>

        <p className="certificate-presented-to-label">This certifies that</p>
        <p className="certificate-recipient">{user?.name}</p>

        <div className="certificate-divider" />

        <p className="certificate-body-text">
          has successfully completed the official{' '}
          <strong>{result.difficulty}</strong> certification evaluation in{' '}
          <strong>{result.category?.category_name ?? 'this category'}</strong>, achieving a score
          of <strong>{result.percentage}%</strong>.
        </p>

        <div className="certificate-meta-row">
          <div>
            <p className="certificate-meta-label">Certificate No.</p>
            <p className="certificate-meta-value">{certificate.certificateNumber}</p>
          </div>
          <div>
            <p className="certificate-meta-label">Issued</p>
            <p className="certificate-meta-value">
              {new Date(certificate.issueDate).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Certificate
