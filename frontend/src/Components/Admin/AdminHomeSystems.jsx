import { motion } from 'framer-motion'
import { ArrowUpRight, KeyRound, Layers3, Library, PlayCircle, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import AnimatedNumber from '../Common/AnimatedNumber'
import { EASE_OUT, fadeUp, staggerParent } from '../../utils/motion'

// What the site is made of, in the three sets an admin actually administers: the
// people in it, the catalogue they are given, and the depth behind that catalogue.
// Each card carries its own split rather than a fifth number, because the useful
// question about a total here is always how it divides — students against faculty,
// published against draft.
const SplitBar = ({ first, second, firstClass, secondClass }) => {
  const total = first + second

  return (
    <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      {[
        { key: 'first', value: first, className: firstClass },
        { key: 'second', value: second, className: secondClass },
      ].map((segment, index) => (
        <motion.span
          key={segment.key}
          className={`h-full ${segment.className}`}
          initial={{ width: 0 }}
          animate={{ width: total ? `${(segment.value / total) * 100}%` : '0%' }}
          transition={{ duration: 0.8, delay: 0.1 + (index * 0.1), ease: EASE_OUT }}
        />
      ))}
    </div>
  )
}

const SplitLegend = ({ dot, label, value }) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <span className="inline-flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
      <span className="truncate">{label}</span>
    </span>
    <span className="shrink-0 text-sm font-black tabular-nums text-slate-900 dark:text-slate-100">
      {value}
    </span>
  </div>
)

const StatRow = ({ Icon, label, value }) => (
  <div className="flex items-center gap-3 py-2">
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
      {label}
    </span>
    <span className="shrink-0 text-sm font-black tabular-nums text-slate-900 dark:text-slate-100">
      {value}
    </span>
  </div>
)

const Card = ({ title, eyebrow, total, unit, Icon, iconTone, to, linkLabel, children }) => (
  <motion.article
    variants={fadeUp}
    whileHover={{ y: -4 }}
    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-700"
  >
    <div className="flex items-start justify-between gap-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-400">
        {eyebrow}
      </p>
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconTone}`}>
        <Icon className="h-5 w-5" />
      </span>
    </div>

    <div className="mt-2 flex items-baseline gap-2">
      <p className="text-4xl font-black leading-none tabular-nums text-slate-900 dark:text-slate-100">
        <AnimatedNumber value={total} />
      </p>
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{unit}</p>
    </div>

    <h2 className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h2>

    <div className="flex-1">{children}</div>

    <Link
      to={to}
      className="group mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-violet-700 transition hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200"
    >
      {linkLabel}
      <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  </motion.article>
)

const AdminHomeSystems = ({ users, faculties, courses, loading }) => {
  const published = courses.filter((course) => course.isPublished).length
  const openToAll = courses.filter((course) => course.isOpenToAll).length
  const totals = courses.reduce((sums, course) => ({
    chapters: sums.chapters + (course.chapterCount || 0),
    videos: sums.videos + (course.videoCount || 0),
    grants: sums.grants + (course.accessUserCount || 0),
  }), { chapters: 0, videos: 0, grants: 0 })

  return (
    <motion.section
      variants={staggerParent(0.07)}
      data-tour="admin-systems"
      className={`grid gap-5 transition-opacity lg:grid-cols-3 ${loading ? 'opacity-60' : 'opacity-100'}`}
    >
      <Card
        eyebrow="People"
        total={users.length + faculties.length}
        unit={users.length + faculties.length === 1 ? 'account' : 'accounts'}
        title="Everyone who can sign in"
        Icon={Users}
        iconTone="bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300"
        to="/admin/users"
        linkLabel="Manage accounts"
      >
        <SplitBar
          first={users.length}
          second={faculties.length}
          firstClass="bg-violet-500"
          secondClass="bg-amber-500"
        />
        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          <SplitLegend dot="bg-violet-500" label="Students" value={users.length} />
          <SplitLegend dot="bg-amber-500" label="Faculties" value={faculties.length} />
        </div>
      </Card>

      <Card
        eyebrow="Catalogue"
        total={courses.length}
        unit={courses.length === 1 ? 'course' : 'courses'}
        title="What the site is teaching"
        Icon={Library}
        iconTone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
        to="/admin/courses"
        linkLabel="Open the catalogue"
      >
        <SplitBar
          first={published}
          second={courses.length - published}
          firstClass="bg-emerald-500"
          secondClass="bg-slate-300 dark:bg-slate-600"
        />
        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          <SplitLegend dot="bg-emerald-500" label="Published" value={published} />
          <SplitLegend dot="bg-slate-300 dark:bg-slate-600" label="Draft" value={courses.length - published} />
          <SplitLegend dot="bg-sky-500" label="Open to everyone" value={openToAll} />
        </div>
      </Card>

      <Card
        eyebrow="Library"
        total={totals.videos}
        unit={totals.videos === 1 ? 'video' : 'videos'}
        title="What sits behind the catalogue"
        Icon={PlayCircle}
        iconTone="bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
        to="/admin/topic-notes"
        linkLabel="Open notes"
      >
        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          <StatRow Icon={Layers3} label="Chapters" value={totals.chapters} />
          <StatRow Icon={PlayCircle} label="Videos" value={totals.videos} />
          <StatRow Icon={KeyRound} label="Access grants" value={totals.grants} />
        </div>
      </Card>
    </motion.section>
  )
}

export default AdminHomeSystems
