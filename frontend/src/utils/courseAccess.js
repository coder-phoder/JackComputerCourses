// How long a course stays open is read the same way wherever a course is shown: the
// catalogue card and the home list both ask this, so one of them can never start
// naming a different date than the other.
const formatAccessDate = (value) => {
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
