import { useCallback } from 'react'

// Every panel on the public site is the same piece of glass: a hairline border, a blurred
// pane behind it, and a light that follows the pointer across it. The light is two CSS
// custom properties written on pointer move — no state, no re-render, so a fast mouse
// costs nothing. The gradient that reads them lives on `.spotlight` in index.css.
const SpotlightCard = ({
  as: Component = 'div',
  children,
  className = '',
  glow = 'oklch(0.62 0.19 259)',
  ...rest
}) => {
  const handlePointerMove = useCallback((event) => {
    const bounds = event.currentTarget.getBoundingClientRect()

    event.currentTarget.style.setProperty('--spot-x', `${event.clientX - bounds.left}px`)
    event.currentTarget.style.setProperty('--spot-y', `${event.clientY - bounds.top}px`)
  }, [])

  return (
    <Component
      onPointerMove={handlePointerMove}
      style={{ '--spot-color': glow }}
      className={`spotlight group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/70 backdrop-blur-xl transition duration-500 hover:border-blue-400/60 dark:border-white/10 dark:bg-white/4 dark:hover:border-cyan-300/30 ${className}`}
      {...rest}
    >
      <div className="relative z-10">{children}</div>
    </Component>
  )
}

export default SpotlightCard
