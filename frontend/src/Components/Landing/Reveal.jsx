import { motion } from 'framer-motion'
import { EASE_OUT } from '../../utils/motion'

// One arrival for the whole public site: whatever it wraps rises the same distance, on
// the same curve, the first time it comes into view — and never again, so scrolling back
// up does not replay the page. A `delay` staggers neighbours that arrive together.
const Reveal = ({ as = 'div', children, className = '', delay = 0, distance = 24, ...rest }) => {
  const Component = motion[as] || motion.div

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay, ease: EASE_OUT }}
      {...rest}
    >
      {children}
    </Component>
  )
}

export default Reveal
