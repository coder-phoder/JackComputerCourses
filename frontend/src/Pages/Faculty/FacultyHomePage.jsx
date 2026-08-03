import axios from 'axios'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import RoleProfileShowcase from '../../Components/Common/RoleProfileShowcase'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import PageTour from '../../Components/Tour/PageTour'
import facultyHomePageTour from '../Tour/Faculty/FacultyHomePageTour'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const FacultyHomePage = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [facultyProfile, setFacultyProfile] = useState(null)
  // Only an account that has never seen it gets the walkthrough unasked; the button
  // starts the same one again whenever the site stops making sense.
  const [firstRun, setFirstRun] = useState(false)

  useEffect(() => {
    let isActive = true

    const verifyFaculty = async () => {
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

    verifyFaculty()

    return () => {
      isActive = false
    }
  }, [clearAuth, setAuth])

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

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-end">
          <PageTour steps={facultyHomePageTour} autoStart={firstRun} onClose={markWalkthroughSeen} />
        </div>

        <RoleProfileShowcase role="faculty" profile={facultyProfile || auth} />
      </main>
    </div>
  )
}

export default FacultyHomePage
