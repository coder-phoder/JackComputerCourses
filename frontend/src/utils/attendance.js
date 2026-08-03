// Day keys are the YYYY-MM-DD strings the backend stores, built from local date
// parts so the calendar never shifts a day across a timezone boundary.
const pad = (value) => String(value).padStart(2, '0')

export const toDateKey = (date) => (
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
)

export const toMonthKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1)

export const addMonths = (date, delta) => new Date(date.getFullYear(), date.getMonth() + delta, 1)

export const isSameMonthKey = (dateKey, monthKey) => dateKey.startsWith(`${monthKey}-`)

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const getMonthLabel = (date) => `${MONTHS[date.getMonth()]} ${date.getFullYear()}`

// August 2026 and Aug, both read off a YYYY-MM string, for the months the charts
// only ever know as a key.
export const getMonthKeyLabel = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number)

  return `${MONTHS[month - 1]} ${year}`
}

export const getShortMonthLabel = (monthKey) => MONTHS[Number(monthKey.split('-')[1]) - 1].slice(0, 3)

// 2 August 2026, Sunday
export const getDayLabel = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return `${day} ${MONTHS[date.getMonth()]} ${year}, ${
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]
  }`
}

// Sun 2 Aug — the compact form the day log lists a month in.
export const getShortDayLabel = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return `${WEEKDAYS[date.getDay()]} ${day} ${MONTHS[month - 1].slice(0, 3)}`
}

// Whole weeks only, so the grid always starts on a Sunday and ends on a Saturday.
// Leading and trailing cells belong to the neighbouring months and stay unclickable.
export const buildMonthGrid = (monthDate) => {
  const firstDay = startOfMonth(monthDate)
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const leading = firstDay.getDay()
  const cellCount = Math.ceil((leading + daysInMonth) / 7) * 7
  const todayKey = toDateKey(new Date())

  return Array.from({ length: cellCount }, (item, index) => {
    const dayNumber = index - leading + 1
    const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth

    if (!inMonth) {
      return { key: `blank-${index}`, inMonth: false }
    }

    const dateKey = toDateKey(new Date(monthDate.getFullYear(), monthDate.getMonth(), dayNumber))

    return {
      key: dateKey,
      dayNumber,
      inMonth: true,
      isToday: dateKey === todayKey,
      isFuture: dateKey > todayKey,
    }
  })
}

// One place for every status colour so the calendar, the chips and the buttons
// never drift apart.
// mark and ink are the two colours the student's charts draw with: emerald-600 and
// rose-500 are the steps that clear the colourblind separation and the 3:1 contrast
// gate on both the white and the slate-950 surface, so the same pair serves light
// and dark mode. Colour still never carries the status alone — every place that
// paints a day also shows its letter or its icon.
export const ATTENDANCE_STATUSES = [
  {
    value: 'present',
    label: 'Present',
    short: 'P',
    dot: 'bg-emerald-500',
    mark: 'bg-emerald-600',
    fill: 'fill-emerald-600',
    ink: 'text-emerald-700 dark:text-emerald-300',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    active: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
    cell: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
  },
  {
    value: 'absent',
    label: 'Absent',
    short: 'A',
    dot: 'bg-rose-500',
    mark: 'bg-rose-500',
    fill: 'fill-rose-500',
    ink: 'text-rose-700 dark:text-rose-300',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    active: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
    cell: 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40',
  },
]

export const STATUS_META = Object.fromEntries(
  ATTENDANCE_STATUSES.map((status) => [status.value, status]),
)

export const getAttendanceRate = (present, absent) => {
  const marked = present + absent

  return marked ? Math.round((present / marked) * 100) : 0
}

// Everything the student's month reads as numbers, counted in one pass over the
// days he was actually marked on: unmarked days are not absences, so they stay out
// of the rate. Streaks run over marked days in date order, so a gap of unmarked
// days does not break a run of present ones.
export const summarizeAttendance = (records) => {
  const days = [...records]
    .filter((record) => STATUS_META[record.status])
    .sort((first, second) => first.date.localeCompare(second.date))

  let present = 0
  let absent = 0
  let currentStreak = 0
  let bestStreak = 0

  days.forEach((day) => {
    if (day.status === 'present') {
      present += 1
      currentStreak += 1
      bestStreak = Math.max(bestStreak, currentStreak)
    } else {
      absent += 1
      currentStreak = 0
    }
  })

  return {
    present,
    absent,
    marked: days.length,
    rate: getAttendanceRate(present, absent),
    // The run still going on the last marked day, which is the one the student
    // can extend by turning up again.
    currentStreak,
    bestStreak,
    firstDate: days[0]?.date || '',
    lastDate: days.at(-1)?.date || '',
  }
}
