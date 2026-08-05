import axios from 'axios'
import { ArrowRight, Clock, Loader2, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

// Mirrors the window the server actually schedules, so the button says what happens.
const REMINDER_DAYS = 3

// Asked once a login lands on the dashboard, and only of an account that has never
// been through the form. Both answers close it: one opens the page, the other buys
// three days. Nothing here blocks the dashboard behind it.
const UserProfilePrompt = ({ onDismiss }) => {
  const navigate = useNavigate()
  const [snoozing, setSnoozing] = useState(false)

  const handleRemindLater = async () => {
    setSnoozing(true)

    try {
      await axios.patch(`${API_BASE_URL}/user/profile/remind-later`, {}, {
        withCredentials: true,
      })
    } catch {
      // The reminder is the server's to keep. If it never got the message the only
      // cost is being asked again on the next login, so the prompt still closes.
    }

    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Remind me later"
        disabled={snoozing}
        onClick={handleRemindLater}
        className="absolute inset-0 bg-slate-900/50 disabled:cursor-not-allowed"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <UserRound className="h-5 w-5" />
        </span>

        <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          Complete your profile
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Add an email and an address so the institute can reach you and send your
          certificates. All of it is optional, and it takes a minute.
        </p>

        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={() => navigate('/user/profile')}
            disabled={snoozing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none dark:disabled:bg-blue-900/50"
          >
            Do it right now
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleRemindLater}
            disabled={snoozing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:disabled:text-slate-600"
          >
            {snoozing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                Remind me in {REMINDER_DAYS} days
              </>
            )}
          </button>
        </div>

        <p className="mt-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
          You can open it any time from Profile in the top bar.
        </p>
      </div>
    </div>
  )
}

export default UserProfilePrompt
