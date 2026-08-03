// One movement language for the dashboard: a section rises into place and the cards
// inside it follow the same curve one after another, so a page load reads as a single
// movement instead of a dozen unrelated ones. MotionConfig on the page hands the whole
// tree over to the reader's reduced motion setting, so nothing here has to ask twice.
export const EASE_OUT = [0.22, 1, 0.36, 1]

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
}

export const staggerParent = (staggerChildren = 0.08, delayChildren = 0.04) => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
})
