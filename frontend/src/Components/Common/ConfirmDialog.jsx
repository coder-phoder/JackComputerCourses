import { AlertCircle, Info, Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

// The one dialog every "are you sure?" in the app goes through. It is never
// rendered directly: pages ask for it through useConfirm(), which mounts it here
// and answers with the button the person pressed.

// A tone picks the icon and the accent in one go, so a page only has to say how
// serious the question is rather than restate the palette every time it asks.
const TONES = {
  danger: {
    icon: Trash2,
    accent: 'bg-red-500',
    badge: 'bg-red-50 text-red-600 ring-red-100 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-900/50',
    confirm: 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-600 dark:bg-red-600 dark:hover:bg-red-500',
  },
  warning: {
    icon: AlertCircle,
    accent: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-900/50',
    confirm: 'bg-amber-600 hover:bg-amber-700 focus-visible:outline-amber-600 dark:bg-amber-600 dark:hover:bg-amber-500',
  },
  info: {
    icon: Info,
    accent: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-900/50',
    confirm: 'bg-blue-600 hover:bg-blue-700 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500',
  },
}

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

const ConfirmDialog = ({
  title,
  description,
  subject,
  note,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  icon,
  onConfirm,
  onCancel,
}) => {
  const panelRef = useRef(null)
  const cancelRef = useRef(null)
  const confirmRef = useRef(null)

  const toneStyles = TONES[tone] || TONES.danger
  const ToneIcon = icon || toneStyles.icon
  // A destructive question opens with Cancel under the finger, so the reflex of
  // hitting Enter on a dialog that just appeared cannot be what deletes the row.
  // Anything gentler opens on its confirm button, where the answer is usually yes.
  const isDestructive = tone === 'danger'

  useEffect(() => {
    const target = isDestructive ? cancelRef.current : confirmRef.current

    target?.focus()
  }, [isDestructive])

  // While the dialog is up it is the only thing on screen that answers the
  // keyboard: Escape backs out, and Tab is bent into a loop so focus cannot wander
  // off into the page behind it and leave the question unanswered.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const focusable = Array.from(panelRef.current?.querySelectorAll(FOCUSABLE) || [])

      if (!focusable.length) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && (active === first || !panelRef.current?.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)

    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onCancel])

  return (
    <motion.div
      ref={panelRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby={description ? 'confirm-dialog-description' : undefined}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
      onMouseDown={(event) => event.stopPropagation()}
      className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
    >
      {/* The tone reads before a single word does: one accent line across the top. */}
      <div className={`h-1 w-full ${toneStyles.accent}`} />

      <div className="flex gap-4 px-6 pb-5 pt-6">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${toneStyles.badge}`}>
          <ToneIcon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 id="confirm-dialog-title" className="text-lg font-bold leading-snug text-slate-900 dark:text-slate-100">
            {title}
          </h2>

          {description ? (
            <p id="confirm-dialog-description" className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}

          {/* The thing being acted on is spelled out on its own line rather than
              folded into the sentence, so the name is checked, not skimmed. */}
          {subject ? (
            <p className="mt-3 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
              {subject}
            </p>
          ) : null}

          {note ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {note}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-end dark:border-slate-800 dark:bg-slate-950/50">
        <span className="mr-auto hidden text-[11px] font-bold text-slate-400 sm:block dark:text-slate-500">
          Esc to cancel
        </span>

        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-800"
        >
          {cancelLabel}
        </button>

        <button
          ref={confirmRef}
          type="button"
          onClick={onConfirm}
          className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${toneStyles.confirm}`}
        >
          {confirmLabel}
        </button>
      </div>
    </motion.div>
  )
}

export default ConfirmDialog
