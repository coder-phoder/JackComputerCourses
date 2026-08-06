import { Star } from 'lucide-react'
import { MAX_RATING, getRatingLabel } from '../../utils/reviews'

// One set of stars for everywhere a rating is given or read: the prompt, the profile,
// the admin's list and the landing page. Handing it an onChange is what turns it from
// a reading into a control, so the two can never drift apart.
const SIZES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
}

const STARS = Array.from({ length: MAX_RATING }, (_, index) => index + 1)

const StarRating = ({ value = 0, onChange, size = 'md', disabled = false }) => {
  const isInput = Boolean(onChange)

  const renderStar = (star) => (
    <Star
      aria-hidden="true"
      className={`${SIZES[size]} transition-colors ${
        star <= value
          ? 'fill-amber-400 text-amber-400'
          : 'fill-transparent text-slate-300 dark:text-slate-600'
      }`}
    />
  )

  return (
    <div
      role={isInput ? 'radiogroup' : 'img'}
      aria-label={isInput ? 'Your rating' : `${value} out of ${MAX_RATING} stars`}
      className="flex items-center gap-1"
    >
      {STARS.map((star) => (isInput ? (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? 'star' : 'stars'} — ${getRatingLabel(star)}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className="rounded-lg p-0.5 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {renderStar(star)}
        </button>
      ) : (
        <span key={star}>{renderStar(star)}</span>
      )))}
    </div>
  )
}

export default StarRating
