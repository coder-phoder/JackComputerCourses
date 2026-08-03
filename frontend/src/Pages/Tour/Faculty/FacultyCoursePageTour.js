import { ArrowLeft, Code2, ListVideo, PlayCircle } from 'lucide-react'

// The steps unfold the panels they are about, so the chapter list and the playground
// are opened in front of the faculty rather than described from the outside.
const getFacultyCoursePageTour = ({ hasIde, openChapters, openPlayground }) => [
  {
    id: 'chapters',
    target: '[data-tour="course-chapters"]',
    icon: ListVideo,
    eyebrow: 'Stop 1',
    title: 'Chapters',
    points: [
      'Every lesson of this course',
      'Click a chapter, then a lesson',
      'The same list your students get',
    ],
    onEnter: openChapters,
  },
  {
    id: 'video',
    target: '[data-tour="course-video"]',
    icon: PlayCircle,
    eyebrow: 'Stop 2',
    title: 'The lesson',
    points: [
      'Watch what you are teaching from',
      'The next lesson starts on its own',
      'Check a lesson before a class',
    ],
  },
  hasIde ? {
    id: 'playground',
    target: '#playground-editor-container',
    icon: Code2,
    eyebrow: 'Stop 3',
    title: 'Code along',
    points: [
      'The editor your students see here',
      'Run the example yourself',
      'Drag its edge to make it wider',
    ],
    onEnter: openPlayground,
  } : null,
  {
    id: 'back',
    target: '[data-tour="faculty-course-back"]',
    icon: ArrowLeft,
    eyebrow: hasIde ? 'Stop 4' : 'Stop 3',
    title: 'Back to the list',
    points: [
      'Returns to every course',
      'Nothing here is saved or changed',
      'Course content is edited by admins',
    ],
  },
].filter(Boolean)

export default getFacultyCoursePageTour
