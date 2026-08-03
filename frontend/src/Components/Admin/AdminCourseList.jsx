import { Clock, LibraryBig, Pencil, PlayCircle, Tag, Trash2, Users } from 'lucide-react'
import ActionMenu from '../Common/ActionMenu'

const SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e', 'f']

const gridClass = 'grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3'

const getDurationLabel = (course) => (
  course.isOpenToAll || !course.duration ? 'N/A' : `${course.duration} mo`
)

const getPriceLabel = (course) => {
  const price = Number(course.price)

  if (!Number.isFinite(price)) {
    return 'N/A'
  }

  return price === 0 ? 'Free' : price
}

// Four numbers is what an admin scans a course by, so they read as one strip of
// hairline-separated cells rather than four boxes competing with the card.
const getCourseStats = (course) => [
  { key: 'price', icon: Tag, label: 'Price', value: getPriceLabel(course) },
  { key: 'duration', icon: Clock, label: 'Duration', value: getDurationLabel(course) },
  { key: 'videos', icon: PlayCircle, label: 'Videos', value: course.videoCount || 0 },
  { key: 'access', icon: Users, label: 'Access', value: course.isOpenToAll ? 'All' : course.accessUserCount || 0 },
]

const AdminCourseList = ({
  courses,
  deletingCourseId,
  emptyMessage = 'No courses found.',
  loadingCourses,
  onDeleteCourse,
  onEditCourse,
  onOpenCourse,
}) => (
  <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-5">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">All Courses</h2>
      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
        {courses.length} total
      </span>
    </div>

    {loadingCourses ? (
      <div className={gridClass} aria-busy="true" aria-label="Loading courses">
        {SKELETON_KEYS.map((key) => (
          <div
            key={key}
            className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="aspect-video bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-3 p-5">
              <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-1/3 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    ) : courses.length ? (
      <div className={gridClass}>
        {courses.map((course) => {
          const isDeleting = deletingCourseId === course._id
          const courseTags = [course.category, course.level, course.language].filter(Boolean)

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
              className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100 dark:focus-visible:ring-indigo-900/40 ${
                isDeleting ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              <div className="relative aspect-video overflow-hidden bg-slate-100 dark:bg-slate-800">
                {course.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-indigo-500 to-indigo-700 text-5xl font-bold text-white/90">
                    J
                  </div>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-slate-900/60 to-transparent" />

                <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur ${
                      course.isPublished
                        ? 'bg-emerald-500/95 text-white'
                        : 'bg-amber-400/95 text-amber-950'
                    }`}
                    >
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                    {course.isOpenToAll ? (
                      <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-bold text-blue-700 shadow-sm backdrop-blur dark:bg-slate-900/90 dark:text-blue-300">
                        Open to All
                      </span>
                    ) : null}
                  </div>

                  <ActionMenu
                    label={`Settings for ${course.title}`}
                    size="sm"
                    busy={isDeleting}
                    disabled={Boolean(deletingCourseId)}
                    actions={[
                      {
                        key: 'edit',
                        label: 'Edit course',
                        icon: Pencil,
                        onClick: () => onEditCourse(course),
                      },
                      {
                        key: 'delete',
                        label: 'Delete course',
                        icon: Trash2,
                        danger: true,
                        onClick: () => onDeleteCourse(course),
                      },
                    ]}
                  />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <h3 className="line-clamp-2 text-base font-bold text-slate-900 dark:text-slate-100 transition group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                  {course.title}
                </h3>
                <p className="mt-1 truncate font-mono text-xs text-slate-400 dark:text-slate-500">
                  {course.slug}
                </p>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {course.shortDescription || course.description}
                </p>

                {courseTags.length ? (
                  <div className="mt-4 flex flex-wrap gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {courseTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="mt-auto pt-5">
                  <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800">
                    {getCourseStats(course).map((stat) => (
                      <div key={stat.key} className="bg-slate-50 dark:bg-slate-950 px-2 py-3 text-center">
                        <stat.icon className="mx-auto h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                        <p className="mt-1.5 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                          {stat.value}
                        </p>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <LibraryBig className="h-10 w-10 text-slate-300 dark:text-slate-700" aria-hidden="true" />
        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{emptyMessage}</p>
      </div>
    )}
  </section>
)

export default AdminCourseList
