import { Check, Minus, X } from 'lucide-react'
import {
  ATTENDANCE_STATUSES,
  STATUS_META,
  WEEKDAYS,
  buildMonthGrid,
  getDayLabel,
  getMonthLabel,
} from '../../utils/attendance'

const STATUS_ICONS = {
  present: Check,
  absent: X,
}

// The student reads his month here, he never marks it, so a day is a shape and a
// letter first and a colour second: green and red alone are the pair colourblind
// readers lose, and the tick, the cross and the legend carry the meaning without it.
const UserAttendanceCalendar = ({
  monthDate,
  statusByDate,
  selectedDate,
  onSelectDate,
  loading = false,
}) => {
  const cells = buildMonthGrid(monthDate)

  return (
    <section data-tour="attendance-calendar" className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            {getMonthLabel(monthDate)}
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {loading ? 'Loading your month...' : 'Pick a day to see how it was marked'}
          </p>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Your month
        </p>
      </header>

      <div className="p-4">
        <div className="grid grid-cols-7 gap-1.5 pb-2">
          {WEEKDAYS.map((weekday) => (
            <span
              key={weekday}
              className="pb-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500"
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((cell, index) => {
            if (!cell.inMonth) {
              return <div key={cell.key} className="min-h-18 rounded-xl" />
            }

            const status = statusByDate[cell.key] || ''
            const meta = STATUS_META[status]
            const StatusIcon = STATUS_ICONS[status] || Minus
            const isSelected = cell.key === selectedDate

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => onSelectDate(cell.key)}
                disabled={cell.isFuture}
                aria-pressed={isSelected}
                aria-label={`${getDayLabel(cell.key)} — ${meta ? meta.label : 'not marked'}`}
                title={`${getDayLabel(cell.key)} — ${meta ? meta.label : 'Not marked'}`}
                // The cells settle in one after another so a month change reads as a
                // single movement; the delay is capped so the last week is never late.
                style={{ animationDelay: `${Math.min(index, 20) * 12}ms` }}
                className={`attendance-cell group flex min-h-18 flex-col items-center justify-center gap-1.5 rounded-xl border p-1.5 transition disabled:cursor-not-allowed disabled:opacity-45 ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/40 dark:border-blue-400'
                    : 'hover:-translate-y-0.5 hover:shadow-sm'
                } ${
                  meta
                    ? meta.cell
                    : 'border-slate-200 bg-slate-50/60 hover:border-blue-300 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-blue-700'
                }`}
              >
                <span
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold ${
                    cell.isToday
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {meta ? (
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-white ${meta.mark}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="inline-flex h-5 w-5 items-center justify-center text-slate-300 dark:text-slate-700">
                    <Minus className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <footer className="flex flex-wrap items-center gap-4 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
        {ATTENDANCE_STATUSES.map((status) => {
          const LegendIcon = STATUS_ICONS[status.value]

          return (
            <span
              key={status.value}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400"
            >
              <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-white ${status.mark}`}>
                <LegendIcon className="h-2.5 w-2.5" strokeWidth={4} />
              </span>
              {status.label}
            </span>
          )
        })}
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-slate-400 dark:border-slate-700">
            <Minus className="h-2.5 w-2.5" strokeWidth={4} />
          </span>
          Not marked
        </span>
      </footer>
    </section>
  )
}

export default UserAttendanceCalendar
