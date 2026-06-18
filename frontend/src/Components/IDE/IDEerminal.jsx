import { useEffect, useRef } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Terminal as TerminalIcon,
} from 'lucide-react'

const IDEerminal = ({
  handleClearTerminal,
  handleInputKeyDown,
  inputVal,
  isCollapsed,
  isDraggingHeight,
  isRunning,
  onStartResize,
  setInputVal,
  setIsCollapsed,
  terminalHeight,
  terminalOutput,
}) => {
  const terminalRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [inputVal, terminalOutput])

  useEffect(() => {
    if (!isCollapsed && isRunning && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isCollapsed, isRunning, terminalOutput])

  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="flex h-10 w-full shrink-0 items-center justify-between border-t border-slate-800 bg-slate-950 px-4 text-left text-slate-100 transition hover:bg-slate-900"
        title="Open terminal"
        aria-label="Open terminal"
      >
        <span className="flex h-8 items-center gap-2 rounded px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <TerminalIcon className="h-4 w-4 text-emerald-400" />
          Terminal
          {isRunning ? (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          ) : null}
        </span>
        <span className="flex h-8 w-8 items-center justify-center rounded text-slate-400">
          <ChevronUp className="h-4 w-4" />
        </span>
      </button>
    )
  }

  return (
    <>
      <div
        onMouseDown={onStartResize}
        className={`h-1.5 shrink-0 cursor-row-resize select-none rounded transition-all duration-150 hover:h-2 hover:bg-blue-500 ${
          isDraggingHeight ? 'h-2 bg-blue-600' : 'bg-slate-200 dark:bg-slate-800'
        }`}
      />

      <div
        style={{ height: `${terminalHeight}px` }}
        className="relative flex min-h-0 shrink-0 flex-col overflow-hidden border-t border-slate-900 bg-slate-950 text-slate-100 shadow-2xl"
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsCollapsed(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setIsCollapsed(true)
            }
          }}
          className="group flex cursor-pointer items-center justify-between border-b border-slate-950 bg-slate-900 px-4 py-3 transition hover:bg-slate-800"
          title="Collapse terminal"
          aria-label="Collapse terminal"
        >
          <div className="flex items-center gap-2">
            <TerminalIcon className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Interactive Terminal</span>
            {isRunning ? (
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                handleClearTerminal()
              }}
              onKeyDown={(event) => event.stopPropagation()}
              className="rounded border border-slate-800 bg-slate-950 px-2 py-0.5 text-xs font-semibold text-slate-400 transition hover:border-slate-700 hover:text-white"
            >
              Clear Logs
            </button>
            <span className="flex h-7 w-7 items-center justify-center rounded text-slate-400 transition group-hover:text-white">
              <ChevronDown className="h-4 w-4" />
            </span>
          </div>
        </div>

        <div
          ref={terminalRef}
          onClick={handleTerminalClick}
          className="min-h-0 flex-1 cursor-text overflow-y-auto whitespace-pre-wrap px-4 py-3 font-mono text-sm leading-relaxed selection:bg-slate-800"
        >
          {terminalOutput ? (
            <span className="text-slate-100">{terminalOutput}</span>
          ) : (
            <div className="flex items-center gap-2 py-2 text-slate-500">
              <AlertTriangle className="h-4 w-4 text-amber-500/80" />
              <span className="italic">Terminal logs are empty. Run your code to start.</span>
            </div>
          )}
          {isRunning ? (
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={(event) => setInputVal(event.target.value)}
              onKeyDown={handleInputKeyDown}
              className="m-0 inline border-none bg-transparent p-0 font-mono text-sm text-slate-100 caret-emerald-400 outline-none focus:border-none focus:outline-none focus:ring-0"
              style={{
                width: `${Math.max(1, inputVal.length)}ch`,
                minWidth: '8px',
              }}
              autoFocus
            />
          ) : null}
        </div>
      </div>
    </>
  )
}

export default IDEerminal
