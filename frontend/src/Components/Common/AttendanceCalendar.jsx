import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { ATTENDANCE_STATUSES, WEEKDAYS, buildMonthGrid, getMonthLabel, STATUS_META } from '../../utils/attendance'

// The same grid serves both readings of a month: a roster day shows how many
// students carry each status, a single student's day is painted with his own one.
const AttendanceCalendar = ({
  monthDate,
  onMonthChange,
  selectedDate,
  onSelectDate,
  summaries,
  singleStudent = false,
  loading = false,
  onPrint = null,
}) => {
  const cells = buildMonthGrid(monthDate)

  return (
    <section data-tour="attendance-board-calendar" className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white px-5 py-4 dark:border-slate-800 dark:from-indigo-950/40 dark:to-slate-900">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {getMonthLabel(monthDate)}
          </h2>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            {loading ? 'Loading attendance...' : 'Pick a day to mark attendance'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Prints exactly the month on screen, so the button sits beside its name. */}
          {onPrint ? (
            <button
              type="button"
              onClick={onPrint}
              aria-label={`Print ${getMonthLabel(monthDate)} attendance`}
              title={`Print ${getMonthLabel(monthDate)} attendance`}
              className="mr-1 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 sm:px-3"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onMonthChange(-1)}
            aria-label="Previous month"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-600 dark:hover:text-indigo-300"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(0)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-600 dark:hover:text-indigo-300"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(1)}
            aria-label="Next month"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-600 dark:hover:text-indigo-300"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
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
          {cells.map((cell) => {
            if (!cell.inMonth) {
              return <div key={cell.key} className="min-h-16 rounded-xl" />
            }

            const summary = summaries[cell.key]
            const isSelected = cell.key === selectedDate
            // A single student's day carries exactly one status, so the whole cell
            // takes that colour instead of a row of counters.
            const studentStatus = singleStudent && summary
              ? Object.keys(summary).find((status) => summary[status])
              : ''
            const statusTint = studentStatus ? STATUS_META[studentStatus].cell : ''

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => onSelectDate(cell.key)}
                aria-pressed={isSelected}
                className={`group flex min-h-16 flex-col items-stretch rounded-xl border p-1.5 text-left transition ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/40 dark:border-indigo-400 dark:bg-indigo-950/50'
                    : statusTint || 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-bold ${
                      cell.isToday
                        ? 'bg-indigo-600 text-white'
                        : `${isSelected ? 'text-indigo-700 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'} ${cell.isFuture ? 'opacity-50' : ''}`
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                  {studentStatus ? (
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white ${STATUS_META[studentStatus].dot}`}>
                      {STATUS_META[studentStatus].short}
                    </span>
                  ) : null}
                </span>

                {!singleStudent && summary ? (
                  <span className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                    {ATTENDANCE_STATUSES.filter((status) => summary[status.value]).map((status) => (
                      <span
                        key={status.value}
                        title={`${summary[status.value]} ${status.label}`}
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${status.chip}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {summary[status.value]}
                      </span>
                    ))}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
        {ATTENDANCE_STATUSES.map((status) => (
          <span key={status.value} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        ))}
      </footer>
    </section>
  )
}

export default AttendanceCalendar
