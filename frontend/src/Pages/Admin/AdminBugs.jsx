import axios from 'axios'
import { Check, Loader2, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import BugImageGallery from '../../Components/Common/BugImageGallery'
import BugStatusBadge from '../../Components/Common/BugStatusBadge'
import { formatBugDateTime, getBugDecisionAt, getBugDecisionLabel, isHistoryBug } from '../../Components/Common/bugStatus'
import PageTour from '../../Components/Tour/PageTour'
import adminBugsPageTour from '../Tour/Admin/AdminBugsPageTour'
import { useAuth } from '../../Context/AuthContext'
import { refreshAdminAlerts } from '../../utils/adminAlerts'

const API_BASE_URL = import.meta.env.VITE_BASE_URL
const BUGS_URL = `${API_BASE_URL}/admin/bugs`

const HISTORY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'declined', label: 'Declined' },
]

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const AdminBugs = () => {
  const { auth, clearAuth } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(true)
  const [bugs, setBugs] = useState([])
  const [historyFilter, setHistoryFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleAuthError = useCallback(() => {
    clearAuth()
    setIsAuthorized(false)
  }, [clearAuth])

  const handleRequestError = useCallback((requestError, fallback) => {
    if (isAuthError(requestError)) {
      handleAuthError()
      return
    }

    setError(getErrorMessage(requestError, fallback))
  }, [handleAuthError])

  useEffect(() => {
    let isActive = true

    const fetchBugs = async () => {
      try {
        const response = await axios.get(BUGS_URL, { withCredentials: true })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to load bug reports')
        }

        if (isActive) {
          setBugs(response.data?.data?.bugs || [])
        }
      } catch (fetchError) {
        if (isActive) {
          handleRequestError(fetchError, 'Unable to load bug reports.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchBugs()

    return () => {
      isActive = false
    }
  }, [handleRequestError])

  const openBugs = useMemo(() => bugs.filter((bug) => !isHistoryBug(bug)), [bugs])
  const historyBugs = useMemo(() => bugs.filter(isHistoryBug), [bugs])

  const historyCounts = useMemo(() => ({
    all: historyBugs.length,
    resolved: historyBugs.filter((bug) => bug.status === 'resolved').length,
    declined: historyBugs.filter((bug) => bug.status === 'declined').length,
  }), [historyBugs])

  const filteredHistory = useMemo(() => (
    historyFilter === 'all' ? historyBugs : historyBugs.filter((bug) => bug.status === historyFilter)
  ), [historyBugs, historyFilter])

  // Resolving and declining both move the report into history rather than
  // deleting it, so the reporter keeps a record of the outcome.
  const handleDecision = async (bugId, decision) => {
    setBusyId(bugId)
    setError('')
    setSuccess('')

    try {
      const response = await axios.patch(`${BUGS_URL}/${bugId}/${decision}`, {}, { withCredentials: true })

      if (!response.data?.success) {
        throw new Error(response.data?.message || `Unable to ${decision} the bug`)
      }

      const updatedBug = response.data.data.bug

      setBugs((currentBugs) => currentBugs.map((bug) => (bug._id === bugId ? updatedBug : bug)))
      setSuccess(`Bug ${updatedBug.status}. It has moved to history.`)
      // The report left the open queue, so the navbar badge drops with it.
      refreshAdminAlerts()
    } catch (decisionError) {
      handleRequestError(decisionError, `Unable to ${decision} the bug. Please try again.`)
    } finally {
      setBusyId('')
    }
  }

  const handleRemove = async (bugId) => {
    setBusyId(bugId)
    setError('')
    setSuccess('')

    try {
      const response = await axios.delete(`${BUGS_URL}/${bugId}`, { withCredentials: true })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to remove the bug')
      }

      setBugs((currentBugs) => currentBugs.filter((bug) => bug._id !== bugId))
      setSuccess('Bug report removed for everyone.')
    } catch (removeError) {
      handleRequestError(removeError, 'Unable to remove the bug. Please try again.')
    } finally {
      setBusyId('')
    }
  }

  // Both lists render through here, so the walkthrough anchor is pinned to the first
  // row of the open queue: the one report that always has a decision still on it.
  const renderBug = (bug, index) => {
    const isBusy = busyId === bug._id
    const decidedAt = getBugDecisionAt(bug)
    const isFirstOpenBug = !index && !isHistoryBug(bug)

    return (
      <li key={bug._id} className="px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">{bug.title}</p>
              <BugStatusBadge status={bug.status} />
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {bug.reporterName || 'Unknown'} ({bug.reporterRole}) · {bug.reporterPhone} · {formatBugDateTime(bug.createdAt)}
              {decidedAt ? ` · ${getBugDecisionLabel(bug)} on ${formatBugDateTime(decidedAt)}` : ''}
            </p>
          </div>

          <div data-tour={isFirstOpenBug ? 'admin-bug-actions' : undefined} className="flex gap-2">
            {bug.status !== 'resolved' ? (
              <button
                type="button"
                onClick={() => handleDecision(bug._id, 'resolve')}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Resolve
              </button>
            ) : null}

            {bug.status === 'open' ? (
              <button
                type="button"
                onClick={() => handleDecision(bug._id, 'decline')}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <X className="h-4 w-4" />
                Decline
              </button>
            ) : null}

            {isHistoryBug(bug) ? (
              <button
                type="button"
                onClick={() => handleRemove(bug._id)}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900/60 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:border-red-400 dark:hover:border-red-700 disabled:cursor-not-allowed disabled:text-red-300"
              >
                {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove
              </button>
            ) : null}
          </div>
        </div>

        {bug.description ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">
            {bug.description}
          </p>
        ) : null}

        <BugImageGallery
          imagesUrl={`${BUGS_URL}/${bug._id}/images`}
          count={bug.imageCount}
          onAuthError={handleAuthError}
        />
      </li>
    )
  }

  if (!isAuthorized || auth.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bug Reports</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Resolve or decline an open report to move it into history. Removing a report deletes it for everyone.
            </p>
          </div>

          <PageTour steps={adminBugsPageTour} />
        </div>

        {error ? (
          <p className="mb-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mb-5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {success}
          </p>
        ) : null}

        <div className="space-y-6">
          <section data-tour="admin-bugs-open" className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Open Reports</h2>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {openBugs.length} waiting
              </span>
            </div>

            {loading ? (
              <p className="flex items-center gap-2 px-6 py-8 text-sm font-medium text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading bug reports...
              </p>
            ) : null}

            {!loading && !openBugs.length ? (
              <p className="px-6 py-8 text-sm font-medium text-slate-500 dark:text-slate-400">
                No open bug reports.
              </p>
            ) : null}

            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {openBugs.map(renderBug)}
            </ul>
          </section>

          <section data-tour="admin-bugs-history" className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">History</h2>

              <div className="flex flex-wrap gap-2">
                {HISTORY_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setHistoryFilter(filter.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      historyFilter === filter.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                        : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                  >
                    {filter.label} ({historyCounts[filter.value]})
                  </button>
                ))}
              </div>
            </div>

            {!loading && !filteredHistory.length ? (
              <p className="px-6 py-8 text-sm font-medium text-slate-500 dark:text-slate-400">
                No decided bug reports to show.
              </p>
            ) : null}

            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredHistory.map(renderBug)}
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}

export default AdminBugs
