import { BookOpen, RefreshCw, Search } from 'lucide-react'

const facultyCoursesPageTour = [
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
    target: '[data-tour="faculty-course-card"]',
    icon: BookOpen,
    eyebrow: 'Stop 2',
    title: 'A course card',
    points: [
      'Chapters, lessons and category',
      'Click it to open the course',
      'You see it as your students do',
    ],
  },
  {
    id: 'refresh',
    target: '[data-tour="faculty-course-refresh"]',
    icon: RefreshCw,
    eyebrow: 'Stop 3',
    title: 'Missing a course?',
    points: [
      'Refresh after an admin adds one',
      'Every published course is listed',
      'Still missing? tell an admin',
    ],
  },
]

export default facultyCoursesPageTour
