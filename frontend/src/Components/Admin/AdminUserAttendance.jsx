import AttendanceBoard from '../Common/AttendanceBoard'

// The users list opens the same board the attendance page uses, scoped to one
// student, so a month reads and edits exactly the same way in both places.
const AdminUserAttendance = ({ user, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      aria-label="Close attendance"
      className="absolute inset-0 bg-slate-900/50"
      onClick={onClose}
    />

    <div className="relative z-10 flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-xl dark:border-slate-800 dark:bg-slate-950">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Attendance</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {String(user.name || '').trim() || 'Unnamed user'} · {user.phone}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500"
        >
          Close
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4">
        <AttendanceBoard basePath="/admin" canSeeMarkedBy student={user} />
      </div>
    </div>
  </div>
)

export default AdminUserAttendance
