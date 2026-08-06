import { Gauge, Lock, MapPin, Save, Star, UserRound } from 'lucide-react'

// Only one group is mounted at a time, so a stop that points at one names it here and
// the page opens it on the way in.
const userProfilePageTour = [
  {
    id: 'profile-account',
    target: '[data-tour="profile-account"]',
    section: 'account',
    icon: Lock,
    eyebrow: 'Stop 1',
    title: 'What is fixed',
    points: [
      'Your name, number and member ID',
      'Marked Locked — only an admin changes them',
      'Everything in the other groups is yours',
    ],
  },
  {
    id: 'profile-progress',
    target: '[data-tour="profile-progress"]',
    icon: Gauge,
    eyebrow: 'Stop 2',
    title: 'Where you are',
    points: [
      'Every group, and how much of it is filled in',
      'Pick one and it opens beside this list',
      'Nothing on this page scrolls away',
    ],
  },
  {
    id: 'profile-contact',
    target: '[data-tour="profile-contact"]',
    section: 'contact',
    icon: UserRound,
    eyebrow: 'Stop 3',
    title: 'How to reach you',
    points: [
      'Email and a second number',
      'Tap a row to open it and type',
      'An empty row simply reads Not set',
    ],
  },
  {
    id: 'profile-address',
    target: '[data-tour="profile-address"]',
    section: 'address',
    icon: MapPin,
    eyebrow: 'Stop 4',
    title: 'Where to send things',
    points: [
      'Certificates and printed material',
      'Add as little or as much as you want',
      'Change it whenever you move',
    ],
  },
  {
    id: 'profile-save',
    target: '[data-tour="profile-save"]',
    icon: Save,
    eyebrow: 'Stop 5',
    title: 'Saving',
    points: [
      'Nothing is stored until you save',
      'One save keeps every group at once',
      'Discard puts back what was last saved',
    ],
  },
  // Last, because the reviews stop has no save bar under it: the walkthrough leaves
  // the page on this group rather than passing back through it.
  {
    id: 'profile-reviews',
    target: '[data-tour="profile-reviews"]',
    section: 'reviews',
    icon: Star,
    eyebrow: 'Stop 6',
    title: 'What you think',
    points: [
      'Rate the institute and say why',
      'Saved the moment you send it',
      'Yours to edit or delete any time',
    ],
  },
]

export default userProfilePageTour
