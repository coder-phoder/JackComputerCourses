const getDurationLabel = (course) => (
  course.isOpenToAll || !course.duration ? 'N/A' : `${course.duration} mo`
)

const AdminCourseList = ({
  courses,
  deletingCourseId,
  editingCourseId,
  emptyMessage = 'No courses found.',
  loadingCourses,
  saving,
  onDeleteCourse,
  onEditCourse,
  onOpenCourse,
}) => (
  <section className="flex flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm xl:h-[70vh] xl:min-h-[420px] xl:max-h-[760px]">
    <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">All Courses</h2>
      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
        {courses.length} total
      </span>
    </div>

    {loadingCourses ? (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        Loading courses...
      </div>
    ) : courses.length ? (
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {courses.map((course) => {
          const isEditing = editingCourseId === course._id
          const isDeleting = deletingCourseId === course._id
          const accessCount = course.isOpenToAll ? 'All' : course.accessUserCount || 0

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
                  ? 'border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-sm'
              }`}
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt=""
                      className="aspect-video w-full shrink-0 rounded-lg object-cover sm:h-24 sm:w-32"
                    />
                  ) : (
                    <div className="flex aspect-video w-full shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-400 dark:text-slate-500 sm:h-24 sm:w-32">
                      J
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="min-w-0 truncate text-lg font-bold text-slate-900 dark:text-slate-100">
                        {course.title}
                      </h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        course.isPublished
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                      }`}
                      >
                        {course.isPublished ? 'Published' : 'Draft'}
                      </span>
                      {course.isOpenToAll ? (
                        <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                          Open to All
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{course.slug}</p>
                    <p className="mt-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                      {course.shortDescription || course.description}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {course.category ? (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">{course.category}</span>
                      ) : null}
                      {course.level ? (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">{course.level}</span>
                      ) : null}
                      {course.language ? (
                        <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1">{course.language}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:w-110">
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Price
                    </p>
                    <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{course.price}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Duration
                    </p>
                    <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{getDurationLabel(course)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Videos
                    </p>
                    <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{course.videoCount || 0}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-950 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Access
                    </p>
                    <p className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{accessCount}</p>
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
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-700 dark:hover:text-indigo-300 disabled:cursor-not-allowed disabled:text-slate-400 dark:disabled:text-slate-600"
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
                  className="rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-700 dark:text-red-300 transition hover:border-red-300 dark:hover:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/60 disabled:cursor-not-allowed disabled:text-red-300 dark:disabled:text-red-500"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    ) : (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </div>
    )}
  </section>
)

export default AdminCourseList
