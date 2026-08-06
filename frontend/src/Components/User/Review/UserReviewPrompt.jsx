import { Star } from 'lucide-react'
import UserPromptDialog from '../Profile/UserPromptDialog'
import UserReviewForm from './UserReviewForm'

// The profile prompt sends the account to a page, because a profile is a page of work.
// A review is five stars and a sentence, so it is asked for and given in the same card:
// anything that closes it before that is a week of quiet.
const UserReviewPrompt = ({ onDismiss }) => (
  <UserPromptDialog
    prompt="review"
    Icon={Star}
    title="How are you finding it here?"
    description="Rate the institute and say a little about it if you want to. Your review may be shown to people deciding whether to join."
    footnote="You can edit or delete it any time from My reviews in your profile."
    onDismiss={onDismiss}
  >
    {({ disabled }) => (
      <UserReviewForm
        disabled={disabled}
        onSaved={onDismiss}
        // A session that has run out mid review is the dashboard's to notice; the card
        // has nowhere to send anyone, so it simply gets out of the way.
        onAuthError={onDismiss}
      />
    )}
  </UserPromptDialog>
)

export default UserReviewPrompt
