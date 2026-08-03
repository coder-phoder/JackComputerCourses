import axios from 'axios'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import UserAttendanceCalendar from '../../Components/User/UserAttendanceCalendar'
import UserAttendanceLog from '../../Components/User/UserAttendanceLog'
import UserAttendanceSummary from '../../Components/User/UserAttendanceSummary'
import UserAttendanceTrend from '../../Components/User/UserAttendanceTrend'
import UserNavbar from '../../Components/User/UserNavbar'
import { useAuth } from '../../Context/AuthContext'
import {
  STATUS_META,
  addMonths,
  getMonthLabel,
  isSameMonthKey,
  startOfMonth,
  summarizeAttendance,
  toDateKey,
  toMonthKey,
} from '../../utils/attendance'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const monthDateFromKey = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number)

  return new Date(year, month - 1, 1)
}

// Opening another month should land on a day worth reading: today when the month
// is the running one, otherwise the last day that was actually marked.
const getFocusDay = (monthKey, records) => {
  const todayKey = toDateKey(new Date())

  if (isSameMonthKey(todayKey, monthKey)) {
    return todayKey
  }

  return records.at(-1)?.date || `${monthKey}-01`
}

const UserAttendancePage = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [records, setRecords] = useState([])
  const [trend, setTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState('')

  const monthKey = toMonthKey(monthDate)
  const thisMonthKey = toMonthKey(new Date())
  const isLatestMonth = monthKey >= thisMonthKey

  const fetchAttendance = useCallback(async (requestedMonth, options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoading(true)
      setError('')
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/user/attendance`, {
        params: { month: requestedMonth },
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to fetch attendance')
      }

      if (!shouldUpdate()) {
        return
      }

      // A day marked before the statuses were narrowed down reads as unmarked
      // instead of breaking the month.
      const monthRecords = (response.data?.data?.attendance || [])
        .filter((record) => STATUS_META[record.status])

      setRecords(monthRecords)
      setTrend(response.data?.data?.trend || [])
      setSelectedDate((current) => (
        isSameMonthKey(current, requestedMonth)
          ? current
          : getFocusDay(requestedMonth, monthRecords)
      ))
    } catch (fetchError) {
      if (!shouldUpdate()) {
        return
      }

      if (isAuthError(fetchError)) {
        clearAuth()
        setIsAuthorized(false)
        return
      }

      setRecords([])
      setError(getErrorMessage(fetchError, 'Unable to fetch your attendance. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoading(false)
        setHasLoaded(true)
      }
    }
  }, [clearAuth])

  useEffect(() => {
    let isActive = true

    const verifyUser = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/user/profile`, {
          withCredentials: true,
        })

        const user = response.data?.data?.user

        if (!response.data?.success || user?.role !== 'user') {
          throw new Error('Unauthorized user')
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: 'user',
          phone: user.phone,
          token: null,
        })
        setIsAuthorized(true)
      } catch {
        if (!isActive) {
          return
        }

        clearAuth()
        setIsAuthorized(false)
      } finally {
        if (isActive) {
          setCheckingAuth(false)
        }
      }
    }

    verifyUser()

    return () => {
      isActive = false
    }
  }, [clearAuth, setAuth])

  // One read per visible month, so every card on the page shows the same slice.
  useEffect(() => {
    if (!isAuthorized) {
      return undefined
    }

    let isActive = true

    const loadMonth = async () => {
      await fetchAttendance(monthKey, { shouldUpdate: () => isActive })
    }

    loadMonth()

    return () => {
      isActive = false
    }
  }, [fetchAttendance, isAuthorized, monthKey])

  const statusByDate = useMemo(() => (
    records.reduce((days, record) => ({ ...days, [record.date]: record.status }), {})
  ), [records])

  const summary = useMemo(() => summarizeAttendance(records), [records])

  // -1 and 1 are the arrows beside the month name; 0 is the Today button, which
  // jumps back to the running month and reselects today.
  const handleMonthChange = (delta) => {
    setMonthDate((current) => (delta ? addMonths(current, delta) : startOfMonth(new Date())))

    if (!delta) {
      setSelectedDate(toDateKey(new Date()))
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'user') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <UserNavbar />

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              User Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">My Attendance</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Every day your faculty marked for {auth.phone}, month by month.
            </p>
          </div>

          {/* One control row above the whole page: the month it names is the month
              every card below is drawn from. */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleMonthChange(-1)}
              aria-label="Previous month"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-300"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <span className="inline-flex min-w-44 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              {getMonthLabel(monthDate)}
            </span>

            <button
              type="button"
              onClick={() => handleMonthChange(1)}
              disabled={isLatestMonth}
              aria-label="Next month"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-300 dark:disabled:text-slate-600 dark:disabled:hover:border-slate-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => handleMonthChange(0)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-600 dark:hover:text-blue-300"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => fetchAttendance(monthKey)}
              disabled={loading}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-600 dark:hover:text-blue-300 dark:disabled:text-slate-600"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error ? (
          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchAttendance(monthKey)}
              disabled={loading}
              className="rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:border-red-300 dark:hover:border-red-700 disabled:cursor-not-allowed disabled:text-red-300 dark:disabled:text-red-500"
            >
              Retry
            </button>
          </div>
        ) : null}

        {hasLoaded ? (
          // A refetch holds the month that is already on screen and only dims it,
          // so switching months never collapses the page into a skeleton.
          <div className={`space-y-5 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <UserAttendanceSummary summary={summary} monthLabel={getMonthLabel(monthDate)} />

            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
              <UserAttendanceCalendar
                monthDate={monthDate}
                statusByDate={statusByDate}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                loading={loading}
              />

              <UserAttendanceLog
                records={records}
                selectedDate={selectedDate}
                monthLabel={getMonthLabel(monthDate)}
                onSelectDate={setSelectedDate}
              />
            </div>

            {trend.length ? (
              <UserAttendanceTrend
                trend={trend}
                monthKey={monthKey}
                onSelectMonth={(nextMonthKey) => setMonthDate(monthDateFromKey(nextMonthKey))}
              />
            ) : null}
          </div>
        ) : (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-16 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              Loading your attendance...
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

export default UserAttendancePage
