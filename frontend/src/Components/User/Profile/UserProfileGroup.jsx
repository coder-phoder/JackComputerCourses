// A heading, a line saying what the group is for, and one bordered list of rows. The
// rows are divided rather than boxed one by one, so a group reads as a single record
// of what is held rather than as a stack of separate cards. Only the group the rail
// has selected is ever mounted, so the entrance animation belongs to the page.
const UserProfileGroup = ({ tourId, title, description, children }) => (
  <section data-tour={tourId}>
    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
      {title}
    </h2>
    <p className="mt-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
      {description}
    </p>

    <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {children}
    </div>
  </section>
)

export default UserProfileGroup
