import { CircleAlert, Loader2, Send } from 'lucide-react'
import { useState } from 'react'
import StarRating from '../../Common/StarRating'
import {
  MAX_COMMENT_LENGTH,
  getRatingLabel,
  saveReview,
  toReviewDraft,
} from '../../../utils/reviews'

// The one way a review is written, whether it is being given on the way into the
// dashboard or edited months later from the profile. Both callers hand over what is
// being edited, if anything, and are handed back what the server kept.
//
// It is a group of controls rather than a <form> element: the profile page already is
// one, and a form inside a form is not a page a browser will lay out.
const UserReviewForm = ({
  review,
  onSaved,
  onCancel,
  onAuthError,
  submitLabel = 'Send review',
  disabled = false,
}) => {
  const [draft, setDraft] = useState(() => toReviewDraft(review))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isBusy = saving || disabled

  const handleSubmit = async () => {
    // The stars are the review; the words beside them are optional, so this is the
    // only thing that can be missing.
    if (!draft.rating) {
      setError('Pick a rating from one to five stars.')
      return
    }

    setSaving(true)
    setError('')

    try {
      const savedReview = await saveReview({ reviewId: review?._id, ...draft })

      onSaved(savedReview)
    } catch (saveError) {
      if ([401, 403].includes(saveError?.response?.status)) {
        onAuthError?.()
        return
      }

      setError(
        saveError?.response?.data?.message
          || saveError?.message
          || 'Unable to save your review. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <StarRating
          value={draft.rating}
          size="lg"
          disabled={isBusy}
          onChange={(rating) => {
            setError('')
            setDraft((currentDraft) => ({ ...currentDraft, rating }))
          }}
        />

        <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
          {getRatingLabel(draft.rating) || 'Tap a star'}
        </span>
      </div>

      <div>
        <textarea
          value={draft.comment}
          disabled={isBusy}
          rows={4}
          maxLength={MAX_COMMENT_LENGTH}
          placeholder="What has studying here been like? (optional)"
          onChange={(event) => setDraft((currentDraft) => ({
            ...currentDraft,
            comment: event.target.value,
          }))}
          className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900"
        />

        <p className="mt-2 text-right text-xs font-bold tabular-nums text-slate-400 dark:text-slate-500">
          {draft.comment.length}/{MAX_COMMENT_LENGTH}
        </p>
      </div>

      {error ? (
        <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isBusy}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none dark:disabled:bg-blue-900/50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {saving ? 'Saving...' : submitLabel}
        </button>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-500 dark:disabled:text-slate-600"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default UserReviewForm
