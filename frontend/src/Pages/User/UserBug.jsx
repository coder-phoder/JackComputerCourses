import { useCallback, useState } from 'react'
import { Navigate } from 'react-router-dom'
import BugReportBoard from '../../Components/Common/BugReportBoard'
import UserNavbar from '../../Components/User/UserNavbar'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL
const BUGS_URL = `${API_BASE_URL}/user/bugs`

const UserBug = () => {
  const { auth, clearAuth } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(true)

  const handleAuthError = useCallback(() => {
    clearAuth()
    setIsAuthorized(false)
  }, [clearAuth])

  if (!isAuthorized || auth.role !== 'user') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <UserNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Bugs</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Report anything that is not working and track what you have already sent.
          </p>
        </div>

        <BugReportBoard apiBaseUrl={BUGS_URL} accent="blue" onAuthError={handleAuthError} />
      </main>
    </div>
  )
}

export default UserBug
