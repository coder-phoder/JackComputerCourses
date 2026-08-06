import axios from 'axios'
import { Clock, Loader2 } from 'lucide-react'
import { useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

// Mirrors the waits the server actually schedules, so each button says what happens.
const REMINDER_DAYS = {
  profile: 3,
  review: 7,
}

// The dashboard asks a login for two optional things, and both are asked the same way:
// one card over the page, one way in, and one way out that buys a few days of quiet.
// Only the card's own words and its way in differ, so they are all this shell is given.
//
// Nothing here blocks the dashboard behind it: every way of closing the card, the
// backdrop included, is an answer the server is told about.
const UserPromptDialog = ({ prompt, Icon, title, description, footnote, onDismiss, children }) => {
  const [snoozing, setSnoozing] = useState(false)

  const handleRemindLater = async () => {
    setSnoozing(true)

    try {
      await axios.patch(`${API_BASE_URL}/user/prompts/${prompt}/remind-later`, {}, {
        withCredentials: true,
      })
    } catch {
      // The reminder is the server's to keep. If it never got the message the only
      // cost is being asked again on the next login, so the prompt still closes.
    }

    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        aria-label="Remind me later"
        disabled={snoozing}
        onClick={handleRemindLater}
        className="absolute inset-0 bg-slate-900/50 disabled:cursor-not-allowed"
      />

      <div className="relative z-10 my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </span>

        <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>

        <div className="mt-6 grid gap-3">
          {/* The way in is the caller's — a link to a page, or the whole of the thing
              being asked for. It is told when the card is on its way out so it cannot
              be answered twice. */}
          {children({ disabled: snoozing })}

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
                Remind me in {REMINDER_DAYS[prompt]} days
              </>
            )}
          </button>
        </div>

        {footnote ? (
          <p className="mt-4 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
            {footnote}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export default UserPromptDialog
