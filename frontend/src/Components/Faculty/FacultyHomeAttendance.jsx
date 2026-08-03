import { motion } from 'framer-motion'
import { ArrowRight, CalendarCheck, CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedNumber from '../Common/AnimatedNumber'
import { EASE_OUT, fadeUp } from '../../utils/motion'

const getPercent = (part, total) => (total ? Math.round((part / total) * 100) : 0)

const Legend = ({ dot, label, value }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
    <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
    {label}
    <span className="font-black tabular-nums text-slate-900 dark:text-slate-100">{value}</span>
  </span>
)

// The one duty that belongs to today. It is a bar rather than a ring because what a
// faculty needs to see is how much of the register is still empty, and the empty part
// is the thing the bar leaves showing.
const FacultyHomeAttendance = ({ present, absent, totalStudents, loading }) => {
  const marked = present + absent
  const notMarked = Math.max(totalStudents - marked, 0)
  const isComplete = Boolean(totalStudents) && notMarked === 0

  return (
    <motion.section
      variants={fadeUp}
      className={`flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900 sm:p-6 ${
        loading ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            <CalendarCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Attendance today</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Only you and the admin can mark it
            </p>
          </div>
        </div>

        {isComplete ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CircleCheck className="h-3.5 w-3.5" />
            Complete
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex items-baseline gap-2">
        <p className="text-5xl font-black leading-none tabular-nums text-slate-900 dark:text-slate-100">
          <AnimatedNumber value={marked} />
        </p>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          of {totalStudents} {totalStudents === 1 ? 'student' : 'students'} marked
        </p>
      </div>

      {/* Present, absent and the gap between them and the roll, in that order, so the
          bar is read left to right as done, done, still to do. */}
      <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.span
          className="h-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${getPercent(present, totalStudents)}%` }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        />
        <motion.span
          className="h-full bg-rose-500"
          initial={{ width: 0 }}
          animate={{ width: `${getPercent(absent, totalStudents)}%` }}
          transition={{ duration: 0.8, delay: 0.1, ease: EASE_OUT }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Legend dot="bg-emerald-500" label="Present" value={present} />
        <Legend dot="bg-rose-500" label="Absent" value={absent} />
        <Legend dot="bg-slate-300 dark:bg-slate-700" label="Not marked" value={notMarked} />
      </div>

      <p className="mt-5 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
        {!totalStudents
          ? 'No students are registered yet.'
          : isComplete
            ? 'Every student on the roll has been marked for today.'
            : `${notMarked} ${notMarked === 1 ? 'student is' : 'students are'} still waiting to be marked today.`}
      </p>

      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="mt-auto pt-5">
        <Link
          to="/faculty/attendance"
          className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:w-auto"
        >
          {isComplete ? 'Review the register' : 'Mark attendance'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </motion.section>
  )
}

export default FacultyHomeAttendance
