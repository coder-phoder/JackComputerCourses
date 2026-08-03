import { Check, Minus, X } from 'lucide-react'
import { STATUS_META, getDayLabel, getShortDayLabel } from '../../utils/attendance'

const STATUS_ICONS = {
  present: Check,
  absent: X,
}

// The written twin of the calendar: every day the month holds, spelled out in
// words and numbers. A reader who cannot use the colours on the grid — or who is
// on a screen reader — loses nothing by reading this list instead.
const UserAttendanceLog = ({ records, selectedDate, monthLabel, onSelectDate }) => {
  const selectedStatus = records.find((record) => record.date === selectedDate)?.status || ''
  const selectedMeta = STATUS_META[selectedStatus]
  const SelectedIcon = STATUS_ICONS[selectedStatus] || Minus
  const days = [...records].sort((first, second) => second.date.localeCompare(first.date))

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60">
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Selected day
        </p>
        <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
          {getDayLabel(selectedDate)}
        </h3>
        <span
          className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
            selectedMeta
              ? selectedMeta.chip
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }`}
        >
          <SelectedIcon className="h-3.5 w-3.5" strokeWidth={3} />
          {selectedMeta ? selectedMeta.label : 'Not marked'}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2 px-5 pt-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Day log</h3>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {days.length} marked {days.length === 1 ? 'day' : 'days'}
        </p>
      </div>

      {/* The log is capped so it sits beside the calendar instead of stretching the
          row: past the cap it scrolls on its own. */}
      <div className="max-h-80 min-h-0 flex-1 overflow-y-auto px-3 py-3 lg:max-h-88">
        {days.length ? (
          <ul className="space-y-1.5">
            {days.map((record) => {
              const meta = STATUS_META[record.status]
              const RowIcon = STATUS_ICONS[record.status]
              const isSelected = record.date === selectedDate

              return (
                <li key={record._id || record.date}>
                  <button
                    type="button"
                    onClick={() => onSelectDate(record.date)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40'
                        : 'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700'
                    }`}
                  >
                    <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                      {getShortDayLabel(record.date)}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.chip}`}>
                      <RowIcon className="h-3 w-3" strokeWidth={3} />
                      {meta.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="px-3 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
            Nothing was marked in {monthLabel}.
          </p>
        )}
      </div>
    </section>
  )
}

export default UserAttendanceLog
