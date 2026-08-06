import { ArrowRight, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import UserPromptDialog from './UserPromptDialog'

// Asked once a login lands on the dashboard, and only of an account that has never
// been through the form. Both answers close it: one opens the page, the other buys
// a few days of quiet.
const UserProfilePrompt = ({ onDismiss }) => {
  const navigate = useNavigate()

  return (
    <UserPromptDialog
      prompt="profile"
      Icon={UserRound}
      title="Complete your profile"
      description="Add an email and an address so the institute can reach you and send your certificates. All of it is optional, and it takes a minute."
      footnote="You can open it any time from Profile in the top bar."
      onDismiss={onDismiss}
    >
      {({ disabled }) => (
        <button
          type="button"
          onClick={() => navigate('/user/profile')}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none dark:disabled:bg-blue-900/50"
        >
          Do it right now
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </UserPromptDialog>
  )
}

export default UserProfilePrompt
