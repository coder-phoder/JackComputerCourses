import { Link } from 'react-router-dom'

const getCount = (value) => {
  const count = Number(value)

  return Number.isFinite(count) && count > 0 ? count : 0
}

const getDurationLabel = (course) => (
  course.isOpenToAll || !course.duration ? 'N/A' : `${course.duration} mo`
)

const getPriceLabel = (value) => {
  const price = Number(value)

  if (!Number.isFinite(price)) {
    return 'N/A'
  }

  return price === 0 ? 'Free' : price
}

const FacultyCourseCard = ({ course, detailUrl, dataTour }) => {
  const description = course.shortDescription || course.description || 'Course details are not available.'
  const courseTags = [course.category, course.level, course.language].filter(Boolean)

  return (
    <Link
      to={detailUrl}
      data-tour={dataTour}
      className="flex h-full flex-col rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm transition hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40"
    >
      <div className="aspect-video overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={`${course.title} thumbnail`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 text-4xl font-bold text-indigo-200">
            J
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="line-clamp-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            {course.title}
          </h2>
          {/* Published is not worth a badge here: a faculty is only ever shown courses
              that are live, so it could say one thing. Who a course is open to is what
              varies, and it is what a faculty needs before pointing a student at it. */}
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
            course.isOpenToAll
              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
          >
            {course.isOpenToAll ? 'Open to All' : 'Restricted'}
          </span>
        </div>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Price
            </p>
            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
              {getPriceLabel(course.price)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Duration
            </p>
            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
              {getDurationLabel(course)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Chapters
            </p>
            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
              {getCount(course.chapterCount)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Videos
            </p>
            <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">
              {getCount(course.videoCount)}
            </p>
          </div>
        </div>

        {courseTags.length ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            {courseTags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  )
}

export default FacultyCourseCard
