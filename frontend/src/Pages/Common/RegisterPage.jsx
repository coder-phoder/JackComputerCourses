import axios from 'axios'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../Context/AuthContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error) => (
  error?.response?.data?.message || 'Unable to register. Please try again.'
)

const RegisterPage = () => {
  const navigate = useNavigate()
  const { clearAuth, setAuth } = useAuth()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const clearExistingSessions = async () => {
    await Promise.all([
      axios.post(`${API_BASE_URL}/admin/logout`, {}, {
        withCredentials: true,
      }),
      axios.post(`${API_BASE_URL}/user/logout`, {}, {
        withCredentials: true,
      }),
    ])

    clearAuth()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const name = form.name.trim()
    const phone = form.phone.trim()
    const password = form.password

    if (!name || !phone || !password) {
      setError('Name, phone and password are required.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await clearExistingSessions()

      const response = await axios.post(`${API_BASE_URL}/user/register`, {
        name,
        phone,
        password,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Registration failed')
      }

      const user = response.data?.data?.user

      setAuth({
        role: 'user',
        phone: user?.phone || phone,
        token: null,
      })
      navigate('/user/home', { replace: true })
    } catch (registerError) {
      setError(getErrorMessage(registerError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600">
                <span className="text-xl font-bold text-white">J</span>
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900">
                Jack<span className="text-blue-600">Courses</span>
              </span>
            </Link>
            <h1 className="mt-8 text-3xl font-bold text-slate-900">Create Account</h1>
            <p className="mt-2 text-sm text-slate-600">
              Register with your name, phone number and password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                id="register-name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Enter your name"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="register-phone" className="block text-sm font-medium text-slate-700">
                Phone
              </label>
              <input
                id="register-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Enter phone number"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Enter password"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="register-confirm-password" className="block text-sm font-medium text-slate-700">
                Confirm Password
              </label>
              <input
                id="register-confirm-password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Confirm password"
                disabled={loading}
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-600 transition hover:text-blue-700">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
