import {
  BookOpen,
  Bug,
  CalendarCheck,
  Compass,
  FileText,
  MessageSquareCode,
  Route,
  Terminal,
  UserRound,
} from 'lucide-react'

// The first walkthrough a faculty account ever sees: what the site is and where the
// rest of it lives. Every other page then explains itself through its own tour.
const facultyHomePageTour = [
  {
    id: 'welcome',
    icon: Compass,
    eyebrow: 'Welcome',
    title: 'How this works',
    points: [
      'Students watch the courses',
      'They send you code questions',
      'You mark their attendance',
    ],
  },
  {
    id: 'home',
    target: '[data-tour="faculty-home"]',
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
    target: '[data-tour="faculty-courses"]',
    icon: BookOpen,
    eyebrow: 'Stop 2',
    title: 'Courses',
    points: [
      'Every course on the site',
      'Opens the player your students use',
      'Chapters and lessons inside',
    ],
  },
  {
    id: 'ide',
    target: '[data-tour="faculty-ide"]',
    icon: Terminal,
    eyebrow: 'Stop 3',
    title: 'IDE',
    points: [
      'Your own files, kept on the server',
      'Runs C, C++, Java, Python, JS',
      'Share a workspace with a student',
    ],
  },
  {
    id: 'queries',
    target: '[data-tour="faculty-queries"]',
    icon: MessageSquareCode,
    eyebrow: 'Stop 4',
    title: 'Queries',
    points: [
      'Code questions students sent you',
      'Accept one, fix it, close it',
      'The student accepts your changes',
    ],
  },
  {
    id: 'notes',
    target: '[data-tour="faculty-notes"]',
    icon: FileText,
    eyebrow: 'Stop 5',
    title: 'Notes',
    points: [
      'Notes folders the admin published',
      'Open a course for its chapters',
      'Preview or print any file',
    ],
  },
  {
    id: 'attendance',
    target: '[data-tour="faculty-attendance"]',
    icon: CalendarCheck,
    eyebrow: 'Stop 6',
    title: 'Attendance',
    points: [
      'Mark a student present or absent',
      'Any day of any month',
      'Students see it straight away',
    ],
  },
  {
    id: 'bugs',
    target: '[data-tour="faculty-bugs"]',
    icon: Bug,
    eyebrow: 'Stop 7',
    title: 'Report a Bug',
    points: [
      'Site broken? tell an admin',
      'Add screenshots',
      'Track Open to Resolved',
    ],
  },
  {
    id: 'tour-button',
    target: '[data-tour="tour-button"]',
    icon: Route,
    eyebrow: 'Stop 8',
    title: 'Every page has this',
    points: [
      'It explains that page, part by part',
      'Start with Queries',
      'Nothing here is lost by clicking',
    ],
  },
]

export default facultyHomePageTour
