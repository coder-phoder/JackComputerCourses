import { getCourseLengthLabel } from '../../utils/courseDuration'

// All three course lists open on the same still: full bleed, a scrim dark enough that a
// badge or the runtime stays readable over a white thumbnail, and the total runtime pinned
// bottom-right the way every video product places it. Putting the runtime here is what lets
// the stats underneath fit on one line — it was the single value long enough to wrap them.
const CourseThumbnail = ({ course, fallbackClassName, children }) => (
  <div className="relative aspect-video shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
    {course.thumbnailUrl ? (
      <img
        src={course.thumbnailUrl}
        alt=""
        loading="lazy"
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      />
    ) : (
      <div className={`flex h-full w-full items-center justify-center bg-linear-to-br text-5xl font-bold text-white/90 ${fallbackClassName}`}>
        J
      </div>
    )}

    {/* Bottom-weighted only. The badges laid over the top are solid-filled and legible on
        their own, so darkening the whole still would just muddy the artwork. */}
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-slate-950/75 to-transparent" />

    {children}

    <span className="pointer-events-none absolute bottom-3 right-3 rounded-lg bg-slate-950/70 px-2 py-1 text-xs font-bold text-white ring-1 ring-white/15 backdrop-blur-sm">
      <span className="sr-only">Total length </span>
      {getCourseLengthLabel(course)}
    </span>
  </div>
)

export default CourseThumbnail
