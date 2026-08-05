// An account is active while at least one course it was actually granted is still
// inside its access window. An open-to-all course is the public catalogue rather
// than an enrolment, so it never makes an account active, and neither does a course
// whose deadline has passed. The backend works this out from the grants, so every
// staff screen reads the same flag off the account instead of dating courses itself.
export const USER_STATUSES = ['active', 'inactive']

export const USER_STATUS_FILTERS = ['all', ...USER_STATUSES]

export const USER_STATUS_META = {
  all: { label: 'All' },
  active: {
    label: 'Active',
    hint: 'Enrolled in a course whose deadline is still ahead',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  inactive: {
    label: 'Inactive',
    hint: 'No course enrolment, or every enrolment has ended',
    className: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300',
  },
}

export const getUserStatus = (user) => (user?.isActive ? 'active' : 'inactive')

export const filterUsersByStatus = (users, status) => (
  status === 'all' ? users : users.filter((user) => getUserStatus(user) === status)
)

// One pass for all three tabs, so a tab never promises a count its list does not show.
export const countUsersByStatus = (users) => {
  const active = users.reduce((total, user) => total + (user?.isActive ? 1 : 0), 0)

  return { all: users.length, active, inactive: users.length - active }
}

// Active first, and a group only exists once somebody is in it, so the two standings
// read apart without leaving an empty heading behind.
export const groupUsersByStatus = (users) => USER_STATUSES
  .map((status) => ({ status, users: filterUsersByStatus(users, status) }))
  .filter((group) => group.users.length)
