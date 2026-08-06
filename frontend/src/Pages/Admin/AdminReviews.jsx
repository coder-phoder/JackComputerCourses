import axios from 'axios'
import { Loader2, Sparkles, Star, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import AdminNavbar from '../../Components/Admin/AdminNavbar'
import StarRating from '../../Components/Common/StarRating'
import PageTour from '../../Components/Tour/PageTour'
import adminReviewsPageTour from '../Tour/Admin/AdminReviewsPageTour'
import { useAuth } from '../../Context/AuthContext'
import {
  ADMIN_REVIEWS_URL,
  formatReviewDate,
  getRatingLabel,
  summarizeReviews,
} from '../../utils/reviews'

// Every review students have written, and the one decision the admin makes about them:
// which of them the landing page carries. Nothing here edits or deletes what somebody
// wrote — a review is the writer's, and only they can take it back.
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'featured', label: 'On the landing page' },
  { value: 'rest', label: 'Not showcased' },
]

const matchesFilter = (review, filter) => (
  filter === 'all' || (filter === 'featured' ? review.featured : !review.featured)
)

const getErrorMessage = (error, fallback) => (
  error?.response?.data?.message || error?.message || fallback
)

const isAuthError = (error) => [401, 403].includes(error?.response?.status)

const AdminReviews = () => {
  const { auth, clearAuth } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(true)
  const [reviews, setReviews] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRequestError = useCallback((requestError, fallback) => {
    if (isAuthError(requestError)) {
      clearAuth()
      setIsAuthorized(false)
      return
    }

    setError(getErrorMessage(requestError, fallback))
  }, [clearAuth])

  useEffect(() => {
    let isActive = true

    const fetchReviews = async () => {
      try {
        const response = await axios.get(ADMIN_REVIEWS_URL, { withCredentials: true })

        if (!response.data?.success) {
          throw new Error(response.data?.message || 'Unable to load reviews')
        }

        if (isActive) {
          setReviews(response.data?.data?.reviews || [])
        }
      } catch (fetchError) {
        if (isActive) {
          handleRequestError(fetchError, 'Unable to load reviews.')
        }
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    fetchReviews()

    return () => {
      isActive = false
    }
  }, [handleRequestError])

  const summary = useMemo(() => summarizeReviews(reviews), [reviews])

  const counts = useMemo(() => ({
    all: reviews.length,
    featured: summary.featured,
    rest: reviews.length - summary.featured,
  }), [reviews.length, summary.featured])

  const visibleReviews = useMemo(
    () => reviews.filter((review) => matchesFilter(review, filter)),
    [filter, reviews],
  )

  // Picking and dropping are the same decision, so they are the same request with the
  // answer flipped. A review that was already showcased goes back to the front of the
  // landing page, which orders itself by when each review was picked.
  const handleShowcase = async (review) => {
    const featured = !review.featured

    setBusyId(review._id)
    setError('')
    setSuccess('')

    try {
      const response = await axios.patch(
        `${ADMIN_REVIEWS_URL}/${review._id}/showcase`,
        { featured },
        { withCredentials: true },
      )

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update the showcase')
      }

      const updatedReview = response.data.data.review

      setReviews((currentReviews) => currentReviews.map(
        (current) => (current._id === updatedReview._id ? updatedReview : current),
      ))
      setSuccess(response.data.message)
    } catch (showcaseError) {
      handleRequestError(showcaseError, 'Unable to update the showcase. Please try again.')
    } finally {
      setBusyId('')
    }
  }

  if (!isAuthorized || auth.role !== 'admin') {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <AdminNavbar />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Reviews</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              What students have said about the institute. Showcase as many as you like and
              they appear on the landing page, newest pick first.
            </p>
          </div>

          <PageTour steps={adminReviewsPageTour} />
        </div>

        {error ? (
          <p className="mb-5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mb-5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300">
            {success}
          </p>
        ) : null}

        <section
          data-tour="admin-reviews-summary"
          className="mb-6 grid gap-4 sm:grid-cols-3"
        >
          {[
            { label: 'Reviews written', value: summary.total, hint: 'By students, in their own words' },
            { label: 'Average rating', value: summary.average || '—', hint: 'Out of 5 stars' },
            { label: 'On the landing page', value: summary.featured, hint: 'Your picks, live to visitors' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 shadow-sm"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-black tabular-nums text-slate-900 dark:text-slate-100">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{stat.hint}</p>
            </div>
          ))}
        </section>

        <section
          data-tour="admin-reviews-list"
          className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Student reviews</h2>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    filter === option.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500'
                  }`}
                >
                  {option.label} ({counts[option.value]})
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="flex items-center gap-2 px-6 py-8 text-sm font-medium text-slate-500 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading reviews...
            </p>
          ) : null}

          {!loading && !visibleReviews.length ? (
            <p className="px-6 py-8 text-sm font-medium text-slate-500 dark:text-slate-400">
              {reviews.length
                ? 'No reviews match this filter.'
                : 'No student has written a review yet. Everyone is asked for one when they sign in.'}
            </p>
          ) : null}

          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {visibleReviews.map((review, index) => {
              const isBusy = busyId === review._id

              return (
                <li key={review._id} className="px-6 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <StarRating value={review.rating} size="sm" />
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {getRatingLabel(review.rating)}
                        </p>

                        {review.featured ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            <Sparkles className="h-3 w-3" />
                            On the landing page
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {review.reviewerName} · {review.reviewerPhone || 'No number'} · {formatReviewDate(review.createdAt)}
                      </p>
                    </div>

                    {/* The walkthrough points at the first row's decision, which is the
                        one control this page has. */}
                    <div data-tour={index ? undefined : 'admin-review-showcase'}>
                      <button
                        type="button"
                        onClick={() => handleShowcase(review)}
                        disabled={isBusy}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed ${
                          review.featured
                            ? 'border border-slate-300 text-slate-700 hover:border-slate-400 disabled:text-slate-400 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300'
                        }`}
                      >
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : review.featured ? (
                          <X className="h-4 w-4" />
                        ) : (
                          <Star className="h-4 w-4" />
                        )}
                        {review.featured ? 'Take down' : 'Showcase'}
                      </button>
                    </div>
                  </div>

                  {review.comment ? (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {review.comment}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm font-medium italic text-slate-400 dark:text-slate-500">
                      Stars only — no words with this one.
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </main>
    </div>
  )
}

export default AdminReviews
