import { AlertTriangle, CalendarClock } from 'lucide-react'

// One shape for "your time on this is running out", wherever it is said. The player says it
// about the course being watched and the catalogue says it about the courses in the list, so
// the only thing that changes between them is the line of text — not the colour, the icon or
// how loud an expiry of a given urgency looks.
// Only the two loudest levels get the alarm icon; a month's notice is a calendar fact
// rather than something to be alarmed by.
const ALARMING_LEVELS = ['expired', 'critical']

const CourseExpiryNotice = ({ warning, title, detail, className = '' }) => {
  if (!warning) {
    return null
  }

  const Icon = ALARMING_LEVELS.includes(warning.level) ? AlertTriangle : CalendarClock
  const noticeDetail = detail || warning.detail

  return (
    <div
      role="status"
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${warning.noticeClassName} ${className}`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-bold">{title || warning.title}</p>
        {noticeDetail ? (
          <p className="mt-0.5 text-sm font-medium opacity-90">{noticeDetail}</p>
        ) : null}
      </div>
    </div>
  )
}

export default CourseExpiryNotice
