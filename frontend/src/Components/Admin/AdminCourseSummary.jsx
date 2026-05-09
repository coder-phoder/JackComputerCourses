const AdminCourseSummary = ({ course }) => (
  <section className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      {course.thumbnailUrl ? (
        <img
          src={course.thumbnailUrl}
          alt=""
          className="h-36 w-full rounded-lg object-cover lg:w-56"
        />
      ) : (
        <div className="flex h-36 w-full items-center justify-center rounded-lg bg-slate-100 text-3xl font-bold text-slate-400 lg:w-56">
          J
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold text-slate-900">{course.title}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            course.isPublished
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-amber-50 text-amber-700'
          }`}
          >
            {course.isPublished ? 'Published' : 'Draft'}
          </span>
          {course.isOpenToAll ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Open to All
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-sm font-medium text-slate-500">{course.slug}</p>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          {course.shortDescription || course.description}
        </p>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Chapters
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">{course.chapterCount || 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Videos
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">{course.videoCount || 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Duration
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">{course.duration}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Access
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {course.isOpenToAll ? 'All' : course.accessUserCount || 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
)

export default AdminCourseSummary
