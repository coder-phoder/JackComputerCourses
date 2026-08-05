import axios from 'axios'
import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { refreshAdminAlerts } from '../../utils/adminAlerts'
import { formatHistoryDate, formatHistoryTime } from '../../utils/loginHistory'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const DECIDED_LABELS = {
  approved: 'Approved',
  declined: 'Declined',
}

// Approving a request either resets an existing password or registers the phone
// as a new user, so the admin sees which one a decision will do.
const AdminPasswordRequests = ({ isOpen, onToggle, onUserChanged }) => {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyRequestId, setBusyRequestId] = useState('')

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === 'pending'),
    [requests],
  )
  const decidedRequests = useMemo(
    () => requests.filter((request) => request.status !== 'pending'),
    [requests],
  )

  const fetchRequests = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoading(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/admin/password-requests`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch password requests')
      }

      if (shouldUpdate()) {
        setRequests(response.data?.data?.requests || [])
      }
    } catch (fetchError) {
      if (shouldUpdate()) {
        setError(getErrorMessage(fetchError, 'Unable to fetch password requests. Please try again.'))
      }
    } finally {
      if (shouldUpdate()) {
        setLoading(false)
      }
    }
  }, [])

  // Loaded even while collapsed, because the header count is what tells the admin
  // there is something to open this panel for.
  useEffect(() => {
    let isActive = true

    const loadRequests = async () => {
      await fetchRequests({ shouldUpdate: () => isActive })
    }

    loadRequests()

    return () => {
      isActive = false
    }
  }, [fetchRequests])

  const decideRequest = async (request, decision) => {
    setError('')
    setSuccess('')
    setBusyRequestId(request._id)

    try {
      const response = await axios.patch(
        `${API_BASE_URL}/admin/password-requests/${request._id}/${decision}`,
        {},
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update the request')
      }

      const decidedRequest = response.data?.data?.request

      setRequests((currentRequests) => currentRequests.map((currentRequest) => (
        currentRequest._id === request._id ? decidedRequest || currentRequest : currentRequest
      )))
      setSuccess(response.data.message)
      // One request left the queue, so the navbar badge drops with it.
      refreshAdminAlerts()

      // Approving can add a user or change one, so the list beside this card
      // is refreshed from the server rather than patched by hand.
      if (decision === 'approve') {
        await onUserChanged?.()
      }
    } catch (decideError) {
      setError(getErrorMessage(decideError, 'Unable to update the request. Please try again.'))
    } finally {
      setBusyRequestId('')
    }
  }

  const removeRequest = async (request) => {
    setError('')
    setSuccess('')
    setBusyRequestId(request._id)

    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/password-requests/${request._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to remove the request')
      }

      setRequests((currentRequests) => currentRequests.filter(
        (currentRequest) => currentRequest._id !== request._id,
      ))
      setSuccess('Password request removed successfully.')
    } catch (removeError) {
      setError(getErrorMessage(removeError, 'Unable to remove the request. Please try again.'))
    } finally {
      setBusyRequestId('')
    }
  }

  return (
    <section data-tour="admin-password-requests" className={`flex flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm ${isOpen ? 'min-h-0 flex-1' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex shrink-0 items-start justify-between gap-3 px-6 py-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
      >
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Password Requests</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Approving sets the password the requester chose.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {pendingRequests.length ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
              {pendingRequests.length}
            </span>
          ) : null}
          <ChevronDown className={`h-5 w-5 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen ? (
        <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-200 dark:border-slate-800 px-6 py-5">
          {loading ? (
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Loading password requests...
            </p>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Pending
                  </h3>
                  <button
                    type="button"
                    onClick={fetchRequests}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300"
                  >
                    Refresh
                  </button>
                </div>

                {pendingRequests.length ? (
                  pendingRequests.map((request) => {
                    const isBusy = busyRequestId === request._id

                    return (
                      <div
                        key={request._id}
                        className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {request.name}
                            </p>
                            <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                              {request.phone}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-xs font-semibold ${
                              request.hasAccount
                                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
                                : 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                            }`}
                          >
                            {request.hasAccount ? 'Password reset' : 'New account'}
                          </span>
                        </div>

                        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                          {formatHistoryDate(request.createdAt)} · {formatHistoryTime(request.createdAt)}
                        </p>

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            onClick={() => decideRequest(request, 'approve')}
                            disabled={isBusy || Boolean(busyRequestId)}
                            className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:disabled:bg-emerald-900"
                          >
                            {isBusy ? 'Working...' : 'Accept'}
                          </button>
                          <button
                            type="button"
                            onClick={() => decideRequest(request, 'decline')}
                            disabled={isBusy || Boolean(busyRequestId)}
                            className="flex-1 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:border-red-300 dark:hover:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/60 disabled:cursor-not-allowed disabled:text-red-300 dark:disabled:text-red-500"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-4 py-6 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                    No pending requests.
                  </p>
                )}
              </div>

              {decidedRequests.length ? (
                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    History
                  </h3>

                  {decidedRequests.map((request) => {
                    const isApproved = request.status === 'approved'
                    const decidedAt = isApproved ? request.approvedAt : request.declinedAt

                    return (
                      <div
                        key={request._id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {request.name}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                            {request.phone} · {formatHistoryDate(decidedAt)} {formatHistoryTime(decidedAt)}
                          </p>
                          {isApproved ? (
                            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                              {request.createdAccount ? 'Account created' : 'Password updated'}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              isApproved
                                ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {DECIDED_LABELS[request.status]}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRequest(request)}
                            disabled={Boolean(busyRequestId)}
                            className="text-xs font-semibold text-slate-500 dark:text-slate-400 transition hover:text-red-600 dark:hover:text-red-400 disabled:cursor-not-allowed disabled:text-slate-300 dark:disabled:text-slate-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </>
          )}

          {error ? (
            <p className="mt-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="mt-5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              {success}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export default AdminPasswordRequests
