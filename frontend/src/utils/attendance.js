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

// 2 August 2026, Sunday
export const getDayLabel = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return `${day} ${MONTHS[date.getMonth()]} ${year}, ${
    ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()]
  }`
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
export const ATTENDANCE_STATUSES = [
  {
    value: 'present',
    label: 'Present',
    short: 'P',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    active: 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700',
    cell: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
  },
  {
    value: 'absent',
    label: 'Absent',
    short: 'A',
    dot: 'bg-rose-500',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    active: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
    cell: 'border-rose-300 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/40',
  },
]

export const STATUS_META = Object.fromEntries(
  ATTENDANCE_STATUSES.map((status) => [status.value, status]),
)
