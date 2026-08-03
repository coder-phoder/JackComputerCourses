import { motion } from 'framer-motion'
import { BookOpen, Bug, CalendarCheck, ChevronRight, Terminal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fadeUp, staggerParent } from '../../utils/motion'

// The four places this account can go, named by what they are for. They sit in one
// panel rather than four floating boxes, so the page reads as sections instead of a
// wall of tiles.
const QUICK_LINKS = [
  {
    to: '/user/courses',
    label: 'Courses',
    hint: 'Watch and resume lessons',
    Icon: BookOpen,
    tone: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
  },
  {
    to: '/user/attendance',
    label: 'Attendance',
    hint: 'Your record, month by month',
    Icon: CalendarCheck,
    tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  {
    to: '/user/ide',
    label: 'Code IDE',
    hint: 'Write, run and ask a faculty',
    Icon: Terminal,
    tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
  },
  {
    to: '/user/bugs',
    label: 'Report a bug',
    hint: 'Tell an admin what broke',
    Icon: Bug,
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  },
]

const UserHomeQuickLinks = () => (
  <motion.section
    variants={fadeUp}
    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
  >
    <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      Quick links
    </h2>

    <motion.div variants={staggerParent(0.06, 0.08)} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {QUICK_LINKS.map((link) => (
        <motion.div key={link.to} variants={fadeUp} whileHover={{ y: -3 }} whileTap={{ scale: 0.99 }}>
          <Link
            to={link.to}
            className="group flex h-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:border-blue-300 hover:bg-white hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-blue-700 dark:hover:bg-slate-900"
          >
            <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition group-hover:scale-110 ${link.tone}`}>
              <link.Icon className="h-5 w-5" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">
                {link.label}
              </span>
              <span className="mt-0.5 block text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                {link.hint}
              </span>
            </span>

            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
          </Link>
        </motion.div>
      ))}
    </motion.div>
  </motion.section>
)

export default UserHomeQuickLinks
