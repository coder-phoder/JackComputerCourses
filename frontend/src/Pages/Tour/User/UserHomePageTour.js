import { BookOpen, Bug, CalendarCheck, Compass, Route, Terminal, UserRound } from 'lucide-react'

// The first walkthrough an account ever sees: what the site is and where the rest of
// it lives. Every other page then explains itself through its own tour.
const userHomePageTour = [
  {
    id: 'welcome',
    icon: Compass,
    eyebrow: 'Welcome',
    title: 'How this works',
    points: [
      'Watch a course',
      'Practise the code',
      'Faculty tracks the rest',
    ],
  },
  {
    id: 'home',
    target: '[data-tour="home"]',
    icon: UserRound,
    eyebrow: 'Stop 1',
    title: 'Home',
    points: [
      'Your account and phone number',
      'This bar is on every page',
      'Logout ends the session',
    ],
  },
  {
    id: 'courses',
    target: '[data-tour="courses"]',
    icon: BookOpen,
    eyebrow: 'Stop 2',
    title: 'Courses',
    points: [
      'Courses opened to you',
      'Chapters left, video middle',
      'Resumes your last lesson',
    ],
  },
  {
    id: 'ide',
    target: '[data-tour="ide"]',
    icon: Terminal,
    eyebrow: 'Stop 3',
    title: 'IDE',
    points: [
      'Your files, kept on the server',
      'Runs C, C++, Java, Python, JS',
      'Queries: ask a faculty',
    ],
  },
  {
    id: 'attendance',
    target: '[data-tour="attendance"]',
    icon: CalendarCheck,
    eyebrow: 'Stop 4',
    title: 'Attendance',
    points: [
      'What faculty marked, month by month',
      'Pick a day to see it',
      'Only faculty can change it',
    ],
  },
  {
    id: 'bugs',
    target: '[data-tour="bugs"]',
    icon: Bug,
    eyebrow: 'Stop 5',
    title: 'Report a Bug',
    points: [
      'Site broken? tell an admin',
      'Add screenshots',
      'Track Open to Resolved',
    ],
  },
  {
    id: 'profile',
    target: '[data-tour="profile"]',
    icon: UserRound,
    eyebrow: 'Stop 6',
    title: 'Profile',
    points: [
      'Email and address, if you want to give them',
      'All of it is optional',
      'Change it whenever you like',
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
      'Nothing here is lost by clicking',
    ],
  },
]

export default userHomePageTour
