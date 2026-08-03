import { ArrowLeft, Printer } from 'lucide-react'

const facultyCourseNotesPageTour = [
  {
    id: 'chapters',
    target: '[data-tour="faculty-course-notes"]',
    icon: Printer,
    eyebrow: 'Stop 1',
    title: 'Chapter files',
    points: [
      'One file per chapter, in order',
      'Preview opens it without leaving',
      'Print sends it to a printer or PDF',
    ],
  },
  {
    id: 'back',
    target: '[data-tour="faculty-course-notes-back"]',
    icon: ArrowLeft,
    eyebrow: 'Stop 2',
    title: 'Back to Notes',
    points: [
      'Returns to every notes folder',
      'Refresh if a chapter is missing',
      'Content comes from the admin drive',
    ],
  },
]

export default facultyCourseNotesPageTour
