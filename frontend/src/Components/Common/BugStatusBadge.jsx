import { BUG_STATUS_META } from './bugStatus'

const BugStatusBadge = ({ status }) => {
  const meta = BUG_STATUS_META[status] || BUG_STATUS_META.open

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

export default BugStatusBadge
