const STATUS_STYLES = {
  synced: {
    label: 'Synced',
    className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  },
  failed: {
    label: 'Sync Failed',
    className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  },
  pending: {
    label: 'Pending',
    className: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  },
}

const SyncStatusBadge = ({ status }) => {
  const { label, className } = STATUS_STYLES[status] || STATUS_STYLES.pending

  return (
    <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  )
}

export default SyncStatusBadge
