// How long something has been waiting, in the roughest unit that still reads as a
// wait. Anything older than a week is a date, because "9 days ago" stops meaning
// anything the reader can act on. The faculty query queue and the admin decision
// queue both measure a wait, so both read it off here rather than each rounding
// the same milliseconds their own way.
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const getWaitedLabel = (value) => {
  const sent = new Date(value).getTime()

  if (!sent) {
    return ''
  }

  const elapsed = Date.now() - sent

  if (elapsed < HOUR) {
    return `${Math.max(Math.round(elapsed / MINUTE), 1)}m ago`
  }

  if (elapsed < DAY) {
    return `${Math.round(elapsed / HOUR)}h ago`
  }

  if (elapsed < 7 * DAY) {
    return `${Math.round(elapsed / DAY)}d ago`
  }

  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(sent)
}
