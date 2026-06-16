const getCount = (value) => {
  const count = Number(value)

  return Number.isFinite(count) && count > 0 ? count : 0
}

const formatAccessDate = (value) => {
  const dateValue = String(value || '').slice(0, 10)
  const [year, month, day] = dateValue.split('-').map(Number)

  if (!year || !month || !day) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

const getAccessDisplay = (course) => {
  if (course.isOpenToAll) {
    return {
      label: 'Access',
      value: 'Open to all',
    }
  }

  return {
    label: 'Access Ends',
    value: formatAccessDate(course.accessEndsOn || course.accessEndsAt) || 'N/A',
  }
}

const UserCourseCard = ({ course, playerUrl }) => {
  const description = course.shortDescription || course.description || 'Course details are not available.'
  const courseTags = [course.category, course.level, course.language].filter(Boolean)
  const accessDisplay = getAccessDisplay(course)

  return (
    <a
      href={playerUrl}
      target="_blank"
      rel="noreferrer"
      className="flex h-full flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-200 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100"
    >
      <div className="aspect-video overflow-hidden rounded-lg bg-slate-100">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={`${course.title} thumbnail`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-blue-50 text-4xl font-bold text-blue-200">
            J
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        <h2 className="line-clamp-2 text-lg font-bold text-slate-900">
          {course.title}
        </h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
          {description}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {accessDisplay.label}
            </p>
            <p className="mt-1 font-semibold text-slate-800">
              {accessDisplay.value}
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
    </a>
  )
}

export default UserCourseCard
