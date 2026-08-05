import { USER_STATUS_FILTERS, USER_STATUS_META } from './userStatus'

// The same three tabs wherever a roster is split, so Active means the same thing on
// the attendance board as it does in the users table. Each tab carries its own count,
// which is also what tells the staff how the roster splits before picking one.
const UserStatusFilter = ({ value, counts, onChange, label = 'Filter by enrolment standing' }) => (
  <div
    role="group"
    aria-label={label}
    className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-950"
  >
    {USER_STATUS_FILTERS.map((status) => {
      const isSelected = status === value

      return (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          aria-pressed={isSelected}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-bold transition ${
            isSelected
              ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
          }`}
        >
          {USER_STATUS_META[status].label}
          <span className="rounded-full bg-slate-200 px-1.5 text-[10px] dark:bg-slate-700">
            {counts[status] || 0}
          </span>
        </button>
      )
    })}
  </div>
)

export default UserStatusFilter
