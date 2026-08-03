import { Loader2, Settings } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Edit and delete live behind this one settings button everywhere in the app, so a
// row shows what it is instead of a wall of buttons and a destructive action is
// always one deliberate extra click away.
const MENU_GAP = 6
const VIEWPORT_MARGIN = 8

const TRIGGER_SIZES = {
  xs: 'h-6 w-6',
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
}

const TRIGGER_TONES = {
  // Matches the bordered controls the admin tables and cards are built from.
  bordered: 'rounded-lg border border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300 dark:disabled:text-slate-600',
  // For dense surfaces like the IDE explorer, where a border would add noise.
  ghost: 'rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white',
}

const ActionMenu = ({
  actions,
  label,
  header = null,
  disabled = false,
  busy = false,
  size = 'md',
  tone = 'bordered',
  menuWidth = 208,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const items = actions.filter((action) => action && !action.hidden)

  const closeMenu = useCallback((shouldRefocus = false) => {
    setIsOpen(false)
    setPosition(null)
    onOpenChange?.(false)

    if (shouldRefocus) {
      triggerRef.current?.focus()
    }
  }, [onOpenChange])

  // The menu is portalled to the body so a table with its own scrollbar, or a
  // panel with overflow hidden, cannot clip it. That means its place on screen is
  // measured from the trigger rather than inherited from it: it opens downwards
  // first, then the pass below flips it if the bottom of the screen is in the way.
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current

    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()

    setPosition({
      top: rect.bottom + MENU_GAP,
      left: Math.min(
        Math.max(VIEWPORT_MARGIN, rect.right - menuWidth),
        window.innerWidth - menuWidth - VIEWPORT_MARGIN,
      ),
    })
  }, [menuWidth])

  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition()
    }
  }, [isOpen, updatePosition])

  // The flip is measured off the rendered menu rather than guessed from the number
  // of items, so a wrapped label or a header cannot leave it hanging off its row.
  useLayoutEffect(() => {
    if (!position || !menuRef.current || !triggerRef.current) {
      return
    }

    const menuRect = menuRef.current.getBoundingClientRect()
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const flippedTop = triggerRect.top - menuRect.height - MENU_GAP

    if (menuRect.bottom <= window.innerHeight - VIEWPORT_MARGIN || flippedTop < VIEWPORT_MARGIN) {
      return
    }

    setPosition((current) => (
      current && Math.abs(current.top - flippedTop) > 1
        ? { ...current, top: flippedTop }
        : current
    ))
  }, [position])

  // A fixed menu cannot ride along with the page on its own, so it is re-measured
  // whenever anything moves the trigger — including the scroll the browser itself
  // performs when it focuses a trigger near the edge of the screen. It only gives
  // up and closes once the trigger has left the screen entirely.
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeMenu(true)
      }
    }

    const handleReposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()

      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        closeMenu()
        return
      }

      updatePosition()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
  }, [closeMenu, isOpen, updatePosition])

  if (!items.length) {
    return null
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(event) => {
          // Rows and cards are clickable in places, so opening the menu must not
          // count as opening the thing it belongs to.
          event.stopPropagation()
          setIsOpen(!isOpen)
          onOpenChange?.(!isOpen)
        }}
        onMouseDown={(event) => event.stopPropagation()}
        disabled={disabled || busy}
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`inline-flex shrink-0 items-center justify-center transition disabled:cursor-not-allowed ${TRIGGER_SIZES[size]} ${TRIGGER_TONES[tone]}`}
      >
        {busy
          ? <Loader2 className={`animate-spin ${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          : <Settings className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
      </button>

      {isOpen && position ? createPortal(
        <>
          <button
            type="button"
            aria-label="Close settings"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => closeMenu()}
          />
          <div
            ref={menuRef}
            role="menu"
            style={{ top: position.top, left: position.left, width: menuWidth }}
            onClick={(event) => event.stopPropagation()}
            className="fixed z-50 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            {header ? (
              <div className="border-b border-slate-100 px-3 pb-2 pt-1.5 dark:border-slate-800">
                {header}
              </div>
            ) : null}

            {items.map((action, index) => {
              const ActionIcon = action.icon
              // A destructive action is fenced off from the rest of the list so it
              // is never the one a hurried click lands on.
              const isFencedOff = action.danger && index > 0 && !items[index - 1].danger

              return (
                <button
                  key={action.key || action.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenu()
                    action.onClick()
                  }}
                  disabled={action.disabled}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    isFencedOff ? 'border-t border-slate-100 dark:border-slate-800' : ''
                  } ${
                    action.danger
                      ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {ActionIcon ? <ActionIcon className="h-3.5 w-3.5 shrink-0" /> : null}
                  {action.label}
                </button>
              )
            })}
          </div>
        </>,
        document.body,
      ) : null}
    </>
  )
}

export default ActionMenu
