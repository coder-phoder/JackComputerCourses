import { FileText, RefreshCw, Search } from 'lucide-react'

const facultyTopicNotesPageTour = [
  {
    id: 'search',
    target: '[data-tour="faculty-notes-search"]',
    icon: Search,
    eyebrow: 'Stop 1',
    title: 'Find a folder',
    points: [
      'Search topics and course names',
      'Filter by course notes or topics',
      'Admins decide what appears here',
    ],
  },
  {
    id: 'card',
    target: '[data-tour="faculty-notes-card"]',
    icon: FileText,
    eyebrow: 'Stop 2',
    title: 'A notes folder',
    points: [
      'Files inside, ready to preview',
      'Course notes open chapter by chapter',
      'The badge shows if the sync worked',
    ],
  },
  {
    id: 'refresh',
    target: '[data-tour="faculty-notes-refresh"]',
    icon: RefreshCw,
    eyebrow: 'Stop 3',
    title: 'Just added?',
    points: [
      'Refresh pulls the newest folders',
      'A failed sync is the admin to fix',
      'Nothing here is edited by you',
    ],
  },
]

export default facultyTopicNotesPageTour
