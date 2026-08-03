import { BookOpen, RefreshCw, Search } from 'lucide-react'

const userCoursesPageTour = [
  {
    id: 'search',
    target: '[data-tour="course-filters"]',
    icon: Search,
    eyebrow: 'Stop 1',
    title: 'Find a course',
    points: [
      'Search by title',
      'Sort by newest, price, duration or videos',
      'Clear puts every course back',
    ],
  },
  {
    id: 'card',
    target: '[data-tour="course-card"]',
    icon: BookOpen,
    eyebrow: 'Stop 2',
    title: 'A course card',
    points: [
      'Chapters, videos and when access ends',
      'Click it to open the player',
      'It opens in a new tab',
    ],
  },
  {
    id: 'refresh',
    target: '[data-tour="course-refresh"]',
    icon: RefreshCw,
    eyebrow: 'Stop 3',
    title: 'Missing a course?',
    points: [
      'Refresh after an admin adds one',
      'Courses arrive by your phone number',
      'Still missing? ask your faculty',
    ],
  },
]

export default userCoursesPageTour
