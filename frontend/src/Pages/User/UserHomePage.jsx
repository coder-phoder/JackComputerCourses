import axios from 'axios'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import RoleProfileShowcase from '../../Components/Common/RoleProfileShowcase'
import PageTour from '../../Components/Tour/PageTour'
import UserNavbar from '../../Components/User/UserNavbar'
import userHomePageTour from '../Tour/User/UserHomePageTour'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const UserHomePage = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userProfile, setUserProfile] = useState(null)
  // Only an account that has never seen it gets the walkthrough unasked; the button
  // starts the same one again whenever the site stops making sense.
  const [firstRun, setFirstRun] = useState(false)

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
        setUserProfile(user)
        setFirstRun(Boolean(user.requiresTour))
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

  // Closing the first run is what retires it for this account. A replay has nothing
  // left to save, and a failed write only means the account is greeted once more.
  const markWalkthroughSeen = async () => {
    if (!firstRun) {
      return
    }

    setFirstRun(false)

    try {
      await axios.patch(`${API_BASE_URL}/user/tour`, {}, {
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

  if (!isAuthorized || auth.role !== 'user') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <UserNavbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-end">
          <PageTour steps={userHomePageTour} autoStart={firstRun} onClose={markWalkthroughSeen} />
        </div>

        <RoleProfileShowcase role="user" profile={userProfile || auth} />
      </main>
    </div>
  )
}

export default UserHomePage
