// The last line of a card is where the eye settles, so it carries the one fact that decides
// whether a course is worth opening — its price for a faculty or an admin, when access runs
// out for a student — weighted against the quieter stat it is usually read alongside. That
// split is what the old grid of same-sized tiles could not express: everything shouted at
// the same volume, so nothing led.
const CourseCardFooter = ({ primary, secondary }) => (
  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3">
    <span className="min-w-0 truncate text-sm font-bold text-slate-900 dark:text-slate-100">
      <span className="sr-only">{primary.label} </span>
      {primary.value}
    </span>
    {secondary ? (
      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <secondary.icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{secondary.label} </span>
        {secondary.value}
      </span>
    ) : null}
  </div>
)

export default CourseCardFooter
