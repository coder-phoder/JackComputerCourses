import { MotionConfig, motion } from 'framer-motion'
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import CallToAction from './CallToAction'
import LandingBackground from './LandingBackground'
import LandingFooter from './LandingFooter'
import LandingNavbar from './LandingNavbar'
import { EASE_OUT } from '../../utils/motion'

// The shell the four public pages are poured into: one WebGL background, one navbar, one
// closing invitation, one footer. A page supplies its middle and nothing else, which is
// what keeps the four of them feeling like one site rather than four.
const LandingLayout = ({ children, hideCallToAction = false }) => {
  const location = useLocation()

  // Arriving on a new page at the scroll position of the old one is disorienting, and
  // the router does not do this for us.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    // `reducedMotion="user"` hands every animation below to the reader's system setting,
    // so no component here has to ask about it a second time.
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen overflow-x-clip bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white dark:bg-[#020617] dark:text-slate-200">
        <LandingBackground />

        <div className="relative z-10 flex min-h-screen flex-col">
          <LandingNavbar />

          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="flex-1 pt-18"
          >
            {children}
            {hideCallToAction ? null : <CallToAction />}
          </motion.main>

          <LandingFooter />
        </div>
      </div>
    </MotionConfig>
  )
}

export default LandingLayout
