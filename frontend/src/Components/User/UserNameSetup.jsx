import axios from 'axios'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import ThemeToggle from '../Common/ThemeToggle'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

const inputClassName = 'mt-2 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/40'

// Accounts created before names were split hold a single word, so this screen
// stands in front of every user route until both halves are saved once.
const UserNameSetup = ({ onComplete }) => {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()

    if (!trimmedFirstName || !trimmedLastName) {
      setError('First name and last name are required.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const response = await axios.patch(`${API_BASE_URL}/user/name`, {
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save your name')
      }

      onComplete()
    } catch (saveError) {
      setError(saveError?.response?.data?.message || 'Unable to save your name. Please try again.')
      setSaving(false)
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
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Complete Your Profile</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Tell us your first and last name to continue. You only have to do this once.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="setup-first-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                First Name
              </label>
              <input
                id="setup-first-name"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className={inputClassName}
                placeholder="Enter your first name"
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="setup-last-name" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Last Name
              </label>
              <input
                id="setup-last-name"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className={inputClassName}
                placeholder="Enter your last name"
                disabled={saving}
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save and Continue'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UserNameSetup
