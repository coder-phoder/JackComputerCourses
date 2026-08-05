import { ArrowLeft, FolderPlus, Printer, Settings } from 'lucide-react'

// Before a Drive folder is linked the page is one empty card, so the walkthrough
// stops at the thing that has to happen first instead of at files that do not exist.
const getAdminCourseNotesPageTour = ({ hasNotes }) => [
  hasNotes ? {
    id: 'files',
    target: '[data-tour="admin-notes-files"]',
    icon: Printer,
    eyebrow: 'Stop 1',
    title: 'What was synced',
    points: [
      'One file per chapter, pulled from Drive',
      'Preview opens it without leaving',
      'Faculty see exactly this list',
    ],
  } : {
    id: 'setup',
    target: '[data-tour="admin-notes-setup"]',
    icon: FolderPlus,
    eyebrow: 'Stop 1',
    title: 'No notes yet',
    points: [
      'Link a Drive folder of chapter files',
      'Share it with anyone who has the link',
      'The files sync as soon as it is saved',
    ],
  },
  {
    id: 'settings',
    target: '[data-tour="admin-notes-settings"]',
    icon: Settings,
    eyebrow: 'Stop 2',
    title: 'The folder behind it',
    points: [
      'Change the folder or the title',
      'Sync again after adding a file to Drive',
      'A failed sync usually means sharing',
    ],
  },
  {
    id: 'back',
    target: '[data-tour="admin-notes-back"]',
    icon: ArrowLeft,
    eyebrow: 'Stop 3',
    title: 'Back to the course',
    points: [
      'Returns to the chapters and lessons',
      'Notes are listed under Notes as well',
      'Nothing here is shown to students',
    ],
  },
]

export default getAdminCourseNotesPageTour
