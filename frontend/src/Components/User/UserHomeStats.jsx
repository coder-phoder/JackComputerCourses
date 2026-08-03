import { motion } from 'framer-motion'
import { CircleCheck, CircleX, Flame, Library } from 'lucide-react'
import AnimatedNumber from '../Common/AnimatedNumber'
import { STATUS_META } from '../../utils/attendance'
import { EASE_OUT, fadeUp, staggerParent } from '../../utils/motion'

// Four counts, each one a number a student can act on, and each one saying for itself
// what window it belongs to so no tile has to be read against another.
const getTiles = (summary, courseCount, monthLabel) => [
  {
    key: 'present',
    label: 'Present',
    value: summary.present,
    sub: summary.marked ? `of ${summary.marked} marked · ${monthLabel}` : `nothing marked · ${monthLabel}`,
    Icon: CircleCheck,
    tone: STATUS_META.present.ink,
    iconTone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    accent: 'bg-emerald-500/70',
  },
  {
    key: 'absent',
    label: 'Absent',
    value: summary.absent,
    sub: `${summary.absent === 1 ? 'day' : 'days'} missed · ${monthLabel}`,
    Icon: CircleX,
    tone: STATUS_META.absent.ink,
    iconTone: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    accent: 'bg-rose-500/70',
  },
  {
    key: 'streak',
    label: 'Current streak',
    value: summary.currentStreak,
    sub: 'present days in a row',
    Icon: Flame,
    tone: 'text-slate-900 dark:text-slate-100',
    iconTone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    accent: 'bg-amber-500/70',
  },
  {
    key: 'courses',
    label: 'Courses',
    value: courseCount,
    sub: 'open to you right now',
    Icon: Library,
    tone: 'text-slate-900 dark:text-slate-100',
    iconTone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    accent: 'bg-blue-500/70',
  },
]

const UserHomeStats = ({ summary, courseCount, monthLabel, loading }) => (
  <motion.section
    variants={staggerParent(0.07)}
    className={`grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-4 ${
      loading ? 'opacity-60' : 'opacity-100'
    }`}
  >
    {getTiles(summary, courseCount, monthLabel).map((tile, index) => (
      <motion.article
        key={tile.key}
        variants={fadeUp}
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {tile.label}
          </p>
          <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${tile.iconTone}`}>
            <tile.Icon className="h-5 w-5" />
          </span>
        </div>

        <p className={`mt-4 text-4xl font-black leading-none tabular-nums ${tile.tone}`}>
          <AnimatedNumber value={tile.value} />
        </p>
        <p className="mt-2 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
          {tile.sub}
        </p>

        {/* One hue per tile, matching its own icon: four gradients in a row would read
            as decoration rather than as four separate counts. */}
        <motion.div
          className={`mt-4 h-0.5 rounded-full ${tile.accent}`}
          initial={{ scaleX: 0, transformOrigin: 'left' }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.7, delay: 0.15 + (index * 0.1), ease: EASE_OUT }}
        />
      </motion.article>
    ))}
  </motion.section>
)

export default UserHomeStats
