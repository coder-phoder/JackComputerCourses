import { ArrowUpRight, Check } from 'lucide-react'
import { courseEnquiryLink } from '../../utils/landingContent'
import SpotlightCard from './SpotlightCard'

const Meta = ({ children }) => (
  <span className="rounded-lg border border-slate-200 bg-slate-100/70 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
    {children}
  </span>
)

// One card for one course, in two depths. The home page shows the two flagship courses
// in full and the rest as a line each; the catalog shows all five in full. Both read the
// course out of the same list, so a syllabus is written once and appears wherever the
// course does.
const CourseCard = ({ course, detailed = false }) => {
  if (!detailed) {
    return (
      <SpotlightCard as="a" href={courseEnquiryLink(course)} target="_blank" rel="noopener noreferrer" className="block p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-code text-[11px] tracking-[0.14em] text-slate-400 dark:text-slate-500">{course.code}</p>
            <h3 className="mt-2 font-display text-lg font-semibold text-slate-900 dark:text-white">{course.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{course.short}</p>
          </div>

          <ArrowUpRight className="h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600 dark:group-hover:text-cyan-300" />
        </div>
      </SpotlightCard>
    )
  }

  return (
    <SpotlightCard as="article" className="flex h-full flex-col p-7 sm:p-8">
      {/* The course's own colour, and the only place the card carries it — five cards in
          a row read as one set with five marks rather than five palettes. */}
      <span className={`mb-6 block h-1 w-14 rounded-full bg-linear-to-r ${course.accent}`} />

      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="font-code text-[11px] tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {course.code} · {course.category}
          </p>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {course.name}
          </h3>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-xl font-bold text-slate-900 dark:text-white">{course.fee}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{course.feeNote}</p>
        </div>
      </div>

      <p className="mt-4 text-[0.95rem] leading-relaxed text-pretty text-slate-600 dark:text-slate-300">
        {course.blurb}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Meta>{course.duration}</Meta>
        <Meta>{course.level}</Meta>
        <Meta>{course.mode}</Meta>
      </div>

      <div className="mt-6 border-t border-slate-200/70 pt-6 dark:border-white/10">
        <p className="font-code text-[11px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          What you cover
        </p>

        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {course.modules.map((module) => (
            <li key={module} className="flex items-start gap-2.5 text-sm leading-snug text-slate-700 dark:text-slate-300">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-cyan-300" />
              {module}
            </li>
          ))}
        </ul>

        <p className="mt-5 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm leading-relaxed text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-400/5 dark:text-cyan-200">
          {course.build}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-7">
        <span className="text-sm text-slate-500 dark:text-slate-400">Taught by {course.taughtBy}</span>

        <a
          href={courseEnquiryLink(course)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-700 transition duration-300 hover:bg-blue-600 hover:text-white dark:border-cyan-300/25 dark:bg-cyan-400/10 dark:text-cyan-200 dark:hover:bg-cyan-400 dark:hover:text-slate-950"
        >
          Ask about this course
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </SpotlightCard>
  )
}

export default CourseCard
