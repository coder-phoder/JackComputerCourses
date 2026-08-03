import { motion } from 'framer-motion'
import { BookOpen, CalendarCheck, IdCard, Phone, TrendingUp, Users } from 'lucide-react'
import AnimatedNumber from '../Common/AnimatedNumber'
import { fadeUp, staggerParent } from '../../utils/motion'

const getGreeting = (hour) => {
  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 17) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

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
    <Icon className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </span>
    <span className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{value}</span>
  </span>
)

// Who is teaching, and the four totals the whole institute is running on. They sit in
// the band rather than in a row of cards below it: a faculty opens this page to act on
// today, and the standing numbers are context for that, not the point of the page.
const getStats = (counts) => [
  { key: 'students', label: 'Students', value: counts.students, Icon: Users, tone: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300' },
  { key: 'courses', label: 'Courses', value: counts.courses, Icon: BookOpen, tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300' },
  { key: 'marked', label: 'Marked this month', value: counts.markedThisMonth, Icon: CalendarCheck, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' },
  { key: 'rate', label: 'Present rate', value: counts.presentRate, suffix: '%', Icon: TrendingUp, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' },
]

const FacultyHomeHeader = ({ name, phone, profileId, counts, loading, children }) => (
  <motion.section
    variants={fadeUp}
    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
  >
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-linear-to-br from-indigo-500/25 via-violet-400/20 to-transparent blur-3xl"
      animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.1, 1] }}
      transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
    />

    <div className="relative flex flex-col gap-7 p-6 sm:p-8 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-5">
          <motion.div
            className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-600 via-violet-500 to-sky-500 text-2xl font-black text-white shadow-lg shadow-indigo-600/25"
            whileHover={{ rotate: -3, scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            <motion.span
              aria-hidden="true"
              className="absolute inset-1.5 rounded-xl border border-white/30"
              animate={{ scale: [1, 0.93, 1], opacity: [0.4, 0.85, 0.4] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="relative">{getInitials(name)}</span>
          </motion.div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              Faculty · {getGreeting(new Date().getHours())}
            </p>
            <h1 className="mt-1 truncate text-3xl font-black leading-tight text-slate-950 dark:text-white sm:text-4xl">
              {name}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {getTodayLabel()}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <IdentityChip Icon={Phone} label="Phone" value={phone} />
          <IdentityChip Icon={IdCard} label="ID" value={profileId} />
          {children}
        </div>
      </div>

      <motion.dl
        variants={staggerParent(0.07, 0.1)}
        className={`grid shrink-0 grid-cols-2 gap-3 transition-opacity xl:w-100 ${
          loading ? 'opacity-60' : 'opacity-100'
        }`}
      >
        {getStats(counts).map((stat) => (
          <motion.div
            key={stat.key}
            variants={fadeUp}
            whileHover={{ y: -3 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"
          >
            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${stat.tone}`}>
              <stat.Icon className="h-4 w-4" />
            </span>
            <dd className="mt-3 text-2xl font-black leading-none tabular-nums text-slate-900 dark:text-slate-100">
              <AnimatedNumber value={stat.value} suffix={stat.suffix || ''} />
            </dd>
            <dt className="mt-1.5 truncate text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {stat.label}
            </dt>
          </motion.div>
        ))}
      </motion.dl>
    </div>
  </motion.section>
)

export default FacultyHomeHeader
