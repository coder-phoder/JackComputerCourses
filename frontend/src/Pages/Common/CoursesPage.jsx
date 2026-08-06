import { AnimatePresence, motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { useMemo, useState } from 'react'
import CourseCard from '../../Components/Landing/CourseCard'
import LandingLayout from '../../Components/Landing/LandingLayout'
import Reveal from '../../Components/Landing/Reveal'
import { COURSES, COURSE_CATEGORIES } from '../../utils/landingContent'
import { EASE_OUT } from '../../utils/motion'

// The whole catalog on one page, filtered in place. Nothing is fetched — these five
// courses are what the institute teaches, and the list they come from is the same one
// the home page and the footer read.
const CoursesPage = () => {
  const [category, setCategory] = useState(COURSE_CATEGORIES[0])

  const visibleCourses = useMemo(() => (
    category === COURSE_CATEGORIES[0]
      ? COURSES
      : COURSES.filter((course) => course.category === category)
  ), [category])

  return (
    <LandingLayout>
      <section className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <Reveal as="p" className="font-code text-xs uppercase tracking-[0.18em] text-blue-600 dark:text-cyan-300">
          Course catalog
        </Reveal>

        <Reveal as="h1" delay={0.06} className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          Five courses. Pick the one that gets you working.
        </Reveal>

        <Reveal as="p" delay={0.12} className="mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-slate-600 dark:text-slate-300">
          Programming, computer fundamentals, accounts and design — taught by five faculty
          in our Chandkheda lab and through the student portal.
        </Reveal>

        <Reveal delay={0.18} className="mt-9 flex flex-wrap gap-2.5">
          {COURSE_CATEGORIES.map((name) => {
            const isActive = name === category

            return (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                className={`relative rounded-full px-5 py-2.5 text-sm font-medium transition-colors duration-300 ${
                  isActive
                    ? 'text-white dark:text-slate-950'
                    : 'border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-cyan-300/40 dark:hover:text-white'
                }`}
              >
                {isActive ? (
                  <motion.span
                    layoutId="category-pill"
                    transition={{ duration: 0.4, ease: EASE_OUT }}
                    className="absolute inset-0 rounded-full bg-linear-to-r from-blue-600 to-indigo-600 dark:from-cyan-300 dark:to-blue-400"
                  />
                ) : null}
                <span className="relative">{name}</span>
              </button>
            )
          })}
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* `layout` on the grid children is what makes a filter read as the cards moving
            rather than the list being replaced. */}
        <motion.div layout className="grid gap-6 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {visibleCourses.map((course) => (
              <motion.div
                key={course.id}
                layout
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -12 }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
              >
                <CourseCard course={course} detailed />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        <Reveal className="mt-8 flex items-start gap-4 rounded-3xl border border-dashed border-slate-300 bg-white/50 p-6 backdrop-blur dark:border-white/15 dark:bg-white/3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-cyan-300" />
          <p className="leading-relaxed text-slate-600 dark:text-slate-300">
            Fees for CCC, Tally and Graphic Designing depend on the batch and the duration
            you pick — message us on WhatsApp and we will tell you straight away. Python
            and SQL are fixed at ₹10,000 for the full 3 months.
          </p>
        </Reveal>
      </section>
    </LandingLayout>
  )
}

export default CoursesPage
