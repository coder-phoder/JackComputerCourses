import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { LogIn, Menu, MessageCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from '../Common/ThemeToggle'
import { INSTITUTE } from '../../utils/instituteInfo'
import { GENERAL_ENQUIRY_LINK, PUBLIC_NAV_LINKS } from '../../utils/landingContent'
import { EASE_OUT } from '../../utils/motion'

// The public site's navigation. Three things move in it, and each of them answers a
// question the reader would otherwise have to work out: the rail across the top says how
// much of the page is left, the lozenge slides to say which page you are on, and the bar
// itself only takes on weight once you have scrolled — so the top of a page is nothing
// but the page.
const LandingNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [hasScrolled, setHasScrolled] = useState(() => window.scrollY > 12)
  const location = useLocation()
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, restDelta: 0.001 })

  // A tapped link inside the sheet navigates; leaving the sheet open over the new page
  // would hide the page it just went to.
  const closeMenu = () => setIsMenuOpen(false)

  useEffect(() => {
    const handleScroll = () => setHasScrolled(window.scrollY > 12)

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <motion.div
        style={{ scaleX: progress }}
        className="h-0.5 origin-left bg-linear-to-r from-blue-500 via-indigo-500 to-cyan-400"
      />

      <div
        className={`transition-all duration-500 ${
          hasScrolled
            ? 'border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#020617]/80'
            : 'border-b border-transparent bg-transparent'
        }`}
      >
        <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="group flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 font-display text-lg font-bold text-white shadow-lg shadow-blue-600/30 transition-transform duration-500 group-hover:rotate-6">
              J
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {INSTITUTE.brandFirst}
              <span className="text-blue-600 dark:text-cyan-300">{INSTITUTE.brandSecond}</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {PUBLIC_NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.to

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative rounded-xl px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                    isActive
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="nav-active"
                      transition={{ duration: 0.4, ease: EASE_OUT }}
                      className="absolute inset-0 rounded-xl border border-blue-500/30 bg-blue-500/10 dark:border-cyan-300/20 dark:bg-cyan-400/10"
                    />
                  ) : null}
                  <span className="relative">{link.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />

            <Link
              to="/login"
              className="hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-500/10 sm:inline-flex dark:text-cyan-300 dark:hover:bg-cyan-400/10"
            >
              <LogIn className="h-4 w-4" />
              Student login
            </Link>

            <a
              href={GENERAL_ENQUIRY_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-[#052e16] shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-emerald-500/40 sm:inline-flex"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp us
            </a>

            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={isMenuOpen}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white/70 text-slate-700 transition hover:border-blue-400 md:hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="border-b border-slate-200/70 bg-white/95 px-4 py-5 backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-[#020617]/95"
          >
            <div className="mx-auto grid max-w-7xl gap-2">
              {PUBLIC_NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={closeMenu}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    location.pathname === link.to
                      ? 'bg-blue-500/10 text-blue-700 dark:bg-cyan-400/10 dark:text-cyan-200'
                      : 'text-slate-700 hover:bg-slate-900/5 dark:text-slate-200 dark:hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-2 grid gap-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
                <Link
                  to="/login"
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 rounded-xl border border-blue-500/40 px-4 py-3 text-sm font-semibold text-blue-700 dark:border-cyan-300/25 dark:text-cyan-200"
                >
                  <LogIn className="h-4 w-4" />
                  Student login
                </Link>

                <a
                  href={GENERAL_ENQUIRY_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeMenu}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-[#052e16]"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp us
                </a>

                <div className="flex justify-center pt-1 sm:hidden">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}

export default LandingNavbar
