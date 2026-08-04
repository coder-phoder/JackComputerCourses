import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const CARD_WIDTH = 380
const VIEWPORT_MARGIN = 16
const SPOTLIGHT_GAP = 14
const SPOTLIGHT_PADDING = 6
// Stands in for the card's height until it has been rendered once and measured. Every
// decision about where the card fits is made against the height it actually has.
const ASSUMED_CARD_HEIGHT = 280

// Keeps a placed edge inside the screen: a spotlight running off the bottom, or one
// hard against a side, must not take the card with it.
const clampToViewport = (value, extent, limit) => Math.min(
  Math.max(value, VIEWPORT_MARGIN),
  Math.max(VIEWPORT_MARGIN, limit - extent - VIEWPORT_MARGIN),
)

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

// The card stands against whichever side of the spotlight has room for it: under the
// target, over it, then beside it. A card placed over the thing it is describing is
// the one outcome worth any of this, so the centred fallback is kept for the only
// case that has nowhere else to go — a target with no room on any of the four sides.
const getCardPosition = (spotlight, cardHeight) => {
  if (!spotlight) {
    return null
  }

  const height = cardHeight || ASSUMED_CARD_HEIGHT
  const left = clampToViewport(
    spotlight.left + spotlight.width / 2 - CARD_WIDTH / 2,
    CARD_WIDTH,
    window.innerWidth,
  )
  const bottomEdge = spotlight.top + spotlight.height + SPOTLIGHT_GAP

  if (window.innerHeight - bottomEdge >= height + VIEWPORT_MARGIN) {
    return { left, top: bottomEdge }
  }

  if (spotlight.top - SPOTLIGHT_GAP >= height + VIEWPORT_MARGIN) {
    return { left, bottom: window.innerHeight - spotlight.top + SPOTLIGHT_GAP }
  }

  // A panel tall enough to fill the screen still leaves the column beside it, which
  // is where a two column dashboard puts the card without covering anything lit.
  const top = clampToViewport(
    spotlight.top + spotlight.height / 2 - height / 2,
    height,
    window.innerHeight,
  )
  const rightEdge = spotlight.left + spotlight.width + SPOTLIGHT_GAP

  if (window.innerWidth - rightEdge >= CARD_WIDTH + VIEWPORT_MARGIN) {
    return { left: rightEdge, top }
  }

  if (spotlight.left - SPOTLIGHT_GAP >= CARD_WIDTH + VIEWPORT_MARGIN) {
    return { right: window.innerWidth - spotlight.left + SPOTLIGHT_GAP, top }
  }

  return null
}

const TourOverlay = ({ steps, onClose }) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState(null)
  const [cardHeight, setCardHeight] = useState(0)
  const cardRef = useRef(null)
  const enteredStepId = useRef('')

  // A page can rebuild its steps while the tour is open — attendance drops its trend
  // stop on a month without one — so the index is only ever read through this clamp.
  const safeIndex = Math.min(stepIndex, steps.length - 1)
  const step = steps[safeIndex]
  const isLastStep = safeIndex === steps.length - 1
  const cardPosition = getCardPosition(spotlight, cardHeight)
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
      const element = document.querySelector(step.target)

      if (!element) {
        return
      }

      // Centring the target is what draws the eye, but a tall one centred splits the
      // screen into two gaps too short to stand a card in. Those are sent to the top
      // instead, which hands the whole of the room below them to the card.
      const room = (window.innerHeight - element.getBoundingClientRect().height) / 2 - SPOTLIGHT_GAP
      const cardRoom = (cardRef.current?.offsetHeight || ASSUMED_CARD_HEIGHT) + VIEWPORT_MARGIN

      element.scrollIntoView({
        behavior: 'smooth',
        block: room >= cardRoom ? 'center' : 'start',
      })
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
      // Read on the same frame as the box it is placed against: a step with more to
      // say is a taller card, and the side it fits on changes with it.
      setCardHeight((current) => cardRef.current?.offsetHeight || current)

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

  // The button that starts a walkthrough sits wherever its page wants it, and a page
  // that animates a panel into place leaves a transform on it. A transform is the
  // containing block for anything fixed inside it, which would scope this overlay to
  // that panel and let any animated card further down the page paint straight through
  // it. Hung off the body, the overlay is above the page whatever the page is doing.
  return createPortal(
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
          ref={cardRef}
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
    </div>,
    document.body,
  )
}

export default TourOverlay
