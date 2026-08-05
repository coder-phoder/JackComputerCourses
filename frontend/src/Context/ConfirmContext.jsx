/* eslint-disable react-refresh/only-export-components */
import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ConfirmDialog from '../Components/Common/ConfirmDialog'

// window.confirm blocks the whole browser, cannot be styled, and says whatever the
// browser wants it to say beside the page it interrupted. This replaces it with the
// app's own dialog while keeping the shape that made it easy to reach for:
//
//   const confirm = useConfirm()
//   if (!(await confirm({ title: 'Delete course', tone: 'danger' }))) return
//
// The promise settles with true or false and never rejects, so a caller only ever
// has to handle the answer.
const ConfirmContext = createContext(null)

const DEFAULT_TITLE = 'Are you sure?'

// Passing a bare string keeps the plainest questions as short to ask as they were.
const normalizeOptions = (options) => (
  typeof options === 'string'
    ? { title: DEFAULT_TITLE, description: options }
    : { title: DEFAULT_TITLE, ...options }
)

export const ConfirmProvider = ({ children }) => {
  const [request, setRequest] = useState(null)
  // The resolver is held in a ref rather than in state because answering is a side
  // effect: a state updater can be run twice and must not settle a promise twice.
  const resolverRef = useRef(null)
  const restoreFocusRef = useRef(null)

  const settle = useCallback((answer) => {
    const resolve = resolverRef.current
    const trigger = restoreFocusRef.current

    resolverRef.current = null
    restoreFocusRef.current = null
    setRequest(null)
    resolve?.(answer)

    // Focus goes back to whatever opened the dialog, unless that control has since
    // left the page — a row deleted out from under it, for instance.
    if (trigger?.isConnected) {
      trigger.focus()
    }
  }, [])

  const confirm = useCallback((options) => new Promise((resolve) => {
    // A second question arriving while one is still up answers the first with a no,
    // so nothing is left awaiting a dialog that is no longer on screen.
    resolverRef.current?.(false)

    resolverRef.current = resolve
    restoreFocusRef.current = document.activeElement
    setRequest(normalizeOptions(options))
  }), [])

  // The page behind the dialog must not scroll away under it.
  useEffect(() => {
    if (!request) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [request])

  // An unmount mid-question would otherwise leave the caller awaiting forever.
  useEffect(() => () => resolverRef.current?.(false), [])

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {createPortal(
        <AnimatePresence>
          {request ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onMouseDown={() => settle(false)}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
            >
              <ConfirmDialog
                {...request}
                onConfirm={() => settle(true)}
                onCancel={() => settle(false)}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext)

  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider')
  }

  return context.confirm
}
