import axios from 'axios'
import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, Loader2, Pencil, Sparkles, SquarePen, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import StarRating from '../../Common/StarRating'
import UserReviewForm from './UserReviewForm'
import { useConfirm } from '../../../Context/ConfirmContext'
import {
  MY_REVIEWS_URL,
  formatReviewDate,
  getRatingLabel,
} from '../../../utils/reviews'

// Everything the account has said about the institute, and the only place it can take
// any of it back. The rows sit inside the profile page's own group, so a review reads
// as one more thing the institute holds rather than as a separate page.
//
// Writing is one row that opens into the form, editing turns a review into the same
// form in place, and nothing else on the page changes shape while either is open.
const NEW_REVIEW = 'new'

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const UserReviewsPanel = ({ onAuthError }) => {
  const confirm = useConfirm()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Which review is open in the form: a review's id, NEW_REVIEW, or nothing.
  const [editing, setEditing] = useState('')
  const [deletingId, setDeletingId] = useState('')

  const handleRequestError = useCallback((requestError, fallback) => {
    if (isAuthError(requestError)) {
      onAuthError?.()
      return
    }

    setError(requestError?.response?.data?.message || fallback)
  }, [onAuthError])

  useEffect(() => {
    let isActive = true

    const loadReviews = async () => {
      try {
        const response = await axios.get(MY_REVIEWS_URL, { withCredentials: true })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to load your reviews')
        }

        if (isActive) {
          setReviews(response.data?.data?.reviews || [])
        }
      } catch (loadError) {
        if (isActive) {
          handleRequestError(loadError, 'Unable to load your reviews. Please try again.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadReviews()

    return () => {
      isActive = false
    }
  }, [handleRequestError])

  // A saved review replaces the one it was edited from, or joins the list at the top,
  // which is the order the server keeps them in.
  const handleSaved = (savedReview) => {
    setReviews((currentReviews) => (
      currentReviews.some((review) => review._id === savedReview._id)
        ? currentReviews.map((review) => (review._id === savedReview._id ? savedReview : review))
        : [savedReview, ...currentReviews]
    ))
    setEditing('')
    setError('')
  }

  const handleDelete = async (review) => {
    const confirmed = await confirm({
      title: 'Delete this review?',
      description: review.featured
        ? 'It is being shown on the landing page. Deleting it takes it down from there too, and this cannot be undone.'
        : 'This cannot be undone. You can always write another one.',
      confirmLabel: 'Delete review',
      tone: 'danger',
    })

    if (!confirmed) {
      return
    }

    setDeletingId(review._id)
    setError('')

    try {
      const response = await axios.delete(`${MY_REVIEWS_URL}/${review._id}`, {
        withCredentials: true,
      })

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to delete your review')
      }

      setReviews((currentReviews) => currentReviews.filter((current) => current._id !== review._id))
    } catch (deleteError) {
      handleRequestError(deleteError, 'Unable to delete your review. Please try again.')
    } finally {
      setDeletingId('')
    }
  }

  return (
    <>
      <div className="px-5 py-5">
        <AnimatePresence mode="wait" initial={false}>
          {editing === NEW_REVIEW ? (
            <motion.div
              key="new-review"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <UserReviewForm
                onSaved={handleSaved}
                onCancel={() => setEditing('')}
                onAuthError={onAuthError}
              />
            </motion.div>
          ) : (
            <motion.button
              key="write-review"
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setEditing(NEW_REVIEW)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-blue-400 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-300"
            >
              <SquarePen className="h-4 w-4" />
              Write a review
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {error ? (
        <p className="flex items-start gap-2 px-5 py-4 text-sm font-medium text-red-700 dark:text-red-300">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="flex items-center gap-2 px-5 py-5 text-sm font-medium text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your reviews...
        </p>
      ) : null}

      {!loading && !reviews.length ? (
        <p className="px-5 py-5 text-sm font-medium leading-6 text-slate-500 dark:text-slate-400">
          You have not written a review yet. Whatever you write stays yours to edit or
          delete, and the institute may show it to people deciding whether to join.
        </p>
      ) : null}

      {reviews.map((review) => (
        <div key={review._id} className="px-5 py-5">
          {editing === review._id ? (
            <UserReviewForm
              review={review}
              submitLabel="Save changes"
              onSaved={handleSaved}
              onCancel={() => setEditing('')}
              onAuthError={onAuthError}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <StarRating value={review.rating} size="sm" />
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {getRatingLabel(review.rating)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {formatReviewDate(review.createdAt)}
                  </span>

                  {/* A review the institute has put on its landing page is worth
                      knowing about before it is edited or taken down. */}
                  {review.featured ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                      <Sparkles className="h-3 w-3" />
                      On the home page
                    </span>
                  ) : null}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(review._id)}
                    disabled={Boolean(deletingId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(review)}
                    disabled={Boolean(deletingId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-400 disabled:cursor-not-allowed disabled:text-red-300 dark:border-red-900/60 dark:text-red-300 dark:hover:border-red-700"
                  >
                    {deletingId === review._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>

              {review.comment ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {review.comment}
                </p>
              ) : null}
            </>
          )}
        </div>
      ))}
    </>
  )
}

export default UserReviewsPanel
