const pad = (value) => String(value).padStart(2, '0')

const toDate = (value) => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// 1 Jan 2026
export const formatHistoryDate = (value) => {
  const date = toDate(value)

  if (!date) {
    return '—'
  }

  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

// HH:MM:SS
export const formatHistoryTime = (value) => {
  const date = toDate(value)

  if (!date) {
    return '—'
  }

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export const getLogoutLabel = (entry) => {
  if (entry?.logoutAt) {
    return entry.logoutReason === 'replaced' ? 'Signed out (new login)' : 'Signed out'
  }

  return 'Still signed in'
}
