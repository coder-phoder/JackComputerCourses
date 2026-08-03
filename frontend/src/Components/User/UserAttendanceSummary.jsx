import { CalendarCheck, CircleCheck, CircleX, Flame, Info, TrendingUp } from 'lucide-react'
import { STATUS_META } from '../../utils/attendance'

// The ring is a meter, not a two slice pie: it reads one ratio against 100%, so the
// unfilled part stays a lighter step of the very same hue instead of becoming a
// second colour that looks like data.
const RING_RADIUS = 56
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// The rate alone never says whether it is good news, so the headline carries a
// worded standing with its own icon and colour is only ever the third cue.
const getStanding = (summary) => {
  if (!summary.marked) {
    return {
      label: 'Nothing marked yet',
      hint: 'Your attendance for this month has not been recorded.',
      chip: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
      Icon: Info,
    }
  }

  if (summary.rate >= 90) {
    return {
      label: 'Excellent',
      hint: 'You are on top of your classes. Keep it going.',
      chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
      Icon: CircleCheck,
    }
  }

  if (summary.rate >= 75) {
    return {
      label: 'On track',
      hint: 'A steady month. A few more present days lift this fast.',
      chip: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
      Icon: TrendingUp,
    }
  }

  return {
    label: 'Needs attention',
    hint: 'You have missed more classes than usual this month.',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    Icon: Info,
  }
}

const StatTile = ({ label, value, sub, Icon, tone, iconTone }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700">
    <div className="flex items-center gap-2">
      <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${iconTone}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
    </div>
    <p className={`mt-3 text-3xl font-bold leading-none ${tone}`}>{value}</p>
    <p className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{sub}</p>
  </div>
)

const UserAttendanceSummary = ({ summary, monthLabel }) => {
  const standing = getStanding(summary)
  const StandingIcon = standing.Icon
  const dashOffset = RING_CIRCUMFERENCE * (1 - (summary.rate / 100))

  return (
    <section data-tour="attendance-summary" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-6 bg-linear-to-br from-blue-50 via-white to-white p-5 sm:p-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40">
            <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle
                cx="64"
                cy="64"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="10"
                className="stroke-blue-100 dark:stroke-blue-950"
              />
              <circle
                cx="64"
                cy="64"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1)' }}
                className="stroke-blue-600 dark:stroke-blue-500"
              />
            </svg>

            {/* The one number the page leads with, so it stays the only figure at this size. */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-5xl font-bold leading-none text-slate-900 dark:text-slate-100">
                {summary.rate}
                <span className="align-top text-xl font-bold text-slate-400 dark:text-slate-500">%</span>
              </p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Present
              </p>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              {monthLabel}
            </p>
            <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              Attendance rate
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
              {summary.marked
                ? `${summary.present} present of ${summary.marked} marked ${summary.marked === 1 ? 'day' : 'days'}`
                : 'No days marked this month'}
            </p>
            <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${standing.chip}`}>
              <StandingIcon className="h-3.5 w-3.5" />
              {standing.label}
            </span>
            <p className="mt-2 max-w-xs text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
              {standing.hint}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
          <StatTile
            label="Present"
            value={summary.present}
            sub={summary.present === 1 ? 'day this month' : 'days this month'}
            Icon={CircleCheck}
            tone={STATUS_META.present.ink}
            iconTone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
          />
          <StatTile
            label="Absent"
            value={summary.absent}
            sub={summary.absent === 1 ? 'day this month' : 'days this month'}
            Icon={CircleX}
            tone={STATUS_META.absent.ink}
            iconTone="bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
          />
          <StatTile
            label="Current streak"
            value={summary.currentStreak}
            sub="present days in a row"
            Icon={Flame}
            tone="text-slate-900 dark:text-slate-100"
            iconTone="bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
          />
          <StatTile
            label="Best streak"
            value={summary.bestStreak}
            sub="longest run this month"
            Icon={CalendarCheck}
            tone="text-slate-900 dark:text-slate-100"
            iconTone="bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
          />
        </div>
      </div>
    </section>
  )
}

export default UserAttendanceSummary
