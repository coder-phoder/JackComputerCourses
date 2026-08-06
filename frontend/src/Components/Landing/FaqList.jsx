import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { FAQS } from '../../utils/landingContent'
import { EASE_OUT } from '../../utils/motion'

// The six things people ask before they join, answered without being asked. One opens at
// a time — the first one to begin with, so the list never starts as six closed doors.
const FaqList = () => {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div className="grid gap-3">
      {FAQS.map((faq, index) => {
        const isOpen = index === openIndex

        return (
          <div
            key={faq.q}
            className={`overflow-hidden rounded-2xl border backdrop-blur transition-colors duration-300 ${
              isOpen
                ? 'border-blue-400/50 bg-white/80 dark:border-cyan-300/25 dark:bg-white/6'
                : 'border-slate-200/80 bg-white/50 hover:border-slate-300 dark:border-white/10 dark:bg-white/3 dark:hover:border-white/20'
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left"
            >
              <span className="font-display text-base font-medium text-slate-900 sm:text-lg dark:text-white">
                {faq.q}
              </span>

              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all duration-300 ${
                  isOpen
                    ? 'rotate-45 border-blue-500 bg-blue-600 text-white dark:border-cyan-300 dark:bg-cyan-400 dark:text-slate-950'
                    : 'border-slate-300 text-slate-500 dark:border-white/15 dark:text-slate-400'
                }`}
              >
                <Plus className="h-4 w-4" />
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="answer"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE_OUT }}
                  className="overflow-hidden"
                >
                  <p className="max-w-3xl px-6 pb-6 leading-relaxed text-pretty text-slate-600 dark:text-slate-300">
                    {faq.a}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

export default FaqList
