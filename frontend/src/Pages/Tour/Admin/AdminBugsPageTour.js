import { History, Inbox, Trash2 } from 'lucide-react'

const adminBugsPageTour = [
  {
    id: 'open',
    target: '[data-tour="admin-bugs-open"]',
    icon: Inbox,
    eyebrow: 'Stop 1',
    title: 'Waiting on you',
    points: [
      'Everything students and faculty sent',
      'Who reported it, when, and any screenshots',
      'The navbar counts these',
    ],
  },
  {
    id: 'decide',
    target: '[data-tour="admin-bug-actions"]',
    icon: History,
    eyebrow: 'Stop 2',
    title: 'Decide it',
    points: [
      'Resolve means it was fixed',
      'Decline means it was not a bug',
      'Either one moves it into history',
    ],
  },
  {
    id: 'history',
    target: '[data-tour="admin-bugs-history"]',
    icon: Trash2,
    eyebrow: 'Stop 3',
    title: 'Already decided',
    points: [
      'Filter by resolved or declined',
      'The reporter still sees the outcome',
      'Remove deletes it for everyone',
    ],
  },
]

export default adminBugsPageTour
