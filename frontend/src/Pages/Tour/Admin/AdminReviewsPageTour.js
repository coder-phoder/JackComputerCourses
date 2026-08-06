import { Gauge, Sparkles, Star } from 'lucide-react'

const adminReviewsPageTour = [
  {
    id: 'summary',
    target: '[data-tour="admin-reviews-summary"]',
    icon: Gauge,
    eyebrow: 'Stop 1',
    title: 'How you are doing',
    points: [
      'Everything students have written',
      'The average of every rating given',
      'How many are live on the landing page',
    ],
  },
  {
    id: 'list',
    target: '[data-tour="admin-reviews-list"]',
    icon: Star,
    eyebrow: 'Stop 2',
    title: 'Every review',
    points: [
      'Newest first, with who wrote it and when',
      'Filter by what is showcased and what is not',
      'Only the writer can edit or delete one',
    ],
  },
  {
    id: 'showcase',
    target: '[data-tour="admin-review-showcase"]',
    icon: Sparkles,
    eyebrow: 'Stop 3',
    title: 'Put it on the landing page',
    points: [
      'Showcase as many reviews as you want',
      'Your newest pick leads the section',
      'Take down puts it back to private',
    ],
  },
]

export default adminReviewsPageTour
