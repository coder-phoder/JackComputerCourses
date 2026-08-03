import { ArrowLeft, Code2, ListVideo, PlayCircle } from 'lucide-react'

// The steps open the panel they are about, so the sidebar and the playground are
// unfolded in front of the student rather than described from the outside.
const getUserCoursePlayerPageTour = ({ hasIde, openChapters, openPlayground }) => [
  {
    id: 'chapters',
    target: '[data-tour="course-chapters"]',
    icon: ListVideo,
    eyebrow: 'Stop 1',
    title: 'Chapters',
    points: [
      'Every lesson of the course',
      'Click a chapter, then a lesson',
      'The arrow folds it away for a wider video',
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
      'The next lesson starts on its own',
      'You come back to where you stopped',
      'Works from any computer you sign in on',
    ],
  },
  hasIde ? {
    id: 'playground',
    target: '#playground-editor-container',
    icon: Code2,
    eyebrow: 'Stop 3',
    title: 'Code along',
    points: [
      'Write and run the example as it plays',
      'Kept per lesson, so nothing is lost',
      'Drag its edge to make it wider',
    ],
    onEnter: openPlayground,
  } : null,
  {
    id: 'back',
    target: '[data-tour="course-back"]',
    icon: ArrowLeft,
    eyebrow: hasIde ? 'Stop 4' : 'Stop 3',
    title: 'Back to the list',
    points: [
      'Returns to all your courses',
      'Progress is already saved',
      'Close the tab whenever you are done',
    ],
  },
].filter(Boolean)

export default getUserCoursePlayerPageTour
