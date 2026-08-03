import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const CARD_WIDTH = 380
const VIEWPORT_MARGIN = 16
const SPOTLIGHT_GAP = 14
const SPOTLIGHT_PADDING = 6
// Below this a card would hang off the screen, so it is centred over the target instead.
const MIN_CARD_ROOM = 280

// A step points at a selector, not at an element: panels a step opens are only in
// the DOM once it has opened them. A target that is missing or hidden reads as
// null and the step falls back to a centred card.
const readSpotlight = (target) => {
  if (!target) {
    return null
  }

  const rect = document.querySelector(target)?.getBoundingClientRect()

  if (!rect?.width || !rect?.height) {
    return null
  }

  return {
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
  }
}

const isSameSpotlight = (first, second) => (
  first === second || Boolean(
    first
    && second
    && first.top === second.top
    && first.left === second.left
    && first.width === second.width
    && first.height === second.height,
  )
)

const getCardPosition = (spotlight) => {
  if (!spotlight) {
    return null
  }

  const left = Math.min(
    Math.max(spotlight.left + spotlight.width / 2 - CARD_WIDTH / 2, VIEWPORT_MARGIN),
    Math.max(VIEWPORT_MARGIN, window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN),
  )
  const bottomEdge = spotlight.top + spotlight.height + SPOTLIGHT_GAP

  if (window.innerHeight - bottomEdge >= MIN_CARD_ROOM) {
    return { left, top: bottomEdge }
  }

  if (spotlight.top - SPOTLIGHT_GAP >= MIN_CARD_ROOM) {
    return { left, bottom: window.innerHeight - spotlight.top + SPOTLIGHT_GAP }
  }

  return null
}

const TourOverlay = ({ steps, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState(null)
  const enteredStepId = useRef('')

  // A page can rebuild its steps while the tour is open — attendance drops its trend
  // stop on a month without one — so the index is only ever read through this clamp.
  const safeIndex = Math.min(stepIndex, steps.length - 1)
  const step = steps[safeIndex]
  const isLastStep = safeIndex === steps.length - 1
  const cardPosition = getCardPosition(spotlight)
  const StepIcon = step.icon

  // Opening the section a step is about is the step's own job, so the page hands
  // over the setter and the walkthrough drives the real page. Opening it is tied to
  // arriving at the step, not to the render: a page that rebuilds its step list on
  // every render must not keep reopening what the student just closed.
  useEffect(() => {
    if (enteredStepId.current === step.id) {
      return undefined
    }

    enteredStepId.current = step.id
    step.onEnter?.()

    if (!step.target) {
      return undefined
    }

    const frame = requestAnimationFrame(() => {
      document.querySelector(step.target)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })

    return () => cancelAnimationFrame(frame)
  }, [step])

  // Targets move for every reason there is: a panel opening, a smooth scroll, a
  // resize. Reading the box every frame and only storing a changed one keeps the
  // hole glued on without a listener per cause.
  useEffect(() => {
    let frame = 0

    const measure = () => {
      setSpotlight((current) => {
        const next = readSpotlight(step.target)

        return isSameSpotlight(current, next) ? current : next
      })

      frame = requestAnimationFrame(measure)
    }

    measure()

    return () => cancelAnimationFrame(frame)
  }, [step.target])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }

      if (event.key === 'ArrowRight') {
        setStepIndex((current) => Math.min(current + 1, steps.length - 1))
        return
      }

      if (event.key === 'ArrowLeft') {
        setStepIndex((current) => Math.max(current - 1, 0))
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, steps.length])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Page walkthrough"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* One sheet over the page swallows clicks so a walkthrough is never left half
          finished somewhere else. The spotlight above it is only a ring: whatever sits
          inside the hole keeps its own colours. */}
      <div
        aria-hidden="true"
        className={`pointer-events-auto absolute inset-0 ${spotlight ? '' : 'bg-slate-950/78'}`}
      />

      {spotlight ? (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-xl ring-2 ring-blue-400"
          style={{ boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.78)' }}
          initial={false}
          animate={spotlight}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        />
      ) : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          className={`pointer-events-auto max-h-[calc(100vh-6rem)] w-full max-w-95 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${
            cardPosition ? 'absolute' : 'relative'
          }`}
          style={cardPosition || undefined}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <StepIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {step.eyebrow}
              </p>
              <h2 className="text-lg font-bold leading-tight text-slate-900 dark:text-slate-100">
                {step.title}
              </h2>
            </div>
          </div>

          {step.points ? (
            <ul className="mt-4 space-y-2">
              {step.points.map((point) => (
                <li key={point} className="flex gap-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {point}
                </li>
              ))}
            </ul>
          ) : null}

          {step.steps ? (
            <ol className="mt-4 space-y-2">
              {step.steps.map((orderedStep, index) => (
                <li key={orderedStep} className="flex gap-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    {index + 1}
                  </span>
                  {orderedStep}
                </li>
              ))}
            </ol>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {steps.map((tourStep, index) => (
                <span
                  key={tourStep.id}
                  className={`h-1.5 rounded-full transition-all ${
                    index === safeIndex ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {safeIndex ? (
                <button
                  type="button"
                  onClick={() => setStepIndex(safeIndex - 1)}
                  aria-label="Previous stop"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={isLastStep ? onClose : () => setStepIndex(safeIndex + 1)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                {isLastStep ? 'Done' : 'Next'}
                {isLastStep ? null : <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isLastStep ? null : (
            <button
              type="button"
              onClick={onClose}
              className="mt-3 text-xs font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Skip
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default TourOverlay
