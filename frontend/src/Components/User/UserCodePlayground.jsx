import { useEffect, useMemo, useState, useRef } from 'react'
import { Code2, PanelRightClose, PanelRightOpen, Play, Square, RotateCcw, Terminal, Settings } from 'lucide-react'
import { io } from 'socket.io-client'
import Editor from '@monaco-editor/react'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

const BOILERPLATES = {
  c: `#include <stdio.h>

int main() {
    printf("hello world\\n");
    return 0;
}`,
  cpp: `#include <iostream>

int main() {
    std::cout << "hello world" << std::endl;
    return 0;
}`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("hello world");
    }
}`,
  python: `print("hello world")
`,
  javascript: `console.log("hello world");`
}

const LANGUAGES = [
  { value: 'c', label: 'C', monacoLang: 'c', starterCode: BOILERPLATES.c },
  { value: 'cpp', label: 'C++', monacoLang: 'cpp', starterCode: BOILERPLATES.cpp },
  { value: 'java', label: 'Java', monacoLang: 'java', starterCode: BOILERPLATES.java },
  { value: 'python', label: 'Python', monacoLang: 'python', starterCode: BOILERPLATES.python },
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript', starterCode: BOILERPLATES.javascript }
]

const getLanguageConfig = (language) => (
  LANGUAGES.find((item) => item.value === language) || LANGUAGES[LANGUAGES.length - 1]
)

const getStorageKey = (courseId, selectedVideoKey, language) => (
  `jack-course-code:${courseId || 'course'}:${selectedVideoKey || 'lesson'}:${language}`
)

const getStoredCode = (storageKey, language) => {
  try {
    return window.localStorage.getItem(storageKey) || getLanguageConfig(language).starterCode
  } catch {
    return getLanguageConfig(language).starterCode
  }
}

const storeCode = (storageKey, code) => {
  try {
    window.localStorage.setItem(storageKey, code)
  } catch {
    // Local draft persistence is optional
  }
}

const CodePlaygroundEditor = ({ storageKey, language }) => {
  const languageConfig = getLanguageConfig(language)
  const [code, setCode] = useState(() => getStoredCode(storageKey, language))
  const [terminalOutput, setTerminalOutput] = useState('')
  const [inputVal, setInputVal] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [socket, setSocket] = useState(null)

  const terminalRef = useRef(null)
  const inputRef = useRef(null)

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('jack_playground_font_size')
    return saved ? parseInt(saved, 10) : 18
  })

  const [showSettings, setShowSettings] = useState(false)

  const handleIncreaseFont = () => {
    setFontSize((prev) => {
      const next = Math.min(24, prev + 1)
      localStorage.setItem('jack_playground_font_size', next)
      return next
    })
  }

  const handleDecreaseFont = () => {
    setFontSize((prev) => {
      const next = Math.max(10, prev - 1)
      localStorage.setItem('jack_playground_font_size', next)
      return next
    })
  }

  // Sync code to localStorage when it changes
  useEffect(() => {
    storeCode(storageKey, code)
  }, [code, storageKey])

  // Socket Connection Setup
  useEffect(() => {
    const socketInstance = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    })

    socketInstance.on('connect', () => {
      console.log('Playground connected to run server')
    })

    socketInstance.on('terminal-output', (data) => {
      setTerminalOutput((prev) => prev + data)
    })

    socketInstance.on('process-exit', (exitCode) => {
      setTerminalOutput((prev) => prev + `\n--- Process exited with code ${exitCode} ---\n`)
      setIsRunning(false)
    })

    socketInstance.on('connect_error', () => {
      setTerminalOutput((prev) => prev + '\nSystem: Server connection error. Make sure backend is running.\n')
      setIsRunning(false)
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [])

  // Auto scroll terminal to bottom on output changes or typing
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput, inputVal])

  // Keep input focused when running
  useEffect(() => {
    if (isRunning && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isRunning, terminalOutput])

  // Execution Start / Run
  const handleRunCode = () => {
    if (!socket || isRunning) return

    setTerminalOutput('--- Starting compilation and execution ---\n')
    setIsRunning(true)
    setInputVal('')

    socket.emit('run-code', {
      language,
      code
    })
  }

  // Execution Stop
  const handleStopCode = () => {
    if (!socket || !isRunning) return
    socket.emit('stop-code')
  }

  // Stdin Input Submitting
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (!socket || !isRunning) return

      const toSend = inputVal + '\n'
      
      // Echo the typed input into terminal
      setTerminalOutput((prev) => prev + inputVal + '\n')
      
      // Send input characters via socket
      socket.emit('terminal-input', toSend)
      setInputVal('')
    }
  }

  const handleClearTerminal = () => {
    setTerminalOutput('')
  }

  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleResetCode = () => {
    if (window.confirm(`Are you sure you want to reset the ${languageConfig.label} code to boilerplate template?`)) {
      setCode(languageConfig.starterCode)
      storeCode(storageKey, languageConfig.starterCode)
    }
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <Code2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">Code Playground</h2>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
              {languageConfig.label}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* IDE Settings Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              title="IDE Settings"
              className="h-10 w-10 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
            >
              <Settings className="w-4 h-4" />
            </button>
            {showSettings && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 p-4 shadow-xl z-20">
                  <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 select-none">
                    Editor Settings
                  </h3>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-350 select-none">Font Size</span>
                    <div className="flex items-center gap-1 border border-slate-250 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={handleDecreaseFont}
                        className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition select-none"
                      >
                        -
                      </button>
                      <span className="text-xs font-mono text-slate-750 dark:text-slate-250 font-semibold select-none w-8 text-center">
                        {fontSize}px
                      </span>
                      <button
                        type="button"
                        onClick={handleIncreaseFont}
                        className="w-5 h-5 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {isRunning ? (
            <button
              type="button"
              onClick={handleStopCode}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition hover:bg-rose-700 active:scale-95"
            >
              <Square className="h-4 w-4 fill-white" aria-hidden="true" />
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunCode}
              disabled={!socket}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-400 dark:disabled:bg-slate-700 active:scale-95 animate-none"
            >
              <Play className="h-4 w-4 fill-white" aria-hidden="true" />
              Run
            </button>
          )}
          <button
            type="button"
            onClick={handleResetCode}
            disabled={isRunning}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:text-blue-300"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_170px]">
        {/* Monaco Editor Container */}
        <div className="min-h-0 w-full relative">
          <Editor
            height="100%"
            language={languageConfig.monacoLang}
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || '')}
            options={{
              fontSize: fontSize,
              fontFamily: "'Fira Code', 'Courier New', Courier, monospace",
              minimap: { enabled: false },
              automaticLayout: true,
              padding: { top: 12, bottom: 12 },
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              smoothScrolling: true,
              scrollbar: {
                verticalScrollbarSize: 8,
                horizontalScrollbarSize: 8
              }
            }}
          />
        </div>

        {/* Interactive Terminal Container */}
        <div className="min-h-0 border-t border-slate-800 bg-slate-950 flex flex-col">
          <div className="flex h-10 items-center justify-between border-b border-slate-800 px-4 shrink-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Terminal className="h-4 w-4" aria-hidden="true" />
              <span>Interactive Terminal</span>
              {isRunning && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClearTerminal}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-850 hover:border-slate-700 bg-slate-950 font-semibold transition"
            >
              Clear Logs
            </button>
          </div>

          <div 
            ref={terminalRef}
            onClick={handleTerminalClick}
            className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre-wrap selection:bg-slate-800 cursor-text"
          >
            {terminalOutput ? (
              <span className="text-slate-100">{terminalOutput}</span>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 py-2">
                <span className="italic">Terminal logs are empty. Run your code to start.</span>
              </div>
            )}
            {isRunning && (
              <input
                ref={inputRef}
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="inline bg-transparent border-none outline-none font-mono text-xs text-slate-100 m-0 p-0 focus:ring-0 focus:border-none focus:outline-none caret-emerald-400 select-text"
                style={{
                  width: `${Math.max(1, inputVal.length)}ch`,
                  minWidth: '8px'
                }}
                autoFocus
              />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

const UserCodePlayground = ({
  courseId,
  selectedVideoKey,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [language, setLanguage] = useState('python')
  const storageKey = useMemo(
    () => getStorageKey(courseId, selectedVideoKey, language),
    [courseId, selectedVideoKey, language],
  )
  const handleCollapsedKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggleCollapse()
    }
  }

  if (isCollapsed) {
    return (
      <aside
        role="button"
        tabIndex={0}
        onClick={onToggleCollapse}
        onKeyDown={handleCollapsedKeyDown}
        aria-label="Expand code playground"
        title="Expand code playground"
        className="flex h-full min-h-0 cursor-pointer flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
      >
        <div className="flex shrink-0 flex-col items-center gap-2 border-b border-slate-200 p-2 dark:border-slate-800">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <Code2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200">
            <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-2">
          <span className="[writing-mode:vertical-rl] text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Code
          </span>
        </div>
      </aside>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex shrink-0 items-center gap-2">
        <label htmlFor="course-player-language" className="sr-only">Language</label>
        <select
          id="course-player-language"
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-blue-700 dark:focus:ring-blue-950/60"
        >
          {LANGUAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Collapse code playground"
          title="Collapse code playground"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:text-blue-300"
        >
          <PanelRightClose className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <CodePlaygroundEditor
        key={storageKey}
        storageKey={storageKey}
        language={language}
      />
    </div>
  )
}

export default UserCodePlayground
