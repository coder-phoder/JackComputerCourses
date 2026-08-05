import { USER_STATUS_META, getUserStatus } from './userStatus'

// The word is always on the badge, so the standing never rests on its colour alone.
const UserStatusBadge = ({ user, className = '' }) => {
  const meta = USER_STATUS_META[getUserStatus(user)]

  return (
    <span
      title={meta.hint}
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-bold ${meta.className} ${className}`}
    >
      {meta.label}
    </span>
  )
}

export default UserStatusBadge
