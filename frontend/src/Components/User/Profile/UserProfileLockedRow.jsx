import { Lock } from 'lucide-react'

// The same row, without the way in. What the institute holds for an account is listed
// beside what the account may edit so the difference between the two is the padlock at
// the end of the line rather than a separate part of the page.
const UserProfileLockedRow = ({ Icon, label, value }) => (
  <div className="flex items-center gap-4 px-5 py-5">
    <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400 dark:text-slate-500" />

    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
      <span className="text-base font-bold text-slate-900 dark:text-slate-100">{label}</span>
      <span className="min-w-0 truncate text-sm font-medium text-slate-500 dark:text-slate-400">
        {value}
      </span>
    </span>

    <span
      title="Only an admin can change this"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
    >
      <Lock className="h-3 w-3" />
      Locked
    </span>
  </div>
)

export default UserProfileLockedRow
