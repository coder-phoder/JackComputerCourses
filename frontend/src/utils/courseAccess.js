// How long a course stays open is read the same way wherever a course is shown: the
// catalogue card and the home list both ask this, so one of them can never start
// naming a different date than the other.
export const formatAccessDate = (value) => {
  const dateValue = String(value || '').slice(0, 10)
  const [year, month, day] = dateValue.split('-').map(Number)

  if (!year || !month || !day) {
    return ''
  }

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export const getCourseAccessDisplay = (course) => {
  if (course.isOpenToAll) {
    return {
      label: 'Access',
      value: 'Open to all',
    }
  }

  return {
    label: 'Access Ends',
    value: formatAccessDate(course.accessEndsOn || course.accessEndsAt) || 'N/A',
  }
}

// A deadline is only worth raising once it is close enough to act on, so a window is
// graded by the days left on it rather than being read as a bare date everywhere. A month
// out is a heads-up, two weeks is enough notice to arrange a renewal, and the last three
// days are the ones worth interrupting someone over — each step louder than the last so
// the same course escalates rather than shouting at one volume for a month. Every surface
// asks this, so the card, the home list and the player can never disagree about how
// urgent the same course is.
const EXPIRY_NOTICE_DAYS = 30
const EXPIRY_WARNING_DAYS = 14
const EXPIRY_CRITICAL_DAYS = 3

const EXPIRY_LEVEL_STYLES = {
  expired: {
    chipClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    noticeClassName: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200',
  },
  critical: {
    chipClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    noticeClassName: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200',
  },
  warning: {
    chipClassName: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    noticeClassName: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200',
  },
  notice: {
    chipClassName: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    noticeClassName: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200',
  },
}

const getExpiryLevel = (daysRemaining) => {
  if (daysRemaining <= EXPIRY_CRITICAL_DAYS) {
    return 'critical'
  }

  return daysRemaining <= EXPIRY_WARNING_DAYS ? 'warning' : 'notice'
}

// The count includes the day being read, so one day left is the day you are on. The chip
// has a row to fit into and the notice is read as a sentence, so each gets its own wording
// off the same number rather than one being bent into the other's shape.
const getRemainingLabel = (daysRemaining) => {
  if (daysRemaining <= 1) {
    return 'Ends today'
  }

  if (daysRemaining === 2) {
    return 'Ends tomorrow'
  }

  return `${daysRemaining} days left`
}

const getRemainingTitle = (daysRemaining) => {
  if (daysRemaining <= 1) {
    return 'Your access ends today'
  }

  if (daysRemaining === 2) {
    return 'Your access ends tomorrow'
  }

  return `Your access ends in ${daysRemaining} days`
}

export const getCourseExpiryWarning = (course) => {
  if (!course || course.isOpenToAll) {
    return null
  }

  const endDate = formatAccessDate(course.accessEndsOn || course.accessEndsAt)

  if (course.isAccessExpired) {
    return {
      level: 'expired',
      daysRemaining: 0,
      chipLabel: 'Access ended',
      title: 'Your access to this course has ended',
      detail: endDate ? `Access ended on ${endDate}.` : '',
      ...EXPIRY_LEVEL_STYLES.expired,
    }
  }

  const daysRemaining = Number(course.accessDaysRemaining)

  if (!Number.isFinite(daysRemaining) || daysRemaining > EXPIRY_NOTICE_DAYS) {
    return null
  }

  const level = getExpiryLevel(daysRemaining)

  return {
    level,
    daysRemaining,
    chipLabel: getRemainingLabel(daysRemaining),
    title: getRemainingTitle(daysRemaining),
    detail: endDate ? `Access ends on ${endDate}.` : '',
    ...EXPIRY_LEVEL_STYLES[level],
  }
}
