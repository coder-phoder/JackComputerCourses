import { CalendarDays, ListChecks, Search, UserCheck } from 'lucide-react'

const facultyAttendancePageTour = [
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
    id: 'totals',
    target: '[data-tour="attendance-totals"]',
    icon: ListChecks,
    eyebrow: 'Stop 2',
    title: 'The day so far',
    points: [
      'How many are present and absent',
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
      'Marking again rewrites the day',
      'The bin removes the mark entirely',
    ],
  },
]

export default facultyAttendancePageTour
