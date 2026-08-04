import { BookOpen, Plus, RefreshCw, Search } from 'lucide-react'

const adminCoursesPageTour = [
  {
    id: 'new',
    target: '[data-tour="admin-course-new"]',
    icon: Plus,
    eyebrow: 'Stop 1',
    title: 'Create a course',
    points: [
      'Title, price and how long access lasts',
      'A draft stays hidden until you publish it',
      'Open to all skips the access list',
    ],
  },
  {
    id: 'filters',
    target: '[data-tour="course-filters"]',
    icon: Search,
    eyebrow: 'Stop 2',
    title: 'Find a course',
    points: [
      'Search by title',
      'Sort by newest, price, duration or videos',
      'Clear puts every course back',
    ],
  },
  {
    id: 'card',
    target: '[data-tour="admin-course-card"]',
    icon: BookOpen,
    eyebrow: 'Stop 3',
    title: 'A course card',
    points: [
      'Price, duration, lessons and who has access',
      'Click it to open the chapters',
      'Edit and delete sit under the dots',
    ],
  },
  {
    id: 'refresh',
    target: '[data-tour="admin-course-refresh"]',
    icon: RefreshCw,
    eyebrow: 'Stop 4',
    title: 'Out of date?',
    points: [
      'Refresh reloads the catalogue',
      'Lesson counts follow a chapter sync',
      'Nothing here is lost by clicking',
    ],
  },
]

export default adminCoursesPageTour
