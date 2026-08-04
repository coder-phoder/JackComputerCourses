import axios from 'axios'
import { MotionConfig, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import CourseListPanel from '../../Components/Common/CourseListPanel'
import FacultyHomeAttendance from '../../Components/Faculty/FacultyHomeAttendance'
import FacultyHomeHeader from '../../Components/Faculty/FacultyHomeHeader'
import FacultyHomeQueries from '../../Components/Faculty/FacultyHomeQueries'
import FacultyHomeQuickLinks from '../../Components/Faculty/FacultyHomeQuickLinks'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import PageTour from '../../Components/Tour/PageTour'
import facultyHomePageTour from '../Tour/Faculty/FacultyHomePageTour'
import { useAuth } from '../../Context/AuthContext'
import { STATUS_META, getAttendanceRate, toDateKey } from '../../utils/attendance'
import { staggerParent } from '../../utils/motion'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const FacultyHomePage = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [facultyProfile, setFacultyProfile] = useState(null)
  // Only an account that has never seen it gets the walkthrough unasked; the button
  // starts the same one again whenever the site stops making sense.
  const [firstRun, setFirstRun] = useState(false)
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState([])
  const [queries, setQueries] = useState([])
  const [courses, setCourses] = useState([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  // Today and its month are fixed at mount: a page left open overnight keeps reporting
  // the day it was opened on rather than silently sliding onto the next one. The month
  // is sliced off the day key rather than reparsed, so no timezone can move it.
  const [today] = useState(() => toDateKey(new Date()))
  const monthKey = today.slice(0, 7)

  // One read of the month serves both the day and the month: today's register is the
  // slice of it dated today, and the standing totals are the whole of it.
  const attendanceToday = useMemo(() => records.reduce((counts, record) => {
    if (record.date !== today) {
      return counts
    }

    return {
      present: counts.present + (record.status === 'present' ? 1 : 0),
      absent: counts.absent + (record.status === 'absent' ? 1 : 0),
    }
  }, { present: 0, absent: 0 }), [records, today])

  const counts = useMemo(() => {
    const present = records.filter((record) => record.status === 'present').length

    return {
      students: students.length,
      courses: courses.length,
      markedThisMonth: records.length,
      presentRate: getAttendanceRate(present, records.length - present),
    }
  }, [courses.length, records, students.length])

  const pendingQueries = useMemo(
    () => queries.filter((query) => query.status === 'pending').length,
    [queries],
  )

  const loadDashboard = useCallback(async (options = {}) => {
    const shouldUpdate = options.shouldUpdate || (() => true)

    if (shouldUpdate()) {
      setLoadingData(true)
      setError('')
    }

    try {
      const [studentsResponse, attendanceResponse, queriesResponse, coursesResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/faculty/attendance/students`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/faculty/attendance`, {
          params: { month: monthKey },
          withCredentials: true,
        }),
        axios.get(`${API_BASE_URL}/faculty/queries`, { withCredentials: true }),
        axios.get(`${API_BASE_URL}/faculty/courses`, { withCredentials: true }),
      ])

      const responses = [studentsResponse, attendanceResponse, queriesResponse, coursesResponse]

      if (responses.some((response) => !response.data?.success)) {
        throw new Error('Unable to load your dashboard')
      }

      if (!shouldUpdate()) {
        return
      }

      setStudents(studentsResponse.data?.data?.students || [])
      // A day marked before the statuses were narrowed down reads as unmarked instead
      // of being counted as an absence it never was.
      setRecords((attendanceResponse.data?.data?.attendance || [])
        .filter((record) => STATUS_META[record.status]))
      setQueries(queriesResponse.data?.data?.queries || [])
      setCourses(coursesResponse.data?.data?.courses || [])
    } catch (loadError) {
      if (!shouldUpdate()) {
        return
      }

      if (isAuthError(loadError)) {
        clearAuth()
        setIsAuthorized(false)
        return
      }

      setError(getErrorMessage(loadError, 'Unable to load your dashboard. Please try again.'))
    } finally {
      if (shouldUpdate()) {
        setLoadingData(false)
      }
    }
  }, [clearAuth, monthKey])

  useEffect(() => {
    let isActive = true

    const verifyFacultyAndLoad = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/faculty/profile`, {
          withCredentials: true,
        })

        const faculty = response.data?.data?.faculty

        if (!response.data?.success || faculty?.role !== 'faculty') {
          throw new Error('Unauthorized faculty')
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: 'faculty',
          phone: faculty.phone,
          token: null,
        })
        setFacultyProfile(faculty)
        setFirstRun(Boolean(faculty.requiresTour))
        setIsAuthorized(true)
        setCheckingAuth(false)
        await loadDashboard({ shouldUpdate: () => isActive })
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

    verifyFacultyAndLoad()

    return () => {
      isActive = false
    }
  }, [clearAuth, loadDashboard, setAuth])

  // Closing the first run is what retires it for this account. A replay has nothing
  // left to save, and a failed write only means the account is greeted once more.
  const markWalkthroughSeen = async () => {
    if (!firstRun) {
      return
    }

    setFirstRun(false)

    try {
      await axios.patch(`${API_BASE_URL}/faculty/tour`, {}, {
        withCredentials: true,
      })
    } catch {
      // Nothing on this page depends on it, so there is nothing to report.
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'faculty') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <FacultyNavbar />

      {/* One setting hands the whole dashboard over to a reader who asked for less
          motion, so no card below has to carry the check itself. */}
      <MotionConfig reducedMotion="user">
        <motion.main
          variants={staggerParent(0.1)}
          initial="hidden"
          animate="visible"
          className="mx-auto max-w-7xl space-y-5 px-4 py-8 sm:px-6 lg:px-8"
        >
          <FacultyHomeHeader
            name={facultyProfile?.name || 'Faculty'}
            phone={facultyProfile?.phone || auth.phone}
            profileId={facultyProfile?._id ? facultyProfile._id.slice(-8).toUpperCase() : 'SECURE'}
            counts={counts}
            loading={loadingData}
          >
            <PageTour steps={facultyHomePageTour} autoStart={firstRun} onClose={markWalkthroughSeen} />
          </FacultyHomeHeader>

          {error ? (
            <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => loadDashboard()}
                disabled={loadingData}
                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 disabled:cursor-not-allowed disabled:text-red-300 dark:border-red-900/60 dark:bg-slate-900 dark:text-red-300 dark:hover:border-red-700 dark:disabled:text-red-500"
              >
                {loadingData ? 'Retrying...' : 'Retry'}
              </button>
            </div>
          ) : null}

          {/* The two things that can be owed to somebody right now, side by side and
              above everything that is only worth knowing. */}
          <div className="grid items-stretch gap-5 lg:grid-cols-2">
            <FacultyHomeAttendance
              present={attendanceToday.present}
              absent={attendanceToday.absent}
              totalStudents={students.length}
              loading={loadingData}
            />

            <FacultyHomeQueries queries={queries} loading={loadingData} />
          </div>

          <FacultyHomeQuickLinks badges={{ pendingQueries }} />

          {/* Every course listed here is published, so the chip carries the thing that
              does differ between them: who the course is open to. */}
          <CourseListPanel
            title="Courses on the site"
            subtitle={loadingData
              ? 'Loading the catalogue...'
              : `${courses.length} live ${courses.length === 1 ? 'course' : 'courses'} your students can be given`}
            courses={courses}
            loading={loadingData}
            accent="indigo"
            browseHref="/faculty/courses"
            getHref={(course) => `/faculty/courses/${course._id}`}
            getChip={(course) => (course.isOpenToAll
              ? { label: 'Open to all', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300' }
              : { label: 'Restricted', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' })}
            emptyHint="Courses appear here as soon as an admin publishes one."
          />
        </motion.main>
      </MotionConfig>
    </div>
  )
}

export default FacultyHomePage
