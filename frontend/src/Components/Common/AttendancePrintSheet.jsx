import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { STATUS_META, WEEKDAYS, getMonthDays, getMonthLabel } from '../../utils/attendance'

// The visible month as a register: one row per student, one column per day, P or A
// in the cell and nothing at all on a day the student was never marked on. The
// sheet is black on white throughout, greys included, so it comes off a black and
// white printer exactly as it reads on screen.
// It is portalled next to the app rather than inside it, so printing can drop the
// whole screen and lay out this sheet alone (see the print rules in index.css).
// The day columns sit in a real thead, which is what repeats them on every page a
// long roster spills onto.
const AttendancePrintSheet = ({ monthDate, students, records }) => {
  const days = useMemo(() => getMonthDays(monthDate), [monthDate])

  // The month is indexed by student and day once, so every cell is a lookup.
  const marks = useMemo(() => new Map(
    records.map((record) => [`${record.user}|${record.date}`, record.status]),
  ), [records])

  return createPortal(
    <div className="attendance-sheet hidden bg-white px-[9mm] text-black">
      <table className="w-full table-fixed border-collapse text-[8px] leading-none">
        <colgroup>
          <col className="w-[3%]" />
          <col className="w-[20%]" />
          {days.map((day) => <col key={day.dateKey} />)}
        </colgroup>

        <thead>
          {/* The page itself has no margin, or the browser would print its date and
              its address in one. The heading and the empty foot row are the top and
              the bottom margin instead: both sit in a repeating group, so every
              page names itself and none is printed against the edge of the paper. */}
          <tr>
            <td className="px-1 pt-[8mm] pb-2 text-center" colSpan={days.length + 2}>
              <span className="block text-[14px] font-bold uppercase tracking-[0.15em]">
                Jack Computer Infotech
              </span>
              <span className="block pt-1 text-[12px] font-bold">
                {getMonthLabel(monthDate)}
              </span>
            </td>
          </tr>
          <tr className="bg-neutral-200">
            <th className="border border-black px-1 py-1.5 text-center font-bold">#</th>
            <th className="border border-black px-1.5 py-1.5 text-left text-[9px] font-bold">
              Student
            </th>
            {days.map((day) => (
              <th key={day.dateKey} className="border border-black py-1 text-center font-bold">
                <span className="block text-[9px]">{day.dayNumber}</span>
                <span className="block pt-0.5 text-[6px] font-semibold uppercase">
                  {WEEKDAYS[day.weekday].charAt(0)}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tfoot>
          <tr>
            <td className="h-[9mm]" colSpan={days.length + 2} />
          </tr>
        </tfoot>

        <tbody>
          {students.map((student, index) => (
            <tr key={student._id}>
              <td className="border border-black px-1 py-1 text-center font-semibold">
                {index + 1}
              </td>
              <td className="border border-black px-1.5 py-1 leading-tight">
                <span className="block wrap-break-word text-[9px] font-bold">
                  {String(student.name || '').trim() || 'Unnamed user'}
                </span>
                <span className="block pt-0.5 text-[7px] font-semibold">{student.phone}</span>
              </td>

              {days.map((day) => (
                <td
                  key={day.dateKey}
                  // Sundays are shaded rather than coloured, so the week still reads
                  // in one glance on a sheet with no colour in it.
                  className={`border border-black py-1 text-center text-[9px] font-bold ${
                    day.weekday === 0 ? 'bg-neutral-100' : ''
                  }`}
                >
                  {STATUS_META[marks.get(`${student._id}|${day.dateKey}`)]?.short || ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {students.length ? null : (
        <p className="mt-3 text-center text-[10px] font-semibold">
          No students to print for this month.
        </p>
      )}
    </div>,
    document.body,
  )
}

export default AttendancePrintSheet
