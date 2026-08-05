import { FileText, Plus, RefreshCw, Search } from 'lucide-react'

const adminTopicNotesPageTour = [
  {
    id: 'add',
    target: '[data-tour="admin-notes-add"]',
    icon: Plus,
    eyebrow: 'Stop 1',
    title: 'Add notes',
    points: [
      'A topic folder, or notes for a course',
      'Paste the link to a Drive folder',
      'Files are pulled in as soon as it saves',
    ],
  },
  {
    id: 'search',
    target: '[data-tour="admin-notes-search"]',
    icon: Search,
    eyebrow: 'Stop 2',
    title: 'Find a folder',
    points: [
      'Search topics and course names',
      'Filter by course notes or topics',
      'Every folder here is faculty only',
    ],
  },
  {
    id: 'card',
    target: '[data-tour="admin-notes-card"]',
    icon: FileText,
    eyebrow: 'Stop 3',
    title: 'A notes folder',
    points: [
      'Show files lists what synced',
      'Sync, edit and delete sit under the dots',
      'A failed sync usually means sharing',
    ],
  },
  {
    id: 'refresh',
    target: '[data-tour="admin-notes-refresh"]',
    icon: RefreshCw,
    eyebrow: 'Stop 4',
    title: 'Just changed Drive?',
    points: [
      'Refresh reloads every folder',
      'Sync one folder from its own dots',
      'Faculty see the change straight away',
    ],
  },
]

export default adminTopicNotesPageTour
