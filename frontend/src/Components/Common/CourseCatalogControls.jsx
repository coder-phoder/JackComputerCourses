import { Search, SlidersHorizontal, X } from 'lucide-react'
import { defaultCourseCatalogFilters } from './courseCatalogFilters'

const selectClass = 'mt-1.5 h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 dark:focus:ring-indigo-900/40'
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400'
const filterValueLabels = {
  newest: 'Newest',
  price: 'Price',
  duration: 'Duration',
  videos: 'Most videos',
}

const getFilterDisplayValue = (value) => filterValueLabels[value] || value

const CourseCatalogControls = ({
  accent = 'indigo',
  courses,
  filters,
  onFiltersChange,
  resultCount,
}) => {
  const activeFilterChips = [
    filters.search ? { label: 'Search', name: 'search', value: filters.search, resetValue: '' } : null,
    filters.sort !== 'newest' ? { label: 'Sort', name: 'sort', value: getFilterDisplayValue(filters.sort), resetValue: 'newest' } : null,
  ].filter(Boolean)
  const activeFilterCount = [
    filters.search,
    filters.sort !== 'newest',
  ].filter(Boolean).length
  const accentTextClass = accent === 'blue' ? 'text-blue-600 dark:text-blue-300' : 'text-indigo-600 dark:text-indigo-300'
  const accentRingClass = accent === 'blue' ? 'focus-within:border-blue-500 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/40' : 'focus-within:border-indigo-500 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-900/40'
  const accentButtonClass = accent === 'blue'
    ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-100 dark:focus:ring-blue-900/40'
    : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-100 dark:focus:ring-indigo-900/40'

  const updateFilter = (name, value) => {
    onFiltersChange((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }))
  }

  const resetFilters = () => {
    onFiltersChange({ ...defaultCourseCatalogFilters })
  }

  const removeFilter = (chip) => {
    updateFilter(chip.name, chip.resetValue || '')
  }

  return (
    <section className="mb-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm sm:p-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.2fr)_220px] lg:items-end">
        <div>
          <label htmlFor="course-search" className={labelClass}>Search</label>
          <div className={`mt-1.5 flex h-12 items-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 ring-0 transition focus-within:ring-4 ${accentRingClass}`}>
            <Search className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <input
              id="course-search"
              type="search"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100 sm:text-sm"
              placeholder="Search by title"
            />
            {filters.search ? (
              <button
                type="button"
                onClick={() => updateFilter('search', '')}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <label htmlFor="course-sort" className={labelClass}>Sort</label>
          <select
            id="course-sort"
            value={filters.sort}
            onChange={(event) => updateFilter('sort', event.target.value)}
            className={selectClass}
          >
            <option value="newest">Newest</option>
            <option value="price">Price: low to high</option>
            <option value="duration">Duration: shortest</option>
            <option value="videos">Most videos</option>
          </select>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <span className="min-w-0 truncate">
            Showing <span className={accentTextClass}>{resultCount}</span> of {courses.length} courses
          </span>
          {activeFilterCount ? (
            <span className="shrink-0 rounded-full bg-white dark:bg-slate-900 px-2 py-0.5 text-xs text-slate-500 dark:text-slate-400">
              {activeFilterCount} active
            </span>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
          {activeFilterChips.length ? (
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-1 sm:pb-0">
              {activeFilterChips.map((chip) => (
                <span
                  key={`${chip.name}-${chip.value}`}
                  className="inline-flex max-w-64 shrink-0 items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  <span className="text-slate-400 dark:text-slate-500">{chip.label}</span>
                  <span className="truncate">{chip.value}</span>
                  <button
                    type="button"
                    onClick={() => removeFilter(chip)}
                    className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={`Remove ${chip.label.toLowerCase()} filter`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </div>
          ) : null}

          {activeFilterCount ? (
            <button
              type="button"
              onClick={resetFilters}
              className={`inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition focus:outline-none focus:ring-4 sm:w-auto ${accentButtonClass}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}

export default CourseCatalogControls
