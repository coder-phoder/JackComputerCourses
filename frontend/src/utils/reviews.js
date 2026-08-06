import axios from 'axios'

// A review is written in one place, kept in another, read by the admin in a third and
// by the whole internet in a fourth. What a rating means, how long the words may be and
// how one is saved are the same in all four, so they are settled here once.
const API_BASE_URL = import.meta.env.VITE_BASE_URL

export const MY_REVIEWS_URL = `${API_BASE_URL}/user/reviews`
export const ADMIN_REVIEWS_URL = `${API_BASE_URL}/admin/reviews`
export const FEATURED_REVIEWS_URL = `${API_BASE_URL}/reviews`

export const MAX_RATING = 5

// The server enforces this too; repeating it here only stops a review being typed past
// the length that would be thrown back.
export const MAX_COMMENT_LENGTH = 600

// Stars are quick to give and say nothing on their own, so every rating carries the
// word it stands for — both while it is being picked and wherever it is read back.
const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']

export const getRatingLabel = (rating) => RATING_LABELS[rating - 1] || ''

export const toReviewDraft = (review) => ({
  rating: review?.rating || 0,
  comment: review?.comment || '',
})

// Writing a review and editing one differ by the id alone, so both go out from here
// and every caller gets the saved review back in the shape the server kept it in.
export const saveReview = async ({ reviewId, rating, comment }) => {
  const payload = { rating, comment }

  const response = reviewId
    ? await axios.patch(`${MY_REVIEWS_URL}/${reviewId}`, payload, { withCredentials: true })
    : await axios.post(MY_REVIEWS_URL, payload, { withCredentials: true })

  if (!response.data?.success) {
    throw new Error(response.data?.message || 'Unable to save your review')
  }

  return response.data.data.review
}

// What a pile of reviews amounts to: the admin reads it off the top of the list, and
// the landing page leads with it.
export const summarizeReviews = (reviews) => {
  const total = reviews.length
  const ratingTotal = reviews.reduce((sum, review) => sum + (review.rating || 0), 0)

  return {
    total,
    featured: reviews.filter((review) => review.featured).length,
    // One decimal, because the difference between 4.6 and 4.7 is the only thing an
    // average of a handful of reviews can honestly claim.
    average: total ? Math.round((ratingTotal / total) * 10) / 10 : 0,
  }
}

const reviewDateFormat = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export const formatReviewDate = (value) => {
  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? '' : reviewDateFormat.format(date)
}
