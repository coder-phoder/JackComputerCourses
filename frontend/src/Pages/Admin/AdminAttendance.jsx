import { Navigate } from 'react-router-dom'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import AttendanceBoard from '../../Components/Common/AttendanceBoard'
import { useAuth } from '../../Context/AuthContext'

const AdminAttendance = () => {
  const { auth } = useAuth()

  if (auth.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    // Pinned to the viewport so the calendar and the day panel scroll on their own.
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-50 font-sans dark:bg-slate-950">
      <AdminNavbar />

      <main className="mx-auto flex w-full min-h-0 max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 shrink-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
            Admin Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900 dark:text-slate-100">Attendance</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Pick any day of any month, then mark, change or remove a student&apos;s attendance.
            Every day also shows who marked it, and Print takes the whole visible month
            as a register.
          </p>
        </div>

        <AttendanceBoard basePath="/admin" canSeeMarkedBy canPrint />
      </main>
    </div>
  )
}

export default AdminAttendance
