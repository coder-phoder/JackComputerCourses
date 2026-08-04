import axios from 'axios'
import { MotionConfig, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AdminCommandPalette from '../../Components/Admin/AdminCommandPalette'
import AdminHomeAttendance from '../../Components/Admin/AdminHomeAttendance'
import AdminHomeConsole from '../../Components/Admin/AdminHomeConsole'
import AdminHomeSystems from '../../Components/Admin/AdminHomeSystems'
import AdminHomeTriage from '../../Components/Admin/AdminHomeTriage'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import CourseListPanel from '../../Components/Common/CourseListPanel'
import { useAuth } from '../../Context/AuthContext'
import { STATUS_META, getMonthKeyLabel, toDateKey } from '../../utils/attendance'
import { staggerParent } from '../../utils/motion'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const AdminHomePage = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [adminProfile, setAdminProfile] = useState(null)
  const [users, setUsers] = useState([])
  const [faculties, setFaculties] = useState([])
  const [courses, setCourses] = useState([])
  const [bugs, setBugs] = useState([])
  const [requests, setRequests] = useState([])
  const [records, setRecords] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')
  const [paletteOpen, setPaletteOpen] = useState(false)

  // Today and its month are fixed at mount: a console left open overnight keeps
  // reporting the day it was opened on rather than silently sliding onto the next one.
  // The month is sliced off the day key rather than reparsed, so no timezone can move it.
  const [today] = useState(() => toDateKey(new Date()))
  const monthKey = today.slice(0, 7)
  const monthLabel = getMonthKeyLabel(monthKey)

  // The queues are counted here as well as read below, because the deck badges and the
  // triage list have to agree: both are the same two lists, counted once.
  const badges = useMemo(() => ({
    passwordRequests: requests.filter((request) => request.status === 'pending').length,
    bugs: bugs.filter((bug) => bug.status === 'open').length,
  }), [bugs, requests])

  const decisions = badges.passwordRequests + badges.bugs

  // Six reads, one spinner, one retry: nothing on this page means anything on its own,
  // so the console arrives whole or not at all.
  const loadConsole = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingData(true)
      setError('')
    }

    try {
      const responses = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/users`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/admin/faculties`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/admin/courses`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/admin/bugs`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/admin/password-requests`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/admin/attendance`, {
          params: { month: monthKey },
          withCredentials: true,
        }),
      ])

      if (responses.some((response) => !response.data?.success)) {
        throw new Error('Unable to load the console')
      }

      if (!shouldUpdate()) {
        return
      }

      const [usersResponse, facultiesResponse, coursesResponse, bugsResponse, requestsResponse, attendanceResponse] = responses

      setUsers(usersResponse.data?.data?.users || [])
      setFaculties(facultiesResponse.data?.data?.faculties || [])
      setCourses(coursesResponse.data?.data?.courses || [])
      setBugs(bugsResponse.data?.data?.bugs || [])
      setRequests(requestsResponse.data?.data?.requests || [])
      // A day marked before the statuses were narrowed down reads as unmarked instead
      // of being counted as an absence it never was.
      setRecords((attendanceResponse.data?.data?.attendance || [])
        .filter((record) => STATUS_META[record.status]))
    } catch (loadError) {
      if (!shouldUpdate()) {
        return
      }

      if (isAuthError(loadError)) {
        clearAuth()
        setIsAuthorized(false)
        return
      }

      setError(getErrorMessage(loadError, 'Unable to load the console. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoadingData(false)
      }
    }
  }, [clearAuth, monthKey])

  useEffect(() => {
    let isActive = true

    const verifyAdminAndLoad = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/admin/profile`, {
          withCredentials: true,
        })

        const admin = response.data?.data?.admin

        if (!response.data?.success || admin?.role !== 'admin') {
          throw new Error('Unauthorized admin')
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: 'admin',
          phone: admin.phone,
          token: null,
        })
        setAdminProfile(admin)
        setIsAuthorized(true)
        setCheckingAuth(false)
        await loadConsole({ shouldUpdate: () => isActive })
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

    verifyAdminAndLoad()

    return () => {
      isActive = false
    }
  }, [clearAuth, loadConsole, setAuth])

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminNavbar />

      {/* One setting hands the whole console over to a reader who asked for less
          motion, so no card below has to carry the check itself. */}
      <MotionConfig reducedMotion="user">
        <motion.main
          variants={staggerParent(0.1)}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8"
        >
          <AdminHomeConsole
            phone={adminProfile?.phone || auth.phone}
            decisions={decisions}
            badges={badges}
            loading={loadingData}
            onOpenCommands={() => setPaletteOpen(true)}
          />

          {error ? (
            <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => loadConsole()}
                disabled={loadingData}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:text-red-300 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:border-red-700 dark:disabled:text-red-500"
              >
                {loadingData ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          ) : null}

          {/* Somebody is waiting on both of these: a decision that has not been made,
              and a register that has not been marked. Everything below them is only
              worth knowing. */}
          <div className="grid items-stretch gap-5 xl:grid-cols-12">
            <div id="admin-triage" className="scroll-mt-24 xl:col-span-7">
              <AdminHomeTriage requests={requests} bugs={bugs} loading={loadingData} />
            </div>

            <div className="xl:col-span-5">
              <AdminHomeAttendance
                records={records}
                rosterSize={users.length}
                today={today}
                monthLabel={monthLabel}
                loading={loadingData}
              />
            </div>
          </div>

          <AdminHomeSystems
            users={users}
            faculties={faculties}
            courses={courses}
            loading={loadingData}
          />

          <CourseListPanel
            title="Newest courses"
            subtitle={loadingData
              ? 'Reading the catalogue...'
              : `${courses.length} ${courses.length === 1 ? 'course' : 'courses'} on the site, newest first`}
            courses={courses}
            loading={loadingData}
            accent="violet"
            browseHref="/admin/courses"
            browseLabel="Manage courses"
            getHref={(course) => `/admin/courses/${course._id}`}
            getChip={(course) => (course.isPublished
              ? { label: 'Published', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' }
              : { label: 'Draft', className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' })}
            emptyHint="Create the first course from the courses page and it will appear here."
          />
        </motion.main>

        {/* The palette belongs to the page rather than to the deck that opens it: the
            shortcut has to work wherever the admin is on this screen. It is portalled
            to the body but stays inside the motion setting the rest of the page reads,
            so it slows down for the same reader. */}
        <AdminCommandPalette
          open={paletteOpen}
          onOpenChange={setPaletteOpen}
          courses={courses}
          badges={badges}
        />
      </MotionConfig>
    </div>
  )
}

export default AdminHomePage
