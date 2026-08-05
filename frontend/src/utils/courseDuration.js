// A course's total runtime is summed and stored server-side, so every surface only has a
// number of seconds to render. The wording is kept a presentation detail here rather than a
// second stored copy, which is also what lets the admin course page re-label a course the
// moment a chapter is added, deleted or re-synced without waiting on a refetch.
const pluralize = (value, unit) => `${value} ${unit}${value === 1 ? '' : 's'}`

// Spelling out the units keeps a runtime from being read as a clock time: 2:05 of video
// looks like five past two, where "2 hours 5 minutes" cannot. A part worth zero is dropped
// rather than padded, so a short course reads "45 minutes" instead of "0 hours 45 minutes".
export const formatDurationLabel = (totalSeconds) => {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (!hours) return pluralize(minutes, 'minute')
  if (!minutes) return pluralize(hours, 'hour')

  return `${pluralize(hours, 'hour')} ${pluralize(minutes, 'minute')}`
}

// The admin card's stat strip fits five values across and truncates each one, which is too
// tight for whole words. "6h 12m" still cannot be misread as a clock time, so the dense
// surfaces trade the words for the abbreviations rather than trading away the units.
export const formatDurationShort = (totalSeconds) => {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (!hours) return `${minutes}m`
  if (!minutes) return `${hours}h`

  return `${hours}h ${minutes}m`
}

export const getCourseLengthLabel = (course) => formatDurationLabel(course?.totalDurationSeconds)

export const getCourseLengthShortLabel = (course) => formatDurationShort(course?.totalDurationSeconds)

export const sumChapterDurationSeconds = (chapters) => (chapters || []).reduce(
  (total, chapter) => total + (Number(chapter?.durationSeconds) || 0),
  0,
)
