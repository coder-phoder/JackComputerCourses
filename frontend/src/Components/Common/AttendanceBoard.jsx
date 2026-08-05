import axios from 'axios'
import { Search, Trash2, UserCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import AttendanceCalendar from './AttendanceCalendar'
import AttendancePrintSheet from './AttendancePrintSheet'
import UserStatusBadge from './UserStatusBadge'
import UserStatusFilter from './UserStatusFilter'
import {
  USER_STATUS_META,
  countUsersByStatus,
  filterUsersByStatus,
  groupUsersByStatus,
} from './userStatus'
import {
  ATTENDANCE_STATUSES,
  STATUS_META,
  addMonths,
  getDayLabel,
  startOfMonth,
  toDateKey,
  toMonthKey,
} from '../../utils/attendance'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const getStudentName = (student) => String(student?.name || '').trim() || 'Unnamed user'

// One board for three places: the admin page, the faculty page and the single
// student view opened from the admin users list. basePath decides which role's
// endpoints are called, canSeeMarkedBy is the admin-only column and canPrint is
// the admin's month register.
const AttendanceBoard = ({
  basePath,
  canSeeMarkedBy = false,
  canPrint = false,
  student = null,
}) => {
  const [monthDate, setMonthDate] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [students, setStudents] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [savingStudentId, setSavingStudentId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')
  const [printing, setPrinting] = useState(false)

  const monthKey = toMonthKey(monthDate)
  const studentId = student?._id || ''
  const isSingleStudent = Boolean(student)

  useEffect(() => {
    if (isSingleStudent) {
      return undefined
    }

    let isActive = true

    const fetchStudents = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}${basePath}/attendance/students`, {
          withCredentials: true,
        })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to fetch students')
        }

        if (isActive) {
          setStudents(response.data?.data?.students || [])
        }
      } catch (fetchError) {
        if (isActive) {
          setError(getErrorMessage(fetchError, 'Unable to fetch students. Please try again.'))
        }
      }
    }

    fetchStudents()

    return () => {
      isActive = false
    }
  }, [basePath, isSingleStudent])

  // One read per visible month, so moving across months never refetches the roster.
  useEffect(() => {
    let isActive = true

    const fetchAttendance = async () => {
      setLoading(true)

      try {
        const response = await axios.get(`${API_BASE_URL}${basePath}/attendance`, {
          params: { month: monthKey, ...(studentId ? { userId: studentId } : {}) },
          withCredentials: true,
        })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to fetch attendance')
        }

        if (isActive) {
          // A day marked before the statuses were narrowed down reads as unmarked
          // instead of breaking the month, and marking it again overwrites it.
          setRecords((response.data?.data?.attendance || []).filter(
            (record) => STATUS_META[record.status],
          ))
          setError('')
        }
      } catch (fetchError) {
        if (isActive) {
          setRecords([])
          setError(getErrorMessage(fetchError, 'Unable to fetch attendance. Please try again.'))
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchAttendance()

    return () => {
      isActive = false
    }
  }, [basePath, monthKey, studentId])

  const summaries = useMemo(() => {
    const monthSummary = {}

    records.forEach((record) => {
      const day = monthSummary[record.date] || (monthSummary[record.date] = {})

      day[record.status] = (day[record.status] || 0) + 1
    })

    return monthSummary
  }, [records])

  // The day panel looks a record up per student, so the selected day is indexed once.
  const dayRecords = useMemo(() => {
    const dayMap = new Map()

    records.forEach((record) => {
      if (record.date === selectedDate) {
        dayMap.set(record.user, record)
      }
    })

    return dayMap
  }, [records, selectedDate])

  const statusCounts = useMemo(() => countUsersByStatus(students), [students])

  const roster = useMemo(() => {
    if (student) {
      return [student]
    }

    const query = search.trim().toLowerCase()
    const matchingStudents = filterUsersByStatus(students, statusFilter)

    return query
      ? matchingStudents.filter((item) => (
        `${getStudentName(item)} ${item.phone}`.toLowerCase().includes(query)
      ))
      : matchingStudents
  }, [search, statusFilter, student, students])

  // Marking runs down the still-enrolled students first and the ended ones after,
  // so the two never sit interleaved even when neither tab is picked.
  const rosterGroups = useMemo(() => (
    isSingleStudent ? [{ status: '', users: roster }] : groupUsersByStatus(roster)
  ), [isSingleStudent, roster])

  // The register is printed in the order the board shows, so a row is found on
  // paper where it was read on screen.
  const printRoster = useMemo(
    () => rosterGroups.flatMap((group) => group.users),
    [rosterGroups],
  )

  // -1 and 1 are the arrows beside the month name; 0 is the Today button, which
  // jumps back to this month and reselects today.
  const handleMonthChange = (delta) => {
    setMonthDate((current) => (delta ? addMonths(current, delta) : startOfMonth(new Date())))

    if (!delta) {
      setSelectedDate(toDateKey(new Date()))
    }
  }

  // A month of day columns per student is a table the board never needs on screen,
  // so the sheet is mounted for the print itself and dropped again. window.print()
  // blocks until the dialog closes, and flushSync puts the sheet in the document
  // before it is called.
  const handlePrint = () => {
    flushSync(() => setPrinting(true))

    try {
      window.print()
    } finally {
      setPrinting(false)
    }
  }

  // Marking a day that is already marked rewrites it, so the same call covers
  // both adding and editing attendance.
  const markAttendance = async (studentId, status) => {
    setSavingStudentId(studentId)
    setError('')

    try {
      const response = await axios.post(`${API_BASE_URL}${basePath}/attendance`, {
        userId: studentId,
        date: selectedDate,
        status,
      }, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to mark attendance')
      }

      const saved = response.data?.data?.attendance

      setRecords((current) => [
        ...current.filter((record) => record._id !== saved._id),
        saved,
      ])
    } catch (markError) {
      setError(getErrorMessage(markError, 'Unable to mark attendance. Please try again.'))
    } finally {
      setSavingStudentId('')
    }
  }

  const clearAttendance = async (record) => {
    setSavingStudentId(record.user)
    setError('')

    try {
      const response = await axios.delete(`${API_BASE_URL}${basePath}/attendance/${record._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to remove attendance')
      }

      setRecords((current) => current.filter((item) => item._id !== record._id))
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, 'Unable to remove attendance. Please try again.'))
    } finally {
      setSavingStudentId('')
    }
  }

  const markedCount = dayRecords.size
  // The month summary already counts every day per status, so the selected day's
  // headline is a lookup rather than a second pass over the records.
  const dayCounts = summaries[selectedDate] || {}
  const monthTotals = useMemo(() => (
    records.reduce((totals, record) => ({
      ...totals,
      [record.status]: (totals[record.status] || 0) + 1,
    }), {})
  ), [records])

  // One row, wherever it is grouped, so a student is marked the same way whichever
  // standing he is listed under.
  const renderStudentRow = (item) => {
    const record = dayRecords.get(item._id)
    const isSaving = savingStudentId === item._id

    return (
      <li
        key={item._id}
        className={`rounded-xl border p-3 transition ${
          record
            ? STATUS_META[record.status].cell
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        {/* Two statuses fit beside the name, so a student stays one row tall. */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
              {getStudentName(item)}
            </p>
            <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              {item.phone}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {ATTENDANCE_STATUSES.map((status) => {
              const isActive = record?.status === status.value

              return (
                <button
                  key={status.value}
                  type="button"
                  onClick={() => markAttendance(item._id, status.value)}
                  disabled={isSaving || isActive}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed ${
                    isActive
                      ? status.active
                      : 'border border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-600 dark:hover:text-indigo-300'
                  }`}
                >
                  {status.label}
                </button>
              )
            })}
            {record ? (
              <button
                type="button"
                onClick={() => clearAttendance(record)}
                disabled={isSaving}
                aria-label={`Remove attendance for ${getStudentName(item)}`}
                className="rounded-lg border border-red-200 bg-red-50 p-1.5 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {canSeeMarkedBy && record?.markedByName ? (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <UserCheck className="h-3.5 w-3.5" />
            Marked by {record.markedByName}
            {record.markedByRole === 'faculty' ? ' (Faculty)' : ''}
          </p>
        ) : null}
      </li>
    )
  }

  return (
    <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[1fr_minmax(0,24rem)]">
      <AttendanceCalendar
        monthDate={monthDate}
        onMonthChange={handleMonthChange}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        summaries={summaries}
        singleStudent={isSingleStudent}
        loading={loading}
        onPrint={canPrint ? handlePrint : null}
      />

      {printing ? (
        <AttendancePrintSheet monthDate={monthDate} students={printRoster} records={records} />
      ) : null}

      <aside data-tour="attendance-roster" className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div data-tour="attendance-day" className="shrink-0 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/60">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            Selected day
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-900 dark:text-slate-100">
            {getDayLabel(selectedDate)}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {isSingleStudent ? (
              <>
                <span>{`${getStudentName(student)} · ${student.phone}`}</span>
                <UserStatusBadge user={student} />
              </>
            ) : (
              [
                ...ATTENDANCE_STATUSES.map((status) => (
                  `${dayCounts[status.value] || 0} ${status.label.toLowerCase()}`
                )),
                `${Math.max(students.length - markedCount, 0)} unmarked`,
              ].join(' · ')
            )}
          </p>
        </div>

        {isSingleStudent ? (
          <div data-tour="attendance-totals" className="flex shrink-0 flex-wrap gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            {ATTENDANCE_STATUSES.map((status) => (
              <span
                key={status.value}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status.chip}`}
              >
                {status.label}
                <span className="rounded-full bg-white/70 px-1.5 dark:bg-slate-900/60">
                  {monthTotals[status.value] || 0}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <div data-tour="attendance-search" className="shrink-0 space-y-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student by name or phone"
                className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-indigo-900/40"
              />
            </div>

            {/* The counts are of the whole roster, so they stay put while a search
                narrows the list below them. */}
            <UserStatusFilter
              value={statusFilter}
              counts={statusCounts}
              onChange={setStatusFilter}
              label="Filter students by enrolment standing"
            />
          </div>
        )}

        {error ? (
          <p className="mx-5 mt-3 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {roster.length ? (
            <div className="space-y-4">
              {rosterGroups.map((group) => (
                <section key={group.status || 'roster'}>
                  {group.status ? (
                    <p className="mb-2 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {USER_STATUS_META[group.status].label}
                      <span className="rounded-full bg-slate-100 px-1.5 text-[10px] dark:bg-slate-800">
                        {group.users.length}
                      </span>
                    </p>
                  ) : null}

                  <ul className="space-y-2">
                    {group.users.map(renderStudentRow)}
                  </ul>
                </section>
              ))}
            </div>
          ) : (
            <p className="px-3 py-10 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
              {loading ? 'Loading students...' : 'No students found.'}
            </p>
          )}
        </div>
      </aside>
    </div>
  )
}

export default AttendanceBoard
