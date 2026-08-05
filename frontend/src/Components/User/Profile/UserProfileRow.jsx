import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { formatDisplayValue, getAge } from '../../../utils/profileFields'

// A row says what is held and opens where it is, so the page is a list of what the
// institute knows first and a form second. Nothing is required, so an empty row reads
// as "Not set" rather than as something missing.
const CONTROL_BASE = 'w-full rounded-lg border bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition [color-scheme:light] placeholder:font-medium placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:bg-slate-950/60 dark:text-slate-100 dark:[color-scheme:dark] dark:placeholder:text-slate-500 dark:disabled:bg-slate-900'

const CONTROL_TONES = {
  error: 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 dark:border-rose-800',
  normal: 'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 dark:border-slate-700 dark:focus:border-blue-500',
}

const UserProfileRow = ({ field, value, error, disabled, isOpen, onToggle, onChange, onBlur }) => {
  const controlRef = useRef(null)

  // Opening a row is a request to type in it, so the cursor goes there rather than
  // leaving the reader to click the box they just opened.
  useEffect(() => {
    if (isOpen) {
      controlRef.current?.focus()
    }
  }, [isOpen])

  const isTextarea = field.component === 'textarea'
  const display = formatDisplayValue(field, value)
  const age = field.type === 'date' && value && !error ? getAge(value) : null

  const controlClassName = `${CONTROL_BASE} ${error ? CONTROL_TONES.error : CONTROL_TONES.normal}`

  const controlProps = {
    id: `profile-${field.name}`,
    name: field.name,
    value,
    disabled,
    maxLength: field.maxLength,
    autoComplete: field.autoComplete,
    placeholder: field.placeholder,
    onChange,
    onBlur,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': `profile-${field.name}-hint`,
  }

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`profile-row-${field.name}`}
        className="flex w-full items-center gap-4 px-5 py-5 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 dark:hover:bg-slate-800/40 dark:focus-visible:bg-slate-800/40"
      >
        <field.Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />

        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">
            {field.label}
          </span>
          <span className={`min-w-0 truncate text-sm font-medium ${
            error
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
          >
            {display || 'Not set'}
          </span>
        </span>

        <ChevronRight
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 dark:text-slate-500 ${
            isOpen ? 'rotate-90' : ''
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={`profile-row-${field.name}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pl-14">
              {isTextarea ? (
                <textarea
                  ref={controlRef}
                  {...controlProps}
                  rows={3}
                  className={`resize-y ${controlClassName}`}
                />
              ) : (
                <input
                  ref={controlRef}
                  {...controlProps}
                  type={field.type}
                  inputMode={field.inputMode}
                  className={controlClassName}
                />
              )}

              <div className="mt-2 flex items-start justify-between gap-3">
                <p
                  id={`profile-${field.name}-hint`}
                  className={`text-xs font-medium leading-5 ${
                    error
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {error || (age === null ? field.hint || 'Optional' : `${age} years old`)}
                </p>

                {field.maxLength && value.length >= Math.floor(field.maxLength * 0.7) ? (
                  <p className={`shrink-0 text-xs font-bold tabular-nums ${
                    value.length === field.maxLength
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                  >
                    {value.length}/{field.maxLength}
                  </p>
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default UserProfileRow
