import { motion } from 'framer-motion'
import { ArrowRight, CalendarRange, CircleCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedNumber from '../Common/AnimatedNumber'
import { getShortDayLabel } from '../../utils/attendance'
import { EASE_OUT, fadeUp } from '../../utils/motion'

// The faculty page asks one question of the register — is today done — because a
// faculty only ever owes today. The admin owns the month, so this reads the month it
// already loaded as a column per day: a day nobody marked is a gap in the row, and
// gaps are the only thing on this card worth acting on.
const Legend = ({ dot, label, value }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
    <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
    {label}
    <span className="font-black tabular-nums text-slate-900 dark:text-slate-100">{value}</span>
  </span>
)

// One pass over the month builds every column, so the strip costs the same whether
// the register is empty or complete.
const getDays = (records, today, rosterSize) => {
  const totals = new Map()

  records.forEach((record) => {
    const day = totals.get(record.date) || { present: 0, absent: 0 }

    day[record.status] += 1
    totals.set(record.date, day)
  })

  const [year, month, dayOfMonth] = today.split('-').map(Number)

  // The month only ever runs as far as today: days that have not happened yet are
  // not gaps in the register, so they are not drawn as any.
  return Array.from({ length: dayOfMonth }, (item, index) => {
    const dateKey = `${today.slice(0, 8)}${String(index + 1).padStart(2, '0')}`
    const day = totals.get(dateKey) || { present: 0, absent: 0 }
    const marked = day.present + day.absent

    return {
      dateKey,
      dayNumber: index + 1,
      isToday: index + 1 === dayOfMonth,
      weekend: new Date(year, month - 1, index + 1).getDay() === 0,
      ...day,
      marked,
      // Heights are read against the roll, so a half-marked day is visibly half a
      // column rather than a full one drawn from its own total.
      presentShare: rosterSize ? (day.present / rosterSize) * 100 : 0,
      absentShare: rosterSize ? (day.absent / rosterSize) * 100 : 0,
    }
  })
}

const AdminHomeAttendance = ({ records, rosterSize, today, monthLabel, loading }) => {
  const days = getDays(records, today, rosterSize)
  const todayCounts = days.at(-1) || { present: 0, absent: 0, marked: 0 }
  const notMarked = Math.max(rosterSize - todayCounts.marked, 0)
  const isComplete = Boolean(rosterSize) && notMarked === 0
  // Today is left out of the gaps: a morning nobody has marked yet is not a day that
  // was missed, and the line above already says today is empty. Sundays are left out
  // because the institute does not sit on them.
  const untouchedDays = days.slice(0, -1).filter((day) => !day.marked && !day.weekend).length

  // Who signed today's register: the admin is the only role that can see this, and it
  // is the fastest way to tell a quiet day from an unattended one.
  const markers = [...new Set(records
    .filter((record) => record.date === today && record.markedByName)
    .map((record) => record.markedByName))]

  return (
    <motion.section
      variants={fadeUp}
      data-tour="admin-register"
      className={`flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900 sm:p-6 ${
        loading ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300">
            <CalendarRange className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">The register</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {monthLabel} · one column a day
            </p>
          </div>
        </div>

        {isComplete ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CircleCheck className="h-3.5 w-3.5" />
            Today done
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex items-baseline gap-2">
        <p className="text-5xl font-black leading-none tabular-nums text-slate-900 dark:text-slate-100">
          <AnimatedNumber value={todayCounts.marked} />
        </p>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
          of {rosterSize} marked today
        </p>
      </div>

      <div className="mt-5 flex h-28 items-end gap-0.75" role="img" aria-label={`Attendance marked each day of ${monthLabel}`}>
        {days.map((day, index) => (
          <div
            key={day.dateKey}
            title={`${getShortDayLabel(day.dateKey)} · ${day.marked ? `${day.present} present, ${day.absent} absent` : 'not marked'}`}
            className={`relative h-full min-w-0 flex-1 overflow-hidden rounded-sm ${
              day.isToday
                ? 'bg-fuchsia-100 ring-2 ring-fuchsia-400 dark:bg-fuchsia-950/50 dark:ring-fuchsia-600'
                : day.weekend
                  ? 'bg-slate-50 dark:bg-slate-800/50'
                  : 'bg-slate-100 dark:bg-slate-800'
            }`}
          >
            {/* The stack fills the column so both shares are read against the roll,
                and grows out of its own baseline so the month arrives as one sweep. */}
            <motion.div
              className="absolute inset-0 flex flex-col-reverse"
              style={{ transformOrigin: 'bottom' }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: 0.1 + (index * 0.012), ease: EASE_OUT }}
            >
              <span className="block shrink-0 bg-emerald-500" style={{ height: `${day.presentShare}%` }} />
              <span className="block shrink-0 bg-rose-500" style={{ height: `${day.absentShare}%` }} />
            </motion.div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        <span>1 {monthLabel.slice(0, 3)}</span>
        <span className="text-fuchsia-600 dark:text-fuchsia-400">Today</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Legend dot="bg-emerald-500" label="Present" value={todayCounts.present} />
        <Legend dot="bg-rose-500" label="Absent" value={todayCounts.absent} />
        <Legend dot="bg-slate-300 dark:bg-slate-700" label="Not marked" value={notMarked} />
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
        {!rosterSize ? 'No students are registered yet, so there is nothing to mark.' : (
          <>
            {markers.length
              ? `Today was marked by ${markers.join(', ')}.`
              : 'Nobody has touched today’s register yet.'}
            {untouchedDays ? (
              <>
                {' '}
                {untouchedDays === 1
                  ? 'One earlier day this month is still blank.'
                  : `${untouchedDays} earlier days this month are still blank.`}
              </>
            ) : null}
          </>
        )}
      </p>

      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="mt-auto pt-5">
        <Link
          to="/admin/attendance"
          className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-fuchsia-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 sm:w-auto"
        >
          {isComplete ? 'Review the register' : 'Open the register'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </motion.section>
  )
}

export default AdminHomeAttendance
