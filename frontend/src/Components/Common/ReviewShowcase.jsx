import axios from 'axios'
import { Quote } from 'lucide-react'
import { useEffect, useState } from 'react'
import StarRating from './StarRating'
import { FEATURED_REVIEWS_URL, formatReviewDate, summarizeReviews } from '../../utils/reviews'

// What students say about the institute, in their own words, to a visitor who has not
// signed in. Every review here was written by an account and then picked by the admin,
// so the section is only ever as long as the admin meant it to be — and until something
// has been picked, the landing page carries no empty promise where it would go.
const ReviewShowcase = () => {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    let isActive = true

    const loadReviews = async () => {
      try {
        const response = await axios.get(FEATURED_REVIEWS_URL)

        if (isActive && response.data?.success) {
          setReviews(response.data?.data?.reviews || [])
        }
      } catch {
        // The landing page stands on its own; a section that cannot be loaded is one
        // the visitor never knows was meant to be there.
      }
    }

    loadReviews()

    return () => {
      isActive = false
    }
  }, [])

  if (!reviews.length) {
    return null
  }

  const { total, average } = summarizeReviews(reviews)

  return (
    <div className="py-20 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">What Our Students Say</h2>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
            <StarRating value={Math.round(average)} />
            <p className="text-lg text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-slate-100">{average}</span>
              {' out of 5, from '}
              {total} {total === 1 ? 'student' : 'students'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review) => (
            <figure
              key={review._id}
              className="flex flex-col p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <Quote aria-hidden="true" className="h-8 w-8 text-blue-600/30 dark:text-blue-400/30" />

              {review.comment ? (
                <blockquote className="mt-4 flex-1 whitespace-pre-wrap text-slate-600 dark:text-slate-300 leading-relaxed">
                  {review.comment}
                </blockquote>
              ) : null}

              <figcaption className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-slate-100">{review.reviewerName}</p>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {formatReviewDate(review.createdAt)}
                  </p>
                </div>

                <StarRating value={review.rating} size="sm" />
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ReviewShowcase
