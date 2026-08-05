import {
  ACCOUNT_ROWS,
  PROFILE_FIELDS,
  PROFILE_SECTIONS,
  countFilled,
  formatDisplayValue,
} from '../../utils/profileFields'

// Read from the same list the account's own profile page is built from, so a detail
// the institute starts asking for shows up here without a second edit.
const DetailRow = ({ Icon, label, value }) => (
  <div className="flex items-start gap-4 px-5 py-4">
    <Icon aria-hidden="true" className="mt-0.5 h-4.5 w-4.5 shrink-0 text-slate-400 dark:text-slate-500" />

    <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{label}</span>
      <span className={`min-w-0 wrap-break-word text-sm font-medium ${
        value
          ? 'text-slate-600 dark:text-slate-300'
          : 'italic text-slate-400 dark:text-slate-500'
      }`}
      >
        {value || 'Not set'}
      </span>
    </span>
  </div>
)

const DetailGroup = ({ title, children }) => (
  <section className="px-6 py-5">
    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {title}
    </h3>
    <div className="mt-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {children}
    </div>
  </section>
)

// Everything the institute holds for one account on one sheet: what it was given when
// the account was made, and whatever the account has since volunteered. Nothing is
// editable here — the list behind it is where an account is changed.
const AdminUserProfile = ({ user, onClose }) => {
  const profile = user.profile || {}
  const filledCount = countFilled(profile)
  const userName = String(user.name || '').trim()

  const accountValues = {
    name: userName || 'Unnamed user',
    phone: user.phone,
    memberId: user._id.slice(-8).toUpperCase(),
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close user profile"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">User Profile</h2>
            <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
              {accountValues.name} · {user.phone}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filledCount === PROFILE_FIELDS.length
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
            >
              {filledCount}/{PROFILE_FIELDS.length} optional
            </span>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
            >
              Close
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-200 overflow-y-auto dark:divide-slate-800">
          <DetailGroup title="Account">
            {ACCOUNT_ROWS.map((row) => (
              <DetailRow
                key={row.key}
                Icon={row.Icon}
                label={row.label}
                value={accountValues[row.key]}
              />
            ))}
          </DetailGroup>

          {PROFILE_SECTIONS.map((section) => (
            <DetailGroup key={section.id} title={section.title}>
              {section.fields.map((field) => (
                <DetailRow
                  key={field.name}
                  Icon={field.Icon}
                  label={field.label}
                  value={formatDisplayValue(field, profile[field.name] || '')}
                />
              ))}
            </DetailGroup>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminUserProfile
