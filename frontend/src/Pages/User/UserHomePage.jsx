import axios from 'axios'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import UserNavbar from '../../Components/User/UserNavbar'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = 'http://localhost:4000'

const UserHomePage = () => {
  const { auth, clearAuth, setAuth } = useAuth()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

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

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans">
        <p className="text-sm font-semibold text-slate-600">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized || auth.role !== 'user') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <UserNavbar />

      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
            User Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Welcome, {auth.phone}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600">
            You are logged in as a user. This is your course home page.
          </p>
        </section>
      </main>
    </div>
  )
}

export default UserHomePage
