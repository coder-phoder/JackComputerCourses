import { Compass } from 'lucide-react'
import { useState } from 'react'
import TourOverlay from './TourOverlay'

// Every page carries its own walkthrough: this is the button that starts it and the
// overlay that runs it. autoStart is the first visit, where it opens unasked, so the
// page must only mount this once it knows the answer.
const PageTour = ({ steps, autoStart = false, onClose }) => {
  const [isOpen, setIsOpen] = useState(autoStart)

  const closeTour = () => {
    setIsOpen(false)
    onClose?.()
  }

  return (
    <>
      <button
        type="button"
        data-tour="tour-button"
        onClick={() => setIsOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-600 dark:hover:text-blue-300"
      >
        <Compass className="h-4 w-4" />
        Take the tour
      </button>

      {isOpen ? <TourOverlay steps={steps} onClose={closeTour} /> : null}
    </>
  )
}

export default PageTour
