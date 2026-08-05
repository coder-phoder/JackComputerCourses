import { motion } from 'framer-motion'
import { CircleAlert, PanelLeft } from 'lucide-react'
import { EASE_OUT, fadeUp } from '../../../utils/motion'

// The rail is the whole of the page's navigation: it names every group, says how much
// of each is filled in, and picks the one the panel beside it shows. Nothing scrolls,
// so what it points at is always the thing on screen.
const UserProfileSidebar = ({ items, activeItem, onSelect, filled, total, percent, children }) => (
  <motion.aside
    variants={fadeUp}
    data-tour="profile-progress"
    className="flex min-h-0 flex-col lg:overflow-y-auto"
  >
    <div className="flex items-center gap-3">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <PanelLeft className="h-4.5 w-4.5" />
      </span>
      <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
        Profile
      </h1>
    </div>

    <nav className="mt-6 grid gap-1">
      {items.map((item) => {
        const isActive = activeItem === item.id

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isActive
                ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100'
            }`}
          >
            <span className="truncate">{item.label}</span>

            {/* A group holding the save up says so here, because it may well be one
                the reader cannot see from where they are. */}
            {item.hasError ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-[11px] font-bold tabular-nums text-rose-600 dark:text-rose-400">
                <CircleAlert className="h-3.5 w-3.5" />
                {item.count}
              </span>
            ) : item.count ? (
              <span className="shrink-0 text-[11px] font-bold tabular-nums text-slate-400 dark:text-slate-500">
                {item.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>

    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          Filled in
        </p>
        <p className="text-sm font-black tabular-nums text-slate-900 dark:text-slate-100">
          {filled}
          <span className="text-slate-400 dark:text-slate-500">/{total}</span>
        </p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          className="h-full rounded-full bg-blue-600 dark:bg-blue-500"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        />
      </div>

      <p className="mt-3 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400">
        Every detail here is optional. Fill in only what you want the institute to have.
      </p>
    </div>

    {/* The walkthrough is the page's own action rather than one of the groups, so it
        sits under the rail instead of taking a line in the panel. */}
    <div className="mt-6 lg:mt-auto lg:pt-6">
      {children}
    </div>
  </motion.aside>
)

export default UserProfileSidebar
