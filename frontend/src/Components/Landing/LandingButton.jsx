import { Link } from 'react-router-dom'

// The public site asks for the same three things over and over — open WhatsApp, ring the
// lab, go to another page — so the three of them are one component. Which element it
// renders follows from what it was given: `to` is a route, `href` is the outside world,
// neither is a button.
const VARIANTS = {
  whatsapp: 'bg-[#25D366] text-[#052e16] shadow-[0_14px_34px_-10px_rgb(37_211_102/0.7)] hover:shadow-[0_22px_46px_-12px_rgb(37_211_102/0.85)]',
  primary: 'bg-linear-to-r from-blue-600 to-indigo-600 text-white shadow-[0_14px_34px_-12px_rgb(37_99_235/0.9)] hover:shadow-[0_22px_46px_-14px_rgb(37_99_235/0.95)]',
  outline: 'border border-slate-300 bg-white/60 text-slate-800 backdrop-blur hover:border-blue-400 hover:text-blue-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:hover:border-cyan-300/50 dark:hover:text-white',
  ghost: 'text-slate-600 hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
}

const SIZES = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-5 py-3 text-[0.95rem]',
  lg: 'px-7 py-4 text-base',
}

const LandingButton = ({
  children,
  className = '',
  href,
  size = 'md',
  to,
  variant = 'primary',
  ...rest
}) => {
  const classes = [
    'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl font-semibold',
    'transition-all duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
    SIZES[size],
    VARIANTS[variant],
    className,
  ].join(' ')

  // A light crosses the face of the button on hover — the same sheen the cards use, so
  // the two read as one material.
  const content = (
    <>
      <span className="pointer-events-none absolute inset-0 -translate-x-full opacity-0 transition-opacity duration-200 group-hover:animate-sheen group-hover:opacity-100">
        <span className="block h-full w-1/3 bg-linear-to-r from-transparent via-white/35 to-transparent" />
      </span>
      <span className="relative flex items-center gap-2">{children}</span>
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }

  if (href) {
    // A chat or a map opens in its own tab; a phone number and an email address are
    // handed to the device instead, and must not.
    const opensElsewhere = /^https?:/i.test(href)

    return (
      <a
        href={href}
        className={classes}
        rel={opensElsewhere ? 'noopener noreferrer' : undefined}
        target={opensElsewhere ? '_blank' : undefined}
        {...rest}
      >
        {content}
      </a>
    )
  }

  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  )
}

export default LandingButton
