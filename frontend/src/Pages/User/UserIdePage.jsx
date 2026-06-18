import axios from 'axios'
import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { io } from 'socket.io-client'
import { Play, Square, RotateCcw, AlertTriangle, Settings, Terminal as TerminalIcon } from 'lucide-react'
import FacultyNavbar from '../../Components/Faculty/FacultyNavbar'
import UserNavbar from '../../Components/User/UserNavbar'
import { useAuth } from '../../Context/AuthContext'
import { useTheme } from '../../Context/ThemeContext'

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:4000'

const IDE_ACCESS_CONFIG = {
  user: {
    role: 'user',
    profilePath: '/user/profile',
    profileKey: 'user',
    Navbar: UserNavbar,
  },
  faculty: {
    role: 'faculty',
    profilePath: '/faculty/profile',
    profileKey: 'faculty',
    Navbar: FacultyNavbar,
  },
}

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
  { value: 'c', label: 'C', monacoLang: 'c' },
  { value: 'cpp', label: 'C++', monacoLang: 'cpp' },
  { value: 'java', label: 'Java', monacoLang: 'java' },
  { value: 'python', label: 'Python', monacoLang: 'python' },
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' }
]

const UserIdePage = ({ accessRole = 'user' }) => {
  const accessConfig = IDE_ACCESS_CONFIG[accessRole] || IDE_ACCESS_CONFIG.user
  const { clearAuth, setAuth } = useAuth()
  const { isDark } = useTheme()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState(() => localStorage.getItem('jack_ide_code_python') || BOILERPLATES.python)
  const [terminalOutput, setTerminalOutput] = useState('')
  const [inputVal, setInputVal] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [socket, setSocket] = useState(null)
  
  const terminalRef = useRef(null)
  const inputRef = useRef(null)

  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('jack_ide_font_size')
    return saved ? parseInt(saved, 10) : 18
  })

  const [showSettings, setShowSettings] = useState(false)

  const [terminalHeight, setTerminalHeight] = useState(240)
  const [isDraggingHeight, setIsDraggingHeight] = useState(false)

  const handleHeightMouseDown = (e) => {
    e.preventDefault()
    setIsDraggingHeight(true)
  }

  useEffect(() => {
    if (!isDraggingHeight) return

    const handleMouseMove = (e) => {
      const containerElement = document.getElementById('ide-workspace-container')
      if (containerElement) {
        const rect = containerElement.getBoundingClientRect()
        const newHeight = rect.bottom - e.clientY
        if (newHeight > 120 && newHeight < rect.height - 180) {
          setTerminalHeight(newHeight)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDraggingHeight(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingHeight])

  useEffect(() => {
    if (isDraggingHeight) {
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    } else {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    return () => {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDraggingHeight])

  const handleIncreaseFont = () => {
    setFontSize((prev) => {
      const next = Math.min(24, prev + 1)
      localStorage.setItem('jack_ide_font_size', next)
      return next
    })
  }

  const handleDecreaseFont = () => {
    setFontSize((prev) => {
      const next = Math.max(10, prev - 1)
      localStorage.setItem('jack_ide_font_size', next)
      return next
    })
  }

  // Auth Verification
  useEffect(() => {
    let isActive = true

    const verifyAccess = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}${accessConfig.profilePath}`, {
          withCredentials: true,
        })

        const profile = response.data?.data?.[accessConfig.profileKey]

        if (!response.data?.success || profile?.role !== accessConfig.role) {
          throw new Error(`Unauthorized ${accessConfig.role}`)
        }

        if (!isActive) {
          return
        }

        setAuth({
          role: accessConfig.role,
          phone: profile.phone,
          token: null,
        })
        setIsAuthorized(true)
      } catch {
        if (!isActive) {
          return
        }
        clearAuth()
        setIsAuthorized(false)
      } finally {
        if (isActive) {
          setCheckingAuth(false)
        }
      }
    }

    verifyAccess()

    return () => {
      isActive = false
    }
  }, [accessConfig.profileKey, accessConfig.profilePath, accessConfig.role, clearAuth, setAuth])

  // Socket Connection Setup
  useEffect(() => {
    const socketInstance = io(API_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    })

    socketInstance.on('connect', () => {
      console.log('Connected to run server')
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

  // Language Change Handling
  const handleLanguageChange = (newLang) => {
    // Save current code to localStorage before switching
    localStorage.setItem(`jack_ide_code_${language}`, code)
    
    setLanguage(newLang)
    const savedCode = localStorage.getItem(`jack_ide_code_${newLang}`)
    setCode(savedCode || BOILERPLATES[newLang])
  }

  // Code Reset
  const handleResetCode = () => {
    const resetVal = BOILERPLATES[language]
    setCode(resetVal)
    localStorage.setItem(`jack_ide_code_${language}`, resetVal)
  }

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

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 font-sans">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Checking authentication...</p>
      </div>
    )
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />
  }

  const selectedLanguage = LANGUAGES.find(l => l.value === language)
  const Navbar = accessConfig.Navbar

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 font-sans overflow-hidden">
      <Navbar />

      {/* Main Workspace Layout */}
      <div 
        id="ide-workspace-container"
        className="flex-1 flex flex-col min-h-0 overflow-hidden relative"
      >
        
        {/* Code Editor Panel */}
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* Controls Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
            <div className="flex items-center gap-3">
              <label htmlFor="lang-select" className="text-xs font-semibold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
                Language:
              </label>
              <select
                id="lang-select"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                disabled={isRunning}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 transition"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* IDE Settings Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  title="IDE Settings"
                  className="h-9 w-9 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center"
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

              <button
                type="button"
                onClick={handleResetCode}
                disabled={isRunning}
                title="Reset code to default boilerplate"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 text-sm font-semibold transition"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>

              {isRunning ? (
                <button
                  type="button"
                  onClick={handleStopCode}
                  className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm shadow-rose-900/10 hover:shadow-rose-950/20 active:scale-95 transition"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Stop Execution
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRunCode}
                  disabled={!socket}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 dark:disabled:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold shadow-sm shadow-emerald-900/10 hover:shadow-emerald-950/20 active:scale-95 transition"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Run Code
                </button>
              )}
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-0 w-full relative">
            <Editor
              height="100%"
              language={selectedLanguage.monacoLang}
              theme={isDark ? 'vs-dark' : 'light'}
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
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10
                }
              }}
            />
          </div>
        </div>

        {/* Draggable Divider (Horizontal) */}
        <div
          onMouseDown={handleHeightMouseDown}
          className={`h-1.5 hover:h-2 hover:bg-blue-500 cursor-row-resize select-none transition-all duration-150 rounded shrink-0 ${
            isDraggingHeight ? 'bg-blue-600 h-2' : 'bg-slate-200 dark:bg-slate-800'
          }`}
        />

        {/* Interactive Terminal Panel */}
        <div 
          style={{ height: `${terminalHeight}px` }}
          className="flex flex-col min-h-0 bg-slate-950 text-slate-100 overflow-hidden shadow-2xl relative shrink-0 border-t border-slate-900"
        >
          
          {/* Terminal Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-950">
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Interactive Terminal</span>
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
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded border border-slate-800 hover:border-slate-700 bg-slate-950 font-semibold transition"
            >
              Clear Logs
            </button>
          </div>

          {/* Terminal Console Output */}
          <div 
            ref={terminalRef}
            onClick={handleTerminalClick}
            className="flex-1 overflow-y-auto px-4 py-3 font-mono text-sm leading-relaxed whitespace-pre-wrap selection:bg-slate-800 cursor-text"
          >
            {terminalOutput ? (
              <span className="text-slate-100">{terminalOutput}</span>
            ) : (
              <div className="flex items-center gap-2 text-slate-500 py-2">
                <AlertTriangle className="w-4 h-4 text-amber-500/80" />
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
                className="inline bg-transparent border-none outline-none font-mono text-sm text-slate-100 m-0 p-0 focus:ring-0 focus:border-none focus:outline-none caret-emerald-400 select-text"
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
    </div>
  )
}

export default UserIdePage
