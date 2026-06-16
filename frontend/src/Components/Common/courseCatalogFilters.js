export const defaultCourseCatalogFilters = {
  search: '',
  sort: 'newest',
}

export const normalizeText = (value) => String(value || '').trim().toLowerCase()

const getNumber = (value) => {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

const getCourseDate = (course) => (
  new Date(course?.createdAt || 0).getTime() || 0
)

const getDurationSortValue = (course) => {
  const duration = getNumber(course?.durationDays)
    || getNumber(course?.durationMonths)
    || getNumber(course?.duration)

  return duration > 0 ? duration : Number.POSITIVE_INFINITY
}

const sortByTitle = (first, second) => (
  String(first?.title || '').localeCompare(String(second?.title || ''))
)

export const getFilteredSortedCourses = (courses, filters) => {
  const search = normalizeText(filters.search)

  return [...courses]
    .filter((course) => {
      return !search || normalizeText(course?.title).includes(search)
    })
    .sort((first, second) => {
      if (filters.sort === 'price') {
        return getNumber(first?.price) - getNumber(second?.price) || sortByTitle(first, second)
      }

      if (filters.sort === 'duration') {
        return getDurationSortValue(first) - getDurationSortValue(second) || sortByTitle(first, second)
      }

      if (filters.sort === 'videos') {
        return getNumber(second?.videoCount) - getNumber(first?.videoCount) || sortByTitle(first, second)
      }

      return getCourseDate(second) - getCourseDate(first) || sortByTitle(first, second)
    })
}
