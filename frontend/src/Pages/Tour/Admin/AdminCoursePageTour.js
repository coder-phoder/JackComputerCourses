import { FileText, ListVideo, Plus, ScrollText, Users } from 'lucide-react'

// A course open to all has no access list, so the page never renders that link and
// the stop about it is dropped rather than left pointing at nothing.
const getAdminCoursePageTour = ({ canManageAccess }) => [
  {
    id: 'summary',
    target: '[data-tour="admin-course-summary"]',
    icon: ScrollText,
    eyebrow: 'Stop 1',
    title: 'The course itself',
    points: [
      'Published or draft, and who it is open to',
      'The slug is its address on the site',
      'Edit these from the courses page',
    ],
  },
  {
    id: 'chapter-form',
    target: '[data-tour="admin-chapter-form"]',
    icon: Plus,
    eyebrow: 'Stop 2',
    title: 'Add a chapter',
    points: [
      'A name and a YouTube playlist link',
      'Order decides where it sits in the list',
      'Lessons are pulled from the playlist',
    ],
  },
  {
    id: 'chapters',
    target: '[data-tour="admin-chapter-list"]',
    icon: ListVideo,
    eyebrow: 'Stop 3',
    title: 'Chapters and lessons',
    points: [
      'Open one to see every lesson in it',
      'Sync pulls new videos from the playlist',
      'This is the list your students get',
    ],
  },
  canManageAccess ? {
    id: 'access',
    target: '[data-tour="admin-course-access"]',
    icon: Users,
    eyebrow: 'Stop 4',
    title: 'Who can watch it',
    points: [
      'This course is held for named students',
      'User Access is where you name them',
      'Access runs out after the duration',
    ],
  } : null,
  {
    id: 'notes',
    target: '[data-tour="admin-course-notes"]',
    icon: FileText,
    eyebrow: canManageAccess ? 'Stop 5' : 'Stop 4',
    title: 'Notes for the course',
    points: [
      'A Drive folder synced onto the course',
      'Faculty read and print what is in it',
      'Manage Notes links the folder',
    ],
  },
].filter(Boolean)

export default getAdminCoursePageTour
