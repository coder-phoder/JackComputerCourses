import { GraduationCap, Settings2, UserPlus } from 'lucide-react'

const adminFacultiesPageTour = [
  {
    id: 'form',
    target: '[data-tour="admin-faculty-form"]',
    icon: UserPlus,
    eyebrow: 'Stop 1',
    title: 'Create a faculty',
    points: [
      'Name, phone and a first password',
      'They can mark attendance straight away',
      'Editing one opens the same panel',
    ],
  },
  {
    id: 'table',
    target: '[data-tour="admin-faculty-table"]',
    icon: GraduationCap,
    eyebrow: 'Stop 2',
    title: 'Everyone who teaches',
    points: [
      'Every faculty account on the site',
      'The row you are editing is highlighted',
      'Refresh reloads it from the server',
    ],
  },
  {
    id: 'actions',
    target: '[data-tour="admin-faculty-actions"]',
    icon: Settings2,
    eyebrow: 'Stop 3',
    title: 'What you can do to one',
    points: [
      'History is every login they made',
      'Edit and delete sit under the dots',
      'Deleting does not delete what they marked',
    ],
  },
]

export default adminFacultiesPageTour
