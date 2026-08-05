import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight, CircleCheck, FileCode2, MessageSquareCode } from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedNumber from '../Common/AnimatedNumber'
import { fadeUp, staggerParent } from '../../utils/motion'
import { getWaitedLabel } from '../../utils/relativeTime'

const PREVIEW_COUNT = 3

// What students are waiting on, oldest wait first: a queue is only useful if the one
// that has been sitting longest is the one on top.
const FacultyHomeQueries = ({ queries, loading }) => {
  const pending = queries
    .filter((query) => query.status === 'pending')
    .sort((first, second) => new Date(first.createdAt) - new Date(second.createdAt))
  const inProgress = queries.filter((query) => query.status === 'accepted').length

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
            <MessageSquareCode className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Code queries</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {inProgress
                ? `${inProgress} accepted and still open`
                : 'Questions students sent you'}
            </p>
          </div>
        </div>

        {pending.length ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            Waiting
          </span>
        ) : null}
      </div>

      {pending.length ? (
        <>
          <div className="mt-6 flex items-baseline gap-2">
            <p className="text-5xl font-black leading-none tabular-nums text-slate-900 dark:text-slate-100">
              <AnimatedNumber value={pending.length} />
            </p>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {pending.length === 1 ? 'query needs a reply' : 'queries need a reply'}
            </p>
          </div>

          <motion.div variants={staggerParent(0.06, 0.1)} className="mt-5 grid gap-2">
            {pending.slice(0, PREVIEW_COUNT).map((query) => (
              <motion.div key={query._id} variants={fadeUp}>
                <Link
                  to="/faculty/queries"
                  className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 transition hover:border-violet-300 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-violet-700 dark:hover:bg-slate-900"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <FileCode2 className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                      {query.userName || query.userPhone}
                    </span>
                    <span className="block truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {query.fileName}
                    </span>
                  </span>

                  <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {getWaitedLabel(query.createdAt)}
                  </span>

                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-violet-600 dark:group-hover:text-violet-400" />
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </>
      ) : (
        <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center dark:border-slate-800">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CircleCheck className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900 dark:text-slate-100">All caught up</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {loading ? 'Checking your queue...' : 'No student is waiting on a reply.'}
          </p>
        </div>
      )}

      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="mt-auto pt-5">
        <Link
          to="/faculty/queries"
          className="group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-300 dark:hover:border-violet-700 dark:hover:bg-violet-950/40 sm:w-auto"
        >
          {pending.length > PREVIEW_COUNT ? `Open all ${pending.length} queries` : 'Open queries'}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </motion.section>
  )
}

export default FacultyHomeQueries
