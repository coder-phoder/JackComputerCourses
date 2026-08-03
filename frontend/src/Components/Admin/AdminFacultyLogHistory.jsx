import axios from 'axios'
import { useEffect, useState } from 'react'
import { formatHistoryDate, formatHistoryTime, getLogoutLabel } from '../../utils/loginHistory'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const AdminFacultyLogHistory = ({ faculty, onClose }) => {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isActive = true

    const fetchHistory = async () => {
      setLoading(true)
      setError('')

      try {
        const response = await axios.get(`${API_BASE_URL}/admin/faculties/${faculty._id}/login-history`, {
          withCredentials: true,
        })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to fetch login history')
        }

        if (isActive) {
          setHistory(response.data?.data?.history || [])
        }
      } catch (fetchError) {
        if (isActive) {
          setError(fetchError?.response?.data?.message || 'Unable to fetch login history. Please try again.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchHistory()

    return () => {
      isActive = false
    }
  }, [faculty._id])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close login history"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Login History</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {String(faculty.name || '').trim() || 'Unnamed faculty'} · {faculty.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-500"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              Loading login history...
            </div>
          ) : error ? (
            <p className="m-6 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
              {error}
            </p>
          ) : history.length ? (
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Logout
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {history.map((entry) => (
                  <tr key={entry._id}>
                    <td className="px-6 py-4 align-top">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatHistoryDate(entry.loginAt)}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                        {formatHistoryTime(entry.loginAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatHistoryDate(entry.logoutAt)}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                        {formatHistoryTime(entry.logoutAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          entry.isActive
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {getLogoutLabel(entry)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              No login history found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminFacultyLogHistory
