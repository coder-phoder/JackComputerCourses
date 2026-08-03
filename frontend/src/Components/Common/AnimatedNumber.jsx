import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { EASE_OUT } from '../../utils/motion'

// A figure that counts up to its value, so the dashboard arrives as a movement rather
// than a flash of finished numbers. A reader who asked for less motion is handed the
// number outright, and a value that changes later is followed from wherever it is.
const AnimatedNumber = ({ value, suffix = '', duration = 1 }) => {
  const count = useMotionValue(0)
  const label = useTransform(count, (latest) => `${Math.round(latest)}${suffix}`)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (reduceMotion) {
      count.set(value)

      return undefined
    }

    const controls = animate(count, value, { duration, ease: EASE_OUT })

    return () => controls.stop()
  }, [count, duration, reduceMotion, value])

  return <motion.span>{label}</motion.span>
}

export default AnimatedNumber
