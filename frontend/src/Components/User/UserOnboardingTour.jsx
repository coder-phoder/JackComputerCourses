import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bug,
  CalendarCheck,
  Compass,
  Loader2,
  Route,
  Terminal,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

const CARD_WIDTH = 380
const VIEWPORT_MARGIN = 16
const SPOTLIGHT_GAP = 14
const SPOTLIGHT_PADDING = 6

// Each step that names a target is anchored to a real button in the navbar, so the
// walkthrough teaches the actual page instead of a picture of it. Steps without a
// target are the opening and closing cards and sit in the middle of the screen.
const TOUR_STEPS = [
  {
    id: 'welcome',
    icon: Compass,
    eyebrow: 'Welcome',
    title: 'How this works',
    points: [
      'Watch a course',
      'Practise the code',
      'Faculty tracks the rest',
    ],
  },
  {
    id: 'home',
    target: '[data-tour="home"]',
    icon: UserRound,
    eyebrow: 'Stop 1',
    title: 'Home',
    points: [
      'Your account and phone number',
      'This bar is on every page',
      'Logout ends the session',
    ],
  },
  {
    id: 'courses',
    target: '[data-tour="courses"]',
    icon: BookOpen,
    eyebrow: 'Stop 2',
    title: 'Courses',
    points: [
      'Courses opened to you',
      'Chapters left, video middle',
      'Resumes your last lesson',
    ],
  },
  {
    id: 'ide',
    target: '[data-tour="ide"]',
    icon: Terminal,
    eyebrow: 'Stop 3',
    title: 'IDE',
    points: [
      'Your files, kept on the server',
      'Runs C, C++, Java, Python, JS',
      'Queries: ask a faculty',
    ],
  },
  {
    id: 'attendance',
    target: '[data-tour="attendance"]',
    icon: CalendarCheck,
    eyebrow: 'Stop 4',
    title: 'Attendance',
    points: [
      'What faculty marked, month by month',
      'Pick a day to see it',
      'Only faculty can change it',
    ],
  },
  {
    id: 'bugs',
    target: '[data-tour="bugs"]',
    icon: Bug,
    eyebrow: 'Stop 5',
    title: 'Report a Bug',
    points: [
      'Site broken? tell an admin',
      'Add screenshots',
      'Track Open to Resolved',
    ],
  },
  {
    id: 'roadmap',
    icon: Route,
    eyebrow: 'Stop 6',
    title: 'A normal day',
    steps: [
      'Watch a lesson',
      'Code it in the IDE',
      'Ask a faculty if stuck',
      'Check attendance',
      'Report bugs',
    ],
  },
]

// Hidden targets still answer querySelector, so an empty box is read as "the navbar
// is collapsed on this screen" and the step falls back to a centered card.
const getSpotlight = (target) => {
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

// The card hangs under its target, or above it when the target sits low on the
// screen, and is always kept inside the viewport.
const getCardPosition = (spotlight) => {
  if (!spotlight) {
    return {}
  }

  const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - CARD_WIDTH - VIEWPORT_MARGIN)
  const left = Math.min(
    Math.max(spotlight.left + spotlight.width / 2 - CARD_WIDTH / 2, VIEWPORT_MARGIN),
    maxLeft,
  )

  if (spotlight.top > window.innerHeight / 2) {
    return {
      left,
      bottom: window.innerHeight - spotlight.top + SPOTLIGHT_GAP,
    }
  }

  return {
    left,
    top: spotlight.top + spotlight.height + SPOTLIGHT_GAP,
  }
}

const UserOnboardingTour = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0)
  const [spotlight, setSpotlight] = useState(null)
  const [finishing, setFinishing] = useState(false)

  const step = TOUR_STEPS[stepIndex]
  const isLastStep = stepIndex === TOUR_STEPS.length - 1
  const StepIcon = step.icon

  // The navbar reflows on resize and the page can scroll under the card, so the
  // hole is measured again on both instead of being trusted once.
  useEffect(() => {
    const updateSpotlight = () => setSpotlight(getSpotlight(step.target))

    updateSpotlight()
    window.addEventListener('resize', updateSpotlight)
    window.addEventListener('scroll', updateSpotlight, true)

    return () => {
      window.removeEventListener('resize', updateSpotlight)
      window.removeEventListener('scroll', updateSpotlight, true)
    }
  }, [step.target])

  const finishTour = useCallback(async () => {
    setFinishing(true)

    try {
      await axios.patch(`${API_BASE_URL}/user/tour`, {}, {
        withCredentials: true,
      })
    } catch {
      // Closing still has to work offline; a write that failed only means this
      // account is greeted with the walkthrough once more.
    }

    onComplete()
  }, [onComplete])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (finishing) {
        return
      }

      if (event.key === 'Escape') {
        finishTour()
        return
      }

      if (event.key === 'ArrowRight') {
        setStepIndex((current) => Math.min(current + 1, TOUR_STEPS.length - 1))
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
  }, [finishing, finishTour])

  // The page behind is being pointed at, so it stays exactly where the card
  // measured it until the walkthrough is done with it.
  useEffect(() => {
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Walkthrough of your dashboard"
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* One sheet over the whole page swallows clicks, so the walkthrough is never
          half finished on a page it was not pointing at. The spotlight above it is
          only a ring: what sits inside the hole keeps its own colours. */}
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

      {/* Anchored cards are placed by hand next to their target; the opening and
          closing cards have nothing to sit beside and are centred by the wrapper. */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          className={`pointer-events-auto max-h-[calc(100vh-6rem)] w-full max-w-95 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${
            spotlight ? 'absolute' : 'relative'
          }`}
          style={getCardPosition(spotlight)}
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
              {step.steps.map((roadmapStep, index) => (
                <li key={roadmapStep} className="flex gap-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    {index + 1}
                  </span>
                  {roadmapStep}
                </li>
              ))}
            </ol>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {TOUR_STEPS.map((tourStep, index) => (
                <span
                  key={tourStep.id}
                  className={`h-1.5 rounded-full transition-all ${
                    index === stepIndex
                      ? 'w-5 bg-blue-600'
                      : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {stepIndex ? (
                <button
                  type="button"
                  onClick={() => setStepIndex((current) => current - 1)}
                  disabled={finishing}
                  aria-label="Previous stop"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-blue-400 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-600 dark:hover:text-blue-300"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              ) : null}

              <button
                type="button"
                onClick={isLastStep ? finishTour : () => setStepIndex((current) => current + 1)}
                disabled={finishing}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {finishing && isLastStep ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isLastStep ? 'Start learning' : 'Next'}
                {isLastStep ? null : <ArrowRight className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {isLastStep ? null : (
            <button
              type="button"
              onClick={finishTour}
              disabled={finishing}
              className="mt-3 text-xs font-semibold text-slate-500 transition hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {finishing ? 'Closing the walkthrough...' : 'Skip the walkthrough'}
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default UserOnboardingTour
