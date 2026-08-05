import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, CircleCheck, Loader2, RotateCcw, Save } from 'lucide-react'
import { EASE_OUT } from '../../../utils/motion'

// The shortcut is offered on the keyboard either way; only the key it is written with
// has to match the machine reading it.
const SHORTCUT_LABEL = typeof navigator !== 'undefined'
  && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent || '')
  ? '⌘S'
  : 'Ctrl S'

// The bar is pinned under the panel rather than placed after it, so the state of the
// page and the way to save it hold their place whichever group is showing. It says one
// thing at a time, and that thing is whatever is most worth knowing right now.
const getStatus = ({ saving, invalidCount, isDirty, saved }) => {
  if (saving) {
    return {
      key: 'saving',
      Icon: Loader2,
      iconClass: 'animate-spin text-blue-600 dark:text-blue-400',
      text: 'Saving your details...',
      textClass: 'text-slate-600 dark:text-slate-300',
    }
  }

  if (invalidCount) {
    return {
      key: 'invalid',
      Icon: CircleAlert,
      iconClass: 'text-rose-500',
      text: `Fix ${invalidCount} ${invalidCount === 1 ? 'detail' : 'details'} before saving`,
      textClass: 'text-rose-600 dark:text-rose-400',
    }
  }

  if (isDirty) {
    return {
      key: 'dirty',
      Icon: null,
      iconClass: '',
      text: 'You have unsaved changes',
      textClass: 'text-amber-700 dark:text-amber-400',
    }
  }

  if (saved) {
    return {
      key: 'saved',
      Icon: CircleCheck,
      iconClass: 'text-emerald-500',
      text: 'All changes saved',
      textClass: 'text-emerald-700 dark:text-emerald-400',
    }
  }

  return {
    key: 'idle',
    Icon: null,
    iconClass: '',
    text: 'Everything here is up to date',
    textClass: 'text-slate-500 dark:text-slate-400',
  }
}

const UserProfileSaveBar = ({
  filled,
  total,
  percent,
  isDirty,
  saving,
  saved,
  invalidCount,
  onDiscard,
}) => {
  const status = getStatus({ saving, invalidCount, isDirty, saved })

  return (
    <div data-tour="profile-save" className="shrink-0">
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900/90 dark:shadow-black/30">
        <div className="min-w-0 flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={status.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              className={`flex items-center gap-2 text-sm font-bold ${status.textClass}`}
            >
              {status.Icon ? <status.Icon className={`h-4 w-4 shrink-0 ${status.iconClass}`} /> : null}

              {status.key === 'dirty' ? (
                <span className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                </span>
              ) : null}

              {status.text}
            </motion.p>
          </AnimatePresence>

          <div className="mt-2.5 flex items-center gap-3">
            <div className="h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
                initial={false}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.5, ease: EASE_OUT }}
              />
            </div>
            <p className="shrink-0 text-[11px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
              {filled} of {total} details
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AnimatePresence initial={false}>
            {isDirty ? (
              <motion.button
                key="discard"
                type="button"
                onClick={onDiscard}
                disabled={saving}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-slate-100 dark:disabled:text-slate-600"
              >
                <RotateCcw className="h-4 w-4" />
                Discard
              </motion.button>
            ) : null}
          </AnimatePresence>

          <button
            type="submit"
            disabled={saving || !isDirty || Boolean(invalidCount)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 dark:focus-visible:ring-offset-slate-900 dark:disabled:bg-slate-700"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save changes'}

            {isDirty && !saving ? (
              <kbd className="ml-1 hidden rounded border border-white/40 px-1.5 py-0.5 text-[10px] font-bold sm:inline">
                {SHORTCUT_LABEL}
              </kbd>
            ) : null}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserProfileSaveBar
