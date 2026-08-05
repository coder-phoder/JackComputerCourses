import CourseCardFooter from '../Common/CourseCardFooter'
import CourseMetaList from '../Common/CourseMetaList'
import CourseThumbnail from '../Common/CourseThumbnail'
import { accessEndsMeta, chapterMeta, videoMeta } from '../../utils/courseMeta'

const UserCourseCard = ({ course, playerUrl, dataTour }) => {
  const description = course.shortDescription || course.description || 'Course details are not available.'
  const courseTags = [course.category, course.level, course.language].filter(Boolean)

  return (
    <a
      href={playerUrl}
      target="_blank"
      rel="noreferrer"
      data-tour={dataTour}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:focus-visible:ring-blue-900/40"
    >
      <CourseThumbnail course={course} fallbackClassName="from-blue-500 to-blue-700" />

      <div className="flex flex-1 flex-col p-5">
        <h2 className="line-clamp-2 text-base font-bold text-slate-900 dark:text-slate-100 transition group-hover:text-blue-700 dark:group-hover:text-blue-300">
          {course.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>

        {courseTags.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {courseTags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        {/* A student has already paid to be here, so the deadline is what they need off a
            card — it closes on its own line rather than queueing behind the chapter count. */}
        <div className="mt-auto pt-4">
          <CourseMetaList items={[chapterMeta(course), videoMeta(course)]} />
          <CourseCardFooter primary={accessEndsMeta(course)} />
        </div>
      </div>
    </a>
  )
}

export default UserCourseCard
