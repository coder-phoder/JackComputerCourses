import { KeyRound, Settings2, UserPlus, Users } from 'lucide-react'

// The two panels on the left are collapsible, so the steps open the one they are
// about rather than describing a panel that is shut.
const getAdminUsersPageTour = ({ openUserForm, openRequests }) => [
  {
    id: 'form',
    target: '[data-tour="admin-user-form"]',
    icon: UserPlus,
    eyebrow: 'Stop 1',
    title: 'Create a user',
    points: [
      'Name, phone and a first password',
      'The phone is how they sign in',
      'Editing one opens the same panel',
    ],
    onEnter: openUserForm,
  },
  {
    id: 'requests',
    target: '[data-tour="admin-password-requests"]',
    icon: KeyRound,
    eyebrow: 'Stop 2',
    title: 'Password requests',
    points: [
      'Somebody who cannot sign in asked you',
      'Approving sets the password they chose',
      'A new phone creates the account',
    ],
    onEnter: openRequests,
  },
  {
    id: 'table',
    target: '[data-tour="admin-user-table"]',
    icon: Users,
    eyebrow: 'Stop 3',
    title: 'Everyone on the site',
    points: [
      'Every student account, newest first',
      'The row you are editing is highlighted',
      'Refresh reloads it from the server',
    ],
  },
  {
    id: 'actions',
    target: '[data-tour="admin-user-actions"]',
    icon: Settings2,
    eyebrow: 'Stop 4',
    title: 'What you can do to one',
    points: [
      'The calendar reads their attendance',
      'History is every login they made',
      'Edit and delete sit under the dots',
    ],
  },
]

export default getAdminUsersPageTour
