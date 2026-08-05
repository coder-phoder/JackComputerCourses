// Every course card used to lay its stats out as a row of equal-width tiles, which is what
// made them look broken: the grid gave "351" and "31 hours 29 minutes" the same slot, so the
// long one wrapped four lines deep or truncated to "31h 2…" while the short one sat in a
// mostly empty box, and the tile captions clipped to "CHAPTER". Sizing each stat to its own
// content instead lets the row wrap where it actually needs to, which keeps a card's height
// driven by its title and description rather than by whichever number happened to be widest.
// The stats themselves are built by the helpers in utils/courseMeta.
const CourseMetaList = ({ items, className = '' }) => (
  <dl className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm ${className}`}>
    {items.map(({ key, icon: Icon, label, value }) => (
      <div key={key} className="inline-flex min-w-0 items-center gap-1.5">
        <Icon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        {/* Each value is worded to stand on its own ("23 chapters", not "23"), so the icon
            is enough of a label on screen and the caption only has to survive for a reader
            that cannot see it. */}
        <dt className="sr-only">{label}</dt>
        {/* Deliberately lighter than the closing line under it: these say what a course
            holds, and the card should lead with what it costs or when it expires. */}
        <dd className="truncate font-medium text-slate-600 dark:text-slate-400">{value}</dd>
      </div>
    ))}
  </dl>
)

export default CourseMetaList
