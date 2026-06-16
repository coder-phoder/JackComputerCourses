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

const FacultyCourseCard = ({ course, detailUrl }) => {
  const description = course.shortDescription || course.description || 'Course details are not available.'
  const courseTags = [course.category, course.level, course.language].filter(Boolean)

  return (
    <Link
      to={detailUrl}
      className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-100"
    >
      <div className="aspect-video overflow-hidden rounded-lg bg-slate-100">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={`${course.title} thumbnail`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-indigo-50 text-4xl font-bold text-indigo-200">
            J
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="line-clamp-2 text-lg font-bold text-slate-900">
            {course.title}
          </h2>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
            course.isPublished
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
          >
            {course.isPublished ? 'Published' : 'Draft'}
          </span>
          {course.isOpenToAll ? (
            <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
              Open to All
            </span>
          ) : null}
        </div>

        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
          {description}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Price
            </p>
            <p className="mt-1 font-semibold text-slate-800">
              {getPriceLabel(course.price)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Duration
            </p>
            <p className="mt-1 font-semibold text-slate-800">
              {getDurationLabel(course)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Chapters
            </p>
            <p className="mt-1 font-semibold text-slate-800">
              {getCount(course.chapterCount)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Videos
            </p>
            <p className="mt-1 font-semibold text-slate-800">
              {getCount(course.videoCount)}
            </p>
          </div>
        </div>

        {courseTags.length ? (
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            {courseTags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="rounded-full bg-slate-100 px-2 py-1">
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
