import { getAttendanceRate, getMonthKeyLabel, getShortMonthLabel } from '../../utils/attendance'

const GRID_LINES = [100, 50, 0]

// The window as a whole, read off the same six months the columns are drawn from:
// the rate is weighted by marked days, so a month with three records cannot swing
// half a year, and the best month ignores the months nobody marked.
const summarizeTrend = (trend) => {
  const present = trend.reduce((total, month) => total + month.present, 0)
  const absent = trend.reduce((total, month) => total + month.absent, 0)
  const best = trend
    .filter((month) => month.present + month.absent)
    .reduce((leader, month) => (
      !leader
      || getAttendanceRate(month.present, month.absent) > getAttendanceRate(leader.present, leader.absent)
        ? month
        : leader
    ), null)

  return {
    present,
    rate: getAttendanceRate(present, absent),
    marked: present + absent,
    best,
  }
}

// Six months of one number — the share of marked days the student was present for.
// One measure means one hue: the month on screen is drawn in the accent and the
// months around it recede, so the chart never has to be decoded by colour. Every
// value is also printed under its column, so nothing is locked behind a hover.
const UserAttendanceTrend = ({ trend, monthKey, onSelectMonth }) => {
  const sixMonths = summarizeTrend(trend)

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Last six months</h2>
          <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Share of your marked days that were present
          </p>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
          Tap a month to open it
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="flex gap-3">
          <div className="flex h-40 w-8 shrink-0 flex-col justify-between pb-px text-right text-[10px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
            {GRID_LINES.map((line) => (
              <span key={line}>{line}%</span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative h-40">
              {GRID_LINES.map((line) => (
                <span
                  key={line}
                  style={{ bottom: `${line}%` }}
                  className="absolute inset-x-0 h-px bg-slate-200 dark:bg-slate-800"
                />
              ))}

              <div className="absolute inset-0 flex items-end justify-between gap-2">
                {trend.map((month) => {
                  const marked = month.present + month.absent
                  const rate = getAttendanceRate(month.present, month.absent)
                  const isCurrent = month.month === monthKey

                  return (
                    <button
                      key={month.month}
                      type="button"
                      onClick={() => onSelectMonth(month.month)}
                      aria-label={`${getMonthKeyLabel(month.month)}: ${marked ? `${rate}% present` : 'no days marked'}`}
                      aria-current={isCurrent ? 'true' : undefined}
                      title={marked
                        ? `${getMonthKeyLabel(month.month)} — ${rate}% present (${month.present} of ${marked} marked days)`
                        : `${getMonthKeyLabel(month.month)} — no days marked`}
                      className="group flex h-full flex-1 flex-col justify-end rounded-t-lg px-1 transition hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <span
                        style={{ height: `${rate}%` }}
                        className={`attendance-bar mx-auto w-6 max-w-full rounded-t-sm transition-colors ${
                          isCurrent
                            ? 'bg-blue-600 dark:bg-blue-500'
                            : 'bg-blue-600/35 group-hover:bg-blue-600/60 dark:bg-blue-500/35 dark:group-hover:bg-blue-500/60'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            {/* The values live on the axis rather than on the marks, so six months
                read as a row of facts instead of six floating labels. */}
            <div className="mt-2 flex justify-between gap-2">
              {trend.map((month) => {
                const marked = month.present + month.absent
                const isCurrent = month.month === monthKey

                return (
                  <div key={month.month} className="flex-1 text-center">
                    <p className={`text-[11px] font-bold uppercase tracking-wide ${
                      isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                    >
                      {getShortMonthLabel(month.month)}
                    </p>
                    <p className={`text-xs font-bold tabular-nums ${
                      isCurrent ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
                    }`}
                    >
                      {marked ? `${getAttendanceRate(month.present, month.absent)}%` : '—'}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* The same six months read as sentences, for the reader who would rather
            not decode a chart at all. */}
        <dl className="grid content-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:grid-cols-3 lg:grid-cols-1">
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Six month rate
            </dt>
            <dd className="mt-1 text-2xl font-bold leading-none text-slate-900 dark:text-slate-100">
              {sixMonths.marked ? `${sixMonths.rate}%` : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Best month
            </dt>
            <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              {sixMonths.best
                ? `${getMonthKeyLabel(sixMonths.best.month)} · ${getAttendanceRate(sixMonths.best.present, sixMonths.best.absent)}%`
                : 'Nothing marked yet'}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Days present
            </dt>
            <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
              {sixMonths.present} of {sixMonths.marked} marked
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}

export default UserAttendanceTrend
