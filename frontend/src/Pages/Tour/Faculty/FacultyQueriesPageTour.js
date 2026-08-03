import { Check, History, Inbox, SplitSquareHorizontal } from 'lucide-react'

const facultyQueriesPageTour = [
  {
    id: 'open',
    target: '[data-tour="faculty-query-open"]',
    icon: Inbox,
    eyebrow: 'Stop 1',
    title: 'Waiting on you',
    points: [
      'Every question a student has sent',
      'Click one to open it',
      'The count is what is still unanswered',
    ],
  },
  {
    id: 'review',
    target: '[data-tour="faculty-query-review"]',
    icon: SplitSquareHorizontal,
    eyebrow: 'Stop 2',
    title: 'Their code, side by side',
    points: [
      'Left is what the student sent',
      'Right is your copy to edit',
      'It unlocks once you accept',
    ],
  },
  {
    id: 'actions',
    target: '[data-tour="faculty-query-actions"]',
    icon: Check,
    eyebrow: 'Stop 3',
    title: 'Answer it',
    points: [
      'Accept to take it on, Decline to pass',
      'Type a reply above the buttons',
      'Close Query sends your edit back',
    ],
  },
  {
    id: 'history',
    target: '[data-tour="faculty-query-history"]',
    icon: History,
    eyebrow: 'Stop 4',
    title: 'Already answered',
    points: [
      'Everything you decided',
      'Sent edits wait for the student',
      'Open one to reread the code',
    ],
  },
]

export default facultyQueriesPageTour
