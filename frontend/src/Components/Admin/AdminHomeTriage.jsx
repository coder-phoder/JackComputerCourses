import { motion } from 'framer-motion'
import { ArrowRight, Bug, ChevronRight, CircleCheck, Inbox, KeyRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedNumber from '../Common/AnimatedNumber'
import { fadeUp, staggerParent } from '../../utils/motion'
import { getWaitedLabel } from '../../utils/relativeTime'

const PREVIEW_COUNT = 5

// Two queues, one wait. A locked-out student and a broken page arrive from different
// pages and are decided on different pages, but to the admin they are the same job —
// somebody is stuck until a decision is made — so they are read as one list, oldest
// first, instead of as two panels each hiding how long the other has been waiting.
const KINDS = {
  access: {
    label: 'Password',
    to: '/admin/users',
    Icon: KeyRound,
    tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  },
  bug: {
    label: 'Bug',
    to: '/admin/bugs',
    Icon: Bug,
    tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  },
}

const getQueue = (requests, bugs) => [
  ...requests
    .filter((request) => request.status === 'pending')
    .map((request) => ({
      key: `request-${request._id}`,
      kind: 'access',
      title: request.name || request.phone,
      detail: `${request.phone} · ${request.hasAccount ? 'existing account' : 'no account yet'}`,
      at: request.createdAt,
    })),
  ...bugs
    .filter((bug) => bug.status === 'open')
    .map((bug) => ({
      key: `bug-${bug._id}`,
      kind: 'bug',
      title: bug.title,
      detail: `${bug.reporterName || bug.reporterPhone} · ${bug.reporterRole}`,
      at: bug.createdAt,
    })),
].sort((first, second) => new Date(first.at) - new Date(second.at))

const AdminHomeTriage = ({ requests, bugs, loading }) => {
  const queue = getQueue(requests, bugs)
  const passwordCount = queue.filter((item) => item.kind === 'access').length
  const bugCount = queue.length - passwordCount
  // The total is the headline, so the line beside it says what the total is made of
  // and names only the queue that actually has something in it.
  const breakdown = [
    passwordCount ? `${passwordCount} password ${passwordCount === 1 ? 'request' : 'requests'}` : '',
    bugCount ? `${bugCount} bug ${bugCount === 1 ? 'report' : 'reports'}` : '',
  ].filter(Boolean).join(' · ')

  return (
    <motion.section
      variants={fadeUp}
      className={`flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-opacity dark:border-slate-800 dark:bg-slate-900 sm:p-6 ${
        loading ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
            <Inbox className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Waiting on your decision
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Password requests and bug reports, longest wait first
            </p>
          </div>
        </div>

        {queue.length ? (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            {getWaitedLabel(queue[0].at)}
          </span>
        ) : null}
      </div>

      {queue.length ? (
        <>
          <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="text-5xl font-black leading-none tabular-nums text-slate-900 dark:text-slate-100">
              <AnimatedNumber value={queue.length} />
            </p>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {breakdown} still open
            </p>
          </div>

          <motion.div variants={staggerParent(0.06, 0.1)} className="mt-5 grid gap-2">
            {queue.slice(0, PREVIEW_COUNT).map((item) => {
              const kind = KINDS[item.kind]

              return (
                <motion.div key={item.key} variants={fadeUp}>
                  <Link
                    to={kind.to}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-violet-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-violet-700 dark:hover:bg-slate-900"
                  >
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${kind.tone}`}>
                      <kind.Icon className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {item.detail}
                      </span>
                    </span>

                    <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold sm:inline-block ${kind.chip}`}>
                      {kind.label}
                    </span>

                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      {getWaitedLabel(item.at)}
                    </span>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>

          {queue.length > PREVIEW_COUNT ? (
            <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {queue.length - PREVIEW_COUNT} more behind these.
            </p>
          ) : null}
        </>
      ) : (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center dark:border-slate-800">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CircleCheck className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">The queue is empty</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {loading
              ? 'Reading the requests and the reports...'
              : 'No password request and no bug report is waiting.'}
          </p>
        </div>
      )}

      {/* Both queues stay one click away even when neither has anything in it: the
          decided history of each lives on the same page as its open reports. */}
      <div className="mt-auto flex flex-col gap-2.5 pt-5 sm:flex-row">
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="sm:flex-1">
          <Link
            to="/admin/users"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            Password requests
            {passwordCount ? (
              <span className="rounded-full bg-white/20 px-1.5 text-xs font-black">{passwordCount}</span>
            ) : null}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>

        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="sm:flex-1">
          <Link
            to="/admin/bugs"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-300 dark:hover:border-violet-700 dark:hover:bg-violet-950/40"
          >
            Bug reports
            {bugCount ? (
              <span className="rounded-full bg-violet-100 px-1.5 text-xs font-black text-violet-700 dark:bg-violet-950/60 dark:text-violet-300">
                {bugCount}
              </span>
            ) : null}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}

export default AdminHomeTriage
