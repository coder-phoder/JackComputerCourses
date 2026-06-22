import { motion } from 'framer-motion'
import { ArrowLeft, Compass, Home, LogIn, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from '../../Components/Common/ThemeToggle'

const REDIRECT_SECONDS = 10

const orbitItems = [
  { label: '4', className: 'left-[8%] top-[14%] border-cyan-300 bg-cyan-100 text-cyan-700 dark:border-cyan-400/60 dark:bg-cyan-400/10 dark:text-cyan-200', delay: 0 },
  { label: '0', className: 'right-[10%] top-[20%] border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-400/60 dark:bg-amber-400/10 dark:text-amber-200', delay: 0.35 },
  { label: '4', className: 'bottom-[18%] left-[16%] border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-400/60 dark:bg-rose-400/10 dark:text-rose-200', delay: 0.7 },
  { label: '/', className: 'bottom-[13%] right-[14%] border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-400/10 dark:text-emerald-200', delay: 1.05 },
]

const NotFoundPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS)

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => {
      navigate('/login', {
        replace: true,
        state: {
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        },
      })
    }, REDIRECT_SECONDS * 1000)

    const countdownTimer = window.setInterval(() => {
      setSecondsLeft((currentSeconds) => Math.max(currentSeconds - 1, 0))
    }, 1000)

    return () => {
      window.clearTimeout(redirectTimer)
      window.clearInterval(countdownTimer)
    }
  }, [location.hash, location.pathname, location.search, navigate])

  const progressOffset = 283 - (283 * secondsLeft) / REDIRECT_SECONDS

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 font-sans text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(14,165,233,0.12),transparent_28%,rgba(245,158,11,0.14)_50%,transparent_72%,rgba(16,185,129,0.12))] dark:bg-[linear-gradient(115deg,rgba(34,211,238,0.12),transparent_30%,rgba(251,191,36,0.10)_50%,transparent_70%,rgba(244,63,94,0.11))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,transparent_38%,rgba(15,23,42,0.08)_39%,transparent_40%),linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-size-[100%_100%,44px_44px,44px_44px] dark:bg-[radial-gradient(circle_at_center,transparent_0,transparent_38%,rgba(148,163,184,0.12)_39%,transparent_40%),linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)]" />

      {orbitItems.map((item) => (
        <motion.div
          key={`${item.label}-${item.delay}`}
          className={`absolute hidden h-16 w-16 items-center justify-center rounded-lg border text-2xl font-black shadow-sm backdrop-blur md:flex ${item.className}`}
          initial={{ opacity: 0, y: 18, rotate: -8 }}
          animate={{ opacity: [0.25, 1, 0.55, 1], y: [0, -18, 0], rotate: [-8, 7, -8] }}
          transition={{ delay: item.delay, duration: 5.2, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden="true"
        >
          {item.label}
        </motion.div>
      ))}

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <div>
            <motion.div
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200"
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.55 }}
            >
              <ShieldAlert className="h-4 w-4 text-rose-500" aria-hidden="true" />
              Illegal route detected
            </motion.div>

            <motion.h1
              className="mt-7 max-w-3xl text-5xl font-black leading-[0.95] tracking-normal text-slate-950 dark:text-white sm:text-7xl lg:text-8xl"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.65 }}
            >
              Lost in the stack.
            </motion.h1>

            <motion.p
              className="mt-6 max-w-2xl text-base font-medium leading-7 text-slate-600 dark:text-slate-300 sm:text-lg"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.6 }}
            >
              The URL <span className="font-bold text-slate-900 dark:text-white">{location.pathname}</span> is not a valid JackCourses page. You will be sent back to login automatically.
            </motion.p>

            <motion.div
              className="mt-8 flex flex-col gap-3 sm:flex-row"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <Link
                to="/login"
                state={{
                  from: {
                    pathname: location.pathname,
                    search: location.search,
                    hash: location.hash,
                  },
                }}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30 focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/50"
              >
                <LogIn className="h-5 w-5" aria-hidden="true" />
                Go to login
              </Link>
              <Link
                to="/"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white/80 px-5 text-sm font-bold text-slate-800 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white focus:outline-none focus:ring-4 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-900 dark:focus:ring-slate-800"
              >
                <Home className="h-5 w-5" aria-hidden="true" />
                Return home
              </Link>
            </motion.div>
          </div>

          <motion.div
            className="relative mx-auto h-90 w-full max-w-105 sm:h-107.5"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.75, ease: 'easeOut' }}
          >
            <motion.div
              className="absolute inset-6 rounded-lg border border-slate-200 bg-white/75 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-black/30"
              animate={{ y: [0, -10, 0], rotate: [0, 1.2, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute inset-x-12 top-16 rounded-lg border border-slate-200 bg-slate-950 p-4 shadow-xl dark:border-slate-700"
              animate={{ y: [0, 9, 0], rotate: [0, -1, 0] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-400" />
                <span className="h-3 w-3 rounded-full bg-amber-400" />
                <span className="h-3 w-3 rounded-full bg-emerald-400" />
              </div>
              <div className="mt-5 space-y-3">
                <motion.div className="h-3 w-3/4 rounded bg-cyan-300" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.8, repeat: Infinity }} />
                <motion.div className="h-3 w-11/12 rounded bg-slate-600" animate={{ opacity: [0.35, 0.8, 0.35] }} transition={{ duration: 2.2, repeat: Infinity }} />
                <motion.div className="h-3 w-2/3 rounded bg-amber-300" animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 1.6, repeat: Infinity }} />
              </div>
            </motion.div>

            <motion.div
              className="absolute bottom-10 left-1/2 flex h-44 w-44 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white shadow-2xl shadow-blue-900/10 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30"
              animate={{ y: [0, -16, 0] }}
              transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg className="absolute h-36 w-36 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100 dark:text-slate-800" />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="8"
                  className="text-blue-600 dark:text-cyan-300"
                  strokeDasharray="283"
                  animate={{ strokeDashoffset: progressOffset }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
              </svg>
              <div className="text-center">
                <p className="text-5xl font-black text-slate-950 dark:text-white">{secondsLeft}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-normal text-slate-500 dark:text-slate-400">seconds</p>
              </div>
            </motion.div>

            <motion.div
              className="absolute right-6 top-3 flex h-16 w-16 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600 shadow-lg dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-200"
              animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Compass className="h-8 w-8" aria-hidden="true" />
            </motion.div>

            <motion.div
              className="absolute bottom-6 left-5 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 shadow-lg dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100"
              animate={{ x: [0, 10, 0] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Rerouting
            </motion.div>
          </motion.div>
        </motion.div>
      </section>
    </main>
  )
}

export default NotFoundPage
