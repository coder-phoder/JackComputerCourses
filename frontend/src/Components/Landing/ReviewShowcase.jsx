import axios from 'axios'
import { Quote } from 'lucide-react'
import { useEffect, useState } from 'react'
import StarRating from '../Common/StarRating'
import Reveal from './Reveal'
import SectionHeading from './SectionHeading'
import SpotlightCard from './SpotlightCard'
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
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <SectionHeading eyebrow="In their words" align="center" title="What our students say">
        <span className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
          <StarRating value={Math.round(average)} />
          <span>
            <span className="font-semibold text-slate-900 dark:text-white">{average}</span>
            {' out of 5, from '}
            {total} {total === 1 ? 'student' : 'students'}
          </span>
        </span>
      </SectionHeading>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review, index) => (
          <Reveal key={review._id} delay={(index % 3) * 0.07} className="h-full">
            <SpotlightCard as="figure" className="flex h-full flex-col p-8">
              <Quote aria-hidden="true" className="h-8 w-8 text-blue-600/30 dark:text-cyan-300/30" />

              {review.comment ? (
                <blockquote className="mt-5 flex-1 leading-relaxed whitespace-pre-wrap text-pretty text-slate-600 dark:text-slate-300">
                  {review.comment}
                </blockquote>
              ) : null}

              <figcaption className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-5 dark:border-white/10">
                <div>
                  <p className="font-display font-semibold text-slate-900 dark:text-white">{review.reviewerName}</p>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {formatReviewDate(review.createdAt)}
                  </p>
                </div>

                <StarRating value={review.rating} size="sm" />
              </figcaption>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

export default ReviewShowcase
