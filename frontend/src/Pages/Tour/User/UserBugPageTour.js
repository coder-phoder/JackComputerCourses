import { History, Image, Send } from 'lucide-react'

const userBugPageTour = [
  {
    id: 'report',
    target: '[data-tour="bug-form"]',
    icon: Send,
    eyebrow: 'Stop 1',
    title: 'Report it',
    points: [
      'Title says what broke',
      'Description says what you were doing',
      'It reaches an admin, not your faculty',
    ],
  },
  {
    id: 'images',
    target: '[data-tour="bug-images"]',
    icon: Image,
    eyebrow: 'Stop 2',
    title: 'Add a screenshot',
    points: [
      'A picture settles most reports',
      'Add more than one if it helps',
      'Remove one with the x',
    ],
  },
  {
    id: 'open',
    target: '[data-tour="bug-open"]',
    icon: Send,
    eyebrow: 'Stop 3',
    title: 'Waiting on an admin',
    points: [
      'Everything you sent that is still Open',
      'No need to report it twice',
      'It moves down once decided',
    ],
  },
  {
    id: 'history',
    target: '[data-tour="bug-history"]',
    icon: History,
    eyebrow: 'Stop 4',
    title: 'Decided reports',
    points: [
      'Resolved means it was fixed',
      'Declined means it was not a bug',
      'The date of the decision is shown',
    ],
  },
]

export default userBugPageTour
