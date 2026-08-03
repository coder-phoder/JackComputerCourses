import { CalendarDays, ClipboardList, Grid3x3, TrendingUp } from 'lucide-react'

const getUserAttendancePageTour = ({ hasTrend }) => [
  {
    id: 'month',
    target: '[data-tour="attendance-month"]',
    icon: CalendarDays,
    eyebrow: 'Stop 1',
    title: 'Pick a month',
    points: [
      'Arrows move a month at a time',
      'Today jumps back to this one',
      'Everything below follows this month',
    ],
  },
  {
    id: 'summary',
    target: '[data-tour="attendance-summary"]',
    icon: Grid3x3,
    eyebrow: 'Stop 2',
    title: 'The month in numbers',
    points: [
      'Present, absent and your rate',
      'Days nobody marked are not counted',
      'Streak is your run of present days',
    ],
  },
  {
    id: 'calendar',
    target: '[data-tour="attendance-calendar"]',
    icon: CalendarDays,
    eyebrow: 'Stop 3',
    title: 'The calendar',
    points: [
      'Green is present, red is absent',
      'Plain days were never marked',
      'Click a day to open it',
    ],
  },
  {
    id: 'log',
    target: '[data-tour="attendance-log"]',
    icon: ClipboardList,
    eyebrow: 'Stop 4',
    title: 'The day you picked',
    points: [
      'What was marked, and when',
      'The list below is every marked day',
      'Wrong? only faculty can fix it',
    ],
  },
  hasTrend ? {
    id: 'trend',
    target: '[data-tour="attendance-trend"]',
    icon: TrendingUp,
    eyebrow: 'Stop 5',
    title: 'Last six months',
    points: [
      'Your rate month by month',
      'Click a bar to open that month',
      'A falling bar is worth a word with faculty',
    ],
  } : null,
].filter(Boolean)

export default getUserAttendancePageTour
