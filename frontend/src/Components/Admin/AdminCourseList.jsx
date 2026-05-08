const AdminCourseList = ({
  courses,
  deletingCourseId,
  editingCourseId,
  loadingCourses,
  saving,
  onDeleteCourse,
  onEditCourse,
  onOpenCourse,
}) => (
  <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
      <h2 className="text-lg font-bold text-slate-900">All Courses</h2>
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {courses.length} total
      </span>
    </div>

    {loadingCourses ? (
      <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500">
        Loading courses...
      </div>
    ) : courses.length ? (
      <div className="space-y-4 p-4">
        {courses.map((course) => {
          const isEditing = editingCourseId === course._id
          const isDeleting = deletingCourseId === course._id

          return (
            <article
              key={course._id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenCourse(course)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onOpenCourse(course)
                }
              }}
              className={`rounded-lg border p-4 transition ${
                isEditing
                  ? 'border-indigo-300 bg-indigo-50/40'
                  : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt=""
                      className="h-24 w-32 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-400">
                      J
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 truncate text-lg font-bold text-slate-900">
                        {course.title}
                      </h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        course.isPublished
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                      >
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">{course.slug}</p>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                      {course.shortDescription || course.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                      {course.category ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1">{course.category}</span>
                      ) : null}
                      {course.level ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1">{course.level}</span>
                      ) : null}
                      {course.language ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1">{course.language}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:w-[440px]">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Price
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">{course.price}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Duration
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">{course.duration}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Chapters
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">{course.chapterCount || 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Access
                    </p>
                    <p className="mt-1 font-semibold text-slate-800">{course.accessUserCount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onEditCourse(course)
                  }}
                  disabled={saving || Boolean(deletingCourseId)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  {isEditing ? 'Selected' : 'Edit'}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDeleteCourse(course)
                  }}
                  disabled={saving || isDeleting}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:text-red-300"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    ) : (
      <div className="px-6 py-12 text-center text-sm font-semibold text-slate-500">
        No courses found.
      </div>
    )}
  </section>
)

export default AdminCourseList
