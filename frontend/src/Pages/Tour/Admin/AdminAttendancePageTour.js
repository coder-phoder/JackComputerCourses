import { CalendarDays, ListChecks, Printer, Search, UserCheck } from 'lucide-react'

// The board is the one faculty use, so the first stops read the same. The last two
// are the admin's own: every mark names the faculty who made it, and the month prints.
const adminAttendancePageTour = [
  {
    id: 'calendar',
    target: '[data-tour="attendance-board-calendar"]',
    icon: CalendarDays,
    eyebrow: 'Stop 1',
    title: 'Pick the day',
    points: [
      'Any day of any month',
      'Arrows change the month',
      'The panel beside follows this day',
    ],
  },
  {
    id: 'day',
    target: '[data-tour="attendance-day"]',
    icon: ListChecks,
    eyebrow: 'Stop 2',
    title: 'The day so far',
    points: [
      'Present, absent and still unmarked',
      'Counted for the day you picked',
      'Updates as you mark',
    ],
  },
  {
    id: 'search',
    target: '[data-tour="attendance-search"]',
    icon: Search,
    eyebrow: 'Stop 3',
    title: 'Find a student',
    points: [
      'Search by name or phone',
      'The list below is every student',
      'Clear it to see them all again',
    ],
  },
  {
    id: 'mark',
    target: '[data-tour="attendance-roster"]',
    icon: UserCheck,
    eyebrow: 'Stop 4',
    title: 'Mark them',
    points: [
      'Present or Absent, one click',
      'Each mark names the faculty who made it',
      'The bin removes the mark entirely',
    ],
  },
  {
    id: 'print',
    target: '[data-tour="attendance-print"]',
    icon: Printer,
    eyebrow: 'Stop 5',
    title: 'Print the month',
    points: [
      'Takes exactly the month on screen',
      'Every student, every day of it',
      'Sends it to a printer or a PDF',
    ],
  },
]

export default adminAttendancePageTour
