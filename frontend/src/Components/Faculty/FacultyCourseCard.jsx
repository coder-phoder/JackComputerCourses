import { Link } from 'react-router-dom'
import CourseCardFooter from '../Common/CourseCardFooter'
import CourseMetaList from '../Common/CourseMetaList'
import CourseThumbnail from '../Common/CourseThumbnail'
import { accessLengthMeta, chapterMeta, priceMeta, videoMeta } from '../../utils/courseMeta'

const FacultyCourseCard = ({ course, detailUrl, dataTour }) => {
  const description = course.shortDescription || course.description || 'Course details are not available.'
  const courseTags = [course.category, course.level, course.language].filter(Boolean)

  return (
    <Link
      to={detailUrl}
      data-tour={dataTour}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 dark:focus-visible:ring-indigo-900/40"
    >
      <CourseThumbnail course={course} fallbackClassName="from-indigo-500 to-indigo-700">
        {/* Published is not worth a badge here: a faculty is only ever shown courses that
            are live, so it could only ever say one thing. Who a course is open to is what
            varies, and it is what a faculty needs before pointing a student at it. */}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur ${
          course.isOpenToAll
            ? 'bg-white/90 text-blue-700 dark:bg-slate-900/90 dark:text-blue-300'
            : 'bg-slate-900/80 text-slate-100'
        }`}
        >
          {course.isOpenToAll ? 'Open to All' : 'Restricted'}
        </span>
      </CourseThumbnail>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="line-clamp-2 text-base font-bold text-slate-900 dark:text-slate-100 transition group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
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

        <div className="mt-auto pt-4">
          <CourseMetaList items={[chapterMeta(course), videoMeta(course)]} />
          <CourseCardFooter primary={priceMeta(course)} secondary={accessLengthMeta(course)} />
        </div>
      </div>
    </Link>
  )
}

export default FacultyCourseCard
