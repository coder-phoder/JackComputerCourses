import axios from 'axios'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PasswordInput from '../../Components/Common/PasswordInput'
import ThemeToggle from '../../Components/Common/ThemeToggle'
import { getPostAuthRedirectPath, useAuth } from '../../Context/AuthContext'
import { SELF_REGISTRATION_ENABLED } from '../../utils/featureFlags'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

const getErrorMessage = (error) => (
  error?.response?.data?.message || 'Unable to login. Please try again.'
)

const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { clearAuth, setAuth } = useAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loginAdmin = async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/admin/login`, credentials, {
      withCredentials: true,
    })

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Admin login failed')
    }

    return response.data.data?.admin
  }

  const loginUser = async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/user/login`, credentials, {
      withCredentials: true,
    })

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'User login failed')
    }

    return response.data.data?.user
  }

  const loginFaculty = async (credentials) => {
    const response = await axios.post(`${API_BASE_URL}/faculty/login`, credentials, {
      withCredentials: true,
    })

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Faculty login failed')
    }

    return response.data.data?.faculty
  }

  const clearExistingSessions = async () => {
    await Promise.all([
      axios.post(`${API_BASE_URL}/admin/logout`, {}, {
        withCredentials: true,
      }),
      axios.post(`${API_BASE_URL}/user/logout`, {}, {
        withCredentials: true,
      }),
      axios.post(`${API_BASE_URL}/faculty/logout`, {}, {
        withCredentials: true,
      }),
    ])

    clearAuth()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedPhone = phone.trim()

    if (!trimmedPhone || !password) {
      setError('Phone and password are required.')
      return
    }

    setLoading(true)
    setError('')

    const credentials = {
      phone: trimmedPhone,
      password,
    }
    const fromLocation = location.state?.from

    try {
      await clearExistingSessions()
    } catch {
      setError('Unable to reset the previous session. Please try again.')
      setLoading(false)
      return
    }

    try {
      const admin = await loginAdmin(credentials)

      setAuth({
        role: 'admin',
        phone: admin?.phone || trimmedPhone,
        token: null,
      })
      navigate(getPostAuthRedirectPath('admin', fromLocation), { replace: true })
    } catch {
      try {
        const user = await loginUser(credentials)

        setAuth({
          role: 'user',
          phone: user?.phone || trimmedPhone,
          token: null,
        })
        navigate(getPostAuthRedirectPath('user', fromLocation), { replace: true })
      } catch (userLoginError) {
        try {
          const faculty = await loginFaculty(credentials)

          setAuth({
            role: 'faculty',
            phone: faculty?.phone || trimmedPhone,
            token: null,
          })
          navigate(getPostAuthRedirectPath('faculty', fromLocation), { replace: true })
        } catch (facultyLoginError) {
          setError(getErrorMessage(facultyLoginError || userLoginError))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-tr from-blue-600 to-indigo-600">
                <span className="text-xl font-bold text-white">J</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
                Jack<span className="text-blue-600">Courses</span>
              </span>
            </Link>
            <h1 className="mt-8 text-3xl font-bold text-slate-900 dark:text-slate-100">Login</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Use your registered phone number and password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Phone
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                placeholder="Enter phone number"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Password
              </label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                placeholder="Enter password"
                disabled={loading}
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {SELF_REGISTRATION_ENABLED ? (
            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
              Don&apos;t have an account?{' '}
              <Link to="/register" state={location.state} className="font-semibold text-blue-600 transition hover:text-blue-700 dark:hover:text-blue-300">
                Sign up
              </Link>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default LoginPage
