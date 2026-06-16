import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { Code2, PanelRightClose, PanelRightOpen, Play, RotateCcw, Terminal } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_BASE_URL

const LANGUAGES = [
  {
    value: 'c',
    label: 'C',
    starterCode: `#include <stdio.h>

int main(void) {
    printf("hello world\\n");
    return 0;
}`,
  },
  {
    value: 'cpp',
    label: 'C++',
    starterCode: `#include <iostream>
using namespace std;

int main() {
    cout << "hello world" << endl;
    return 0;
}`,
  },
  {
    value: 'java',
    label: 'Java',
    starterCode: `public class Main {
    public static void main(String[] args) {
        System.out.println("hello world");
    }
}`,
  },
  {
    value: 'python',
    label: 'Python',
    starterCode: `print("hello world")`,
  },
  {
    value: 'javascript',
    label: 'JavaScript',
    starterCode: `console.log("hello world")`,
  },
]

const DEFAULT_LANGUAGE = 'python'

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
    // Local draft persistence is optional; the editor still works without it.
  }
}

const CodePlaygroundEditor = ({ storageKey, language }) => {
  const [code, setCode] = useState(() => getStoredCode(storageKey, language))
  const [output, setOutput] = useState('')
  const [runError, setRunError] = useState('')
  const [running, setRunning] = useState(false)
  const languageConfig = getLanguageConfig(language)

  useEffect(() => {
    storeCode(storageKey, code)
  }, [code, storageKey])

  const handleRunCode = async () => {
    setRunning(true)
    setRunError('')
    setOutput('Running...')

    try {
      const response = await axios.post(
        `${API_BASE_URL}/user/code/run`,
        { language, code },
        { withCredentials: true },
      )
      const responseData = response.data?.data || {}

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to run code')
      }

      setOutput(responseData.output || 'Finished with no output.')
      setRunError(responseData.error || '')
    } catch (error) {
      const responseData = error?.response?.data?.data || {}
      const message = error?.response?.data?.message || error?.message || 'Unable to run code'

      setOutput(responseData.output || '')
      setRunError(responseData.error || message)
    } finally {
      setRunning(false)
    }
  }

  const handleResetCode = () => {
    setRunError('')
    setOutput('')
    setCode(languageConfig.starterCode)
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
          <button
            type="button"
            onClick={handleRunCode}
            disabled={running}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:disabled:bg-blue-900"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {running ? 'Running' : 'Run'}
          </button>
          <button
            type="button"
            onClick={handleResetCode}
            disabled={running}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:text-blue-300"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_170px]">
        <label className="min-h-0">
          <span className="sr-only">Code editor</span>
          <textarea
            value={code}
            onChange={(event) => setCode(event.target.value)}
            spellCheck="false"
            className="h-full w-full resize-none border-0 bg-slate-950 p-4 font-mono text-sm leading-6 text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:ring-0"
          />
        </label>

        <div className="min-h-0 border-t border-slate-800 bg-slate-950">
          <div className="flex h-10 items-center justify-between border-b border-slate-800 px-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Terminal className="h-4 w-4" aria-hidden="true" />
              <span>Output</span>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              runError
                ? 'bg-red-500/15 text-red-300'
                : 'bg-emerald-500/15 text-emerald-300'
            }`}
            >
              {runError ? 'Error' : 'Ready'}
            </span>
          </div>

          <pre className={`h-[calc(100%-40px)] overflow-auto whitespace-pre-wrap p-4 font-mono text-sm leading-6 ${
            runError ? 'text-red-200' : 'text-slate-100'
          }`}
          >
            {runError || output || 'No output yet.'}
          </pre>
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
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE)
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
