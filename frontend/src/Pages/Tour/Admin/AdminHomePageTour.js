import {
  CalendarRange,
  Compass,
  Inbox,
  LayoutDashboard,
  Library,
  Route,
  Search,
  Waypoints,
} from 'lucide-react'

// The first walkthrough the console ever shows: what an admin decides here and where
// the rest of the site lives. Every other page then explains itself through its own tour.
const adminHomePageTour = [
  {
    id: 'welcome',
    icon: Compass,
    eyebrow: 'Welcome',
    title: 'How this works',
    points: [
      'You open the accounts and the courses',
      'Faculty teach and mark from what you open',
      'Nothing here is a student view',
    ],
  },
  {
    id: 'console',
    target: '[data-tour="admin-console"]',
    icon: LayoutDashboard,
    eyebrow: 'Stop 1',
    title: 'The console',
    points: [
      'Who is signed in and the site clock',
      'One admin session at a time',
      'A second login ends the first',
    ],
  },
  {
    id: 'commands',
    target: '[data-tour="admin-commands"]',
    icon: Search,
    eyebrow: 'Stop 2',
    title: 'Jump to anything',
    points: [
      'Every page and every course by name',
      'Opens on the keyboard shortcut too',
      'Faster than the bar above',
    ],
  },
  {
    id: 'sections',
    target: '[data-tour="admin-sections"]',
    icon: Waypoints,
    eyebrow: 'Stop 3',
    title: 'Every part of the site',
    points: [
      'Accounts, register, courses, notes, bugs',
      'This bar is on every admin page',
      'A number means somebody is waiting',
    ],
  },
  {
    id: 'triage',
    target: '#admin-triage',
    icon: Inbox,
    eyebrow: 'Stop 4',
    title: 'Waiting on you',
    points: [
      'Password requests and bug reports',
      'Longest wait first',
      'Only you can decide these',
    ],
  },
  {
    id: 'register',
    target: '[data-tour="admin-register"]',
    icon: CalendarRange,
    eyebrow: 'Stop 5',
    title: 'The register',
    points: [
      'This month, one column a day',
      'Who marked it is named',
      'Attendance is where you change it',
    ],
  },
  {
    id: 'systems',
    target: '[data-tour="admin-systems"]',
    icon: Library,
    eyebrow: 'Stop 6',
    title: 'What the site holds',
    points: [
      'Accounts, courses and their lessons',
      'Drafts are counted apart from live',
      'Each card opens the page that edits it',
    ],
  },
  {
    id: 'tour-button',
    target: '[data-tour="tour-button"]',
    icon: Route,
    eyebrow: 'Stop 7',
    title: 'Every page has this',
    points: [
      'It explains that page, part by part',
      'Start with Courses',
      'Nothing here is saved by clicking',
    ],
  },
]

export default adminHomePageTour
