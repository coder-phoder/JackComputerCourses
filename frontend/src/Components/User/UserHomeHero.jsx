import { motion } from 'framer-motion'
import { GraduationCap, IdCard, Phone } from 'lucide-react'
import AnimatedNumber from '../Common/AnimatedNumber'
import { getAttendanceStanding } from '../../utils/attendance'
import { EASE_OUT, fadeUp } from '../../utils/motion'

// The same meter the attendance page leads with, at the size a landing card can hold:
// one ratio against 100%, so the unfilled arc stays a lighter step of the same hue
// instead of reading as a second value.
const RING_RADIUS = 54
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const getGreeting = (hour) => {
  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 17) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

// An account cannot reach this page without a first and a last name, so two letters
// is the whole of it.
const getInitials = (name) => (
  String(name || 'J')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
)

const getTodayLabel = () => new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date())

const IdentityChip = ({ Icon, label, value }) => (
  <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
    <Icon className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </span>
    <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{value}</span>
  </span>
)

// Who is signed in, and the one number that says how the month is going. Everything
// else on the page hangs off the two, so nothing is repeated below.
const UserHomeHero = ({ name, phone, profileId, summary, monthLabel, loading, children }) => {
  const standing = getAttendanceStanding(summary)
  const initials = getInitials(name)

  return (
    <motion.section
      variants={fadeUp}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-linear-to-br from-blue-500/25 via-cyan-400/20 to-transparent blur-3xl"
        animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.1, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-5">
            <motion.div
              className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-blue-600 via-cyan-500 to-emerald-500 text-2xl font-black text-white shadow-lg shadow-blue-600/25"
              whileHover={{ rotate: -3, scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <motion.span
                aria-hidden="true"
                className="absolute inset-1.5 rounded-xl border border-white/30"
                animate={{ scale: [1, 0.93, 1], opacity: [0.4, 0.85, 0.4] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="relative">{initials}</span>
            </motion.div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                {getGreeting(new Date().getHours())} · {getTodayLabel()}
              </p>
              <h1 className="mt-1 truncate text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
                {name}
              </h1>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <IdentityChip Icon={GraduationCap} label="Role" value="Student" />
            <IdentityChip Icon={Phone} label="Phone" value={phone} />
            <IdentityChip Icon={IdCard} label="ID" value={profileId} />
          </div>

          {/* Every way out of this page is a quick link below, so the hero keeps only
              the walkthrough — the one action that belongs to the page itself. */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {children}
          </div>
        </div>

        <div className={`flex flex-col items-start gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition-opacity sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950/40 ${
          loading ? 'opacity-60' : 'opacity-100'
        }`}
        >
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle
                cx="64"
                cy="64"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="11"
                className="stroke-blue-100 dark:stroke-blue-950"
              />
              <motion.circle
                cx="64"
                cy="64"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="11"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                animate={{ strokeDashoffset: RING_CIRCUMFERENCE * (1 - (summary.rate / 100)) }}
                transition={{ duration: 1.1, ease: EASE_OUT }}
                className="stroke-blue-600 dark:stroke-blue-500"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-4xl font-black leading-none text-slate-900 dark:text-slate-100">
                {loading ? '—' : <AnimatedNumber value={summary.rate} suffix="%" />}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Present
              </p>
            </div>
          </div>

          <div className="min-w-0 max-w-56">
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              {monthLabel}
            </p>
            <p className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
              Attendance rate
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {summary.marked
                ? `${summary.present} present of ${summary.marked} marked ${summary.marked === 1 ? 'day' : 'days'}`
                : 'No days marked this month'}
            </p>
            <span className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${standing.chip}`}>
              {standing.label}
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export default UserHomeHero
