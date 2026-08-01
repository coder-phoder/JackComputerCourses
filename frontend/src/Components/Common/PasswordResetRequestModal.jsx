import axios from 'axios'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import PasswordInput from './PasswordInput'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

const MIN_PASSWORD_LENGTH = 6

const emptyForm = {
  name: '',
  phone: '',
  password: '',
  confirmPassword: '',
}

const inputClassName = 'w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40 disabled:bg-slate-100 dark:disabled:bg-slate-800'

// Raising a request never says whether the phone is already registered, so the
// modal cannot be used to find out who has an account.
const PasswordResetRequestModal = ({ onClose }) => {
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const name = form.name.trim()
    const phone = form.phone.trim()

    if (!name || !phone || !form.password) {
      setError('Name, phone and password are required.')
      return
    }

    if (form.password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const response = await axios.post(`${API_BASE_URL}/user/password-requests`, {
        name,
        phone,
        password: form.password,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to send the request')
      }

      setForm(emptyForm)
      setSubmitted(true)
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Unable to send the request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Password Request</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              The admin approves every request before the password starts working.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          {submitted ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-slate-100">Request sent</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Once the admin approves it, log in with your phone number and the new password.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Back to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="request-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Name
                </label>
                <input
                  id="request-name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  disabled={submitting}
                  className={`mt-2 ${inputClassName}`}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="request-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Phone
                </label>
                <input
                  id="request-phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  disabled={submitting}
                  className={`mt-2 ${inputClassName}`}
                  placeholder="Enter your phone number"
                />
              </div>

              <div>
                <label htmlFor="request-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  New Password
                </label>
                <PasswordInput
                  id="request-password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  disabled={submitting}
                  className={inputClassName}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                />
              </div>

              <div>
                <label htmlFor="request-confirm-password" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Confirm Password
                </label>
                <PasswordInput
                  id="request-confirm-password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  disabled={submitting}
                  className={inputClassName}
                  placeholder="Re-enter the new password"
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending request...
                  </>
                ) : (
                  'Send Request'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default PasswordResetRequestModal
