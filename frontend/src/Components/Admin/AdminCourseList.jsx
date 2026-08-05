import { LibraryBig, Pencil, Trash2 } from 'lucide-react'
import ActionMenu from '../Common/ActionMenu'
import CourseCardFooter from '../Common/CourseCardFooter'
import CourseMetaList from '../Common/CourseMetaList'
import CourseThumbnail from '../Common/CourseThumbnail'
import {
  accessCountMeta,
  accessLengthMeta,
  chapterMeta,
  priceMeta,
  videoMeta,
} from '../../utils/courseMeta'

const SKELETON_KEYS = ['a', 'b', 'c', 'd', 'e', 'f']

const gridClass = 'grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3'

const badgeClass = 'rounded-full px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur'

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
              <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    ) : courses.length ? (
      <div className={gridClass}>
        {courses.map((course, index) => {
          const isDeleting = deletingCourseId === course._id
          const courseTags = [course.category, course.level, course.language].filter(Boolean)

          return (
            <article
              key={course._id}
              // Only the first card is marked: the walkthrough points at one course,
              // not at every card in the grid.
              data-tour={index ? undefined : 'admin-course-card'}
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
              <CourseThumbnail course={course} fallbackClassName="from-indigo-500 to-indigo-700">
                <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`${badgeClass} ${
                      course.isPublished
                        ? 'bg-emerald-500/95 text-white'
                        : 'bg-amber-400/95 text-amber-950'
                    }`}
                    >
                      {course.isPublished ? 'Published' : 'Draft'}
                    </span>
                    {course.isOpenToAll ? (
                      <span className={`${badgeClass} bg-white/90 text-blue-700 dark:bg-slate-900/90 dark:text-blue-300`}>
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
              </CourseThumbnail>

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

                {/* What a course holds reads quietly; its price and how long an enrolment
                    lasts are the pair an admin scans a list for, so they close the card. A
                    headcount only means something on a course that is not open to all, and
                    the thumbnail badge already says which of those this is. */}
                <div className="mt-auto pt-4">
                  <CourseMetaList
                    items={[
                      chapterMeta(course),
                      videoMeta(course),
                      ...(course.isOpenToAll ? [] : [accessCountMeta(course)]),
                    ]}
                  />
                  <CourseCardFooter primary={priceMeta(course)} secondary={accessLengthMeta(course)} />
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
