export const BUG_STATUS_META = {
  open: {
    label: 'Open',
    className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
  },
  resolved: {
    label: 'Resolved',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  declined: {
    label: 'Declined',
    className: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300',
  },
}

// Anything the admin has already decided belongs to history.
export const isHistoryBug = (bug) => bug.status !== 'open'

export const getBugDecisionAt = (bug) => bug.resolvedAt || bug.declinedAt || null

export const getBugDecisionLabel = (bug) => BUG_STATUS_META[bug.status]?.label || ''

export const formatBugDateTime = (value) => (value ? new Date(value).toLocaleString() : '')
