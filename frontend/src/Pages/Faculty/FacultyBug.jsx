import { useCallback, useState } from 'react'
import { Navigate } from 'react-router-dom'
import BugReportBoard from '../../Components/Common/BugReportBoard'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import PageTour from '../../Components/Tour/PageTour'
import facultyBugPageTour from '../Tour/Faculty/FacultyBugPageTour'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL
const BUGS_URL = `${API_BASE_URL}/faculty/bugs`

const FacultyBug = () => {
  const { auth, clearAuth } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(true)

  const handleAuthError = useCallback(() => {
    clearAuth()
    setIsAuthorized(false)
  }, [clearAuth])

  if (!isAuthorized || auth.role !== 'faculty') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <FacultyNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bugs</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Report anything that is not working and track what you have already sent.
            </p>
          </div>

          <PageTour steps={facultyBugPageTour} />
        </div>

        <BugReportBoard apiBaseUrl={BUGS_URL} accent="indigo" onAuthError={handleAuthError} />
      </main>
    </div>
  )
}

export default FacultyBug
